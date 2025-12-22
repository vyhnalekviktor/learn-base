import sdk from "https://esm.sh/@farcaster/miniapp-sdk"

let isInitialized = false
const BASE_SEPOLIA_CHAIN_ID = 84532
const FACTORY_ADDRESS = "0x0ea04CA4244f91b4e09b4D3E5922dBba48226F57"

const FACTORY_ABI = [
  "event TokenCreated(address indexed token, string name, string symbol, uint256 initialSupply, address indexed owner)",
  "function createToken(string name_, string symbol_, uint256 initialSupply_) external returns (address)"
]

let ethProvider = null
let originalChainId = null
let originalChainId = null
let currentWallet = null
const API_BASE = "https://learn-base-backend.vercel.app"

async function initApp() {
  try {
    ethProvider = await sdk.wallet.ethProvider
    await sdk.actions.ready

    const contractEl = document.getElementById("tokenContract")
    if (contractEl) contractEl.textContent = "Not deployed yet"

  } catch (error) {
    console.error("Init error:", error)
  }
}

window.toggleAccordion = function (id) {
  const content = document.getElementById("content-" + id)
  const icon = document.getElementById("icon-" + id)
  if (!content) return

  if (content.style.maxHeight) {
    content.style.maxHeight = null
    if (icon) icon.textContent = "▼"
  } else {
    content.style.maxHeight = content.scrollHeight + "px"
    if (icon) icon.textContent = "▲"
  }
}

async function updatePracticeLaunchProgress(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        table_name: "USER_PROGRESS",
        field_name: "launch",
        value: true,
      }),
    });

    if (!res.ok) {
      let msg = "Unknown backend error"
      try {
        const err = await res.json()
        msg = err.detail || JSON.stringify(err)
      } catch (_) {}
      return false
    }
    return true
  } catch (error) {
    return false
  }
}

window.launchToken = async function (tokenName) {
  const statusDiv = document.getElementById("launchStatus")
  const launchBtn = document.getElementById("launchTokenBtn")

  if (!statusDiv) {
    return
  }

  if (!tokenName || tokenName.trim().length < 3) {
    statusDiv.style.display = "block"
    statusDiv.className = "error-box"
    statusDiv.innerHTML = "<p>Token name must be at least 3 characters long.</p>"
    return
  }

  const cleanName = tokenName.trim()
  const symbol = cleanName.substring(0, 3).toUpperCase()

  try {
    if (!ethProvider) throw new Error("Base App not initialized")

    if (launchBtn) {
      launchBtn.disabled = true
      launchBtn.textContent = "Launching..."
    }

    statusDiv.style.display = "block"
    statusDiv.className = "info-box"
    statusDiv.innerHTML = `
      <p>Launching token:</p>
      <p><strong>${cleanName}</strong> (${symbol})</p>
      <p>Supply: 1,000,000 tokens</p>
    `

    const { BrowserProvider, Contract } = await import("https://esm.sh/ethers@6.9.0")
    const provider = new BrowserProvider(ethProvider)
    const network = await provider.getNetwork()
    originalChainId = Number(network.chainId)

    // Ensure Base Sepolia
    if (originalChainId !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML += "<p>Switching to Base Sepolia testnet...</p>"
      try {
        await ethProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x14a34" }]
        })
      } catch (switchError) {
        if (switchError.code === 4902) {
          await ethProvider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x14a34",
              chainName: "Base Sepolia",
              nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"]
            }]
          })
        } else {
          throw switchError
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    const signer = await provider.getSigner()
    const wallet = await signer.getAddress()
    currentWallet = wallet

    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)
    const supply = 1_000_000

    statusDiv.innerHTML += "<p>Please confirm the deployment in your wallet...</p>"

    const tx = await factory.createToken(cleanName, symbol, supply)
    const txHash = tx.hash
    const shortHash = `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`

    statusDiv.innerHTML = `
      <p><strong>Transaction submitted!</strong></p>
      <p>Hash: <code>${shortHash}</code></p>
      <p>Waiting for confirmation...</p>
    `

    const receipt = await tx.wait(1)

    let tokenAddress = null

    // Fallback: Transaction return value
    if (!tokenAddress && receipt.logs?.length > 0) {
      try {
        const lastLog = receipt.logs[receipt.logs.length - 1]
        const decoded = factory.interface.decodeEventLog("TokenCreated", lastLog.data, lastLog.topics)
        if (decoded?.token) {
          tokenAddress = decoded.token
        }
      } catch (e) {
      }
    }

    if (!tokenAddress) {
      statusDiv.className = "warn-box"
      statusDiv.innerHTML = `
        <p>⚠️ Transaction successful but token detection failed</p>
        <p>Check your token: <a href="https://sepolia.basescan.org/tx/${txHash}" target="_blank" class="learn-more">View TX</a></p>
        <p>Factory deployed it successfully!</p>
      `
      if (launchBtn) {
        launchBtn.disabled = false
        launchBtn.textContent = "🚀 Launch Another"
      }
      return
    }

    const contractEl = document.getElementById("tokenContract")
    if (contractEl) contractEl.textContent = tokenAddress

    const scannerUrl = `https://sepolia.basescan.org/address/${tokenAddress}`

    // Update progress
    const progressUpdated = await updatePracticeLaunchProgress(wallet)

    statusDiv.className = "success-box"
    statusDiv.innerHTML = `
      <p><strong>Token launched successfully!</strong></p>
      <p><strong>${cleanName}</strong> (${symbol})</p>
      <p>Supply: 1,000,000 tokens</p>
      <p>Contract: <code>${tokenAddress.slice(0,4)}...${tokenAddress.slice(-4)}</code></p>
      <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="window.open('${scannerUrl}', '_blank')" style="padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
          View on BaseScan
        </button>
        <button onclick="window.open('https://account.base.app/activity', '_blank')" style="padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
          View in Wallet
        </button>
      </div>
    `


  } catch (error) {
    statusDiv.className = "error-box"

    if (error.code === 4001) {
      statusDiv.innerHTML = "<p>Transaction rejected by user.</p>"
    } else if (typeof error.message === "string" && error.message.toLowerCase().includes("insufficient")) {
      statusDiv.innerHTML = "<p>Insufficient ETH for gas. Get testnet ETH from faucet.</p>"
    } else {
      statusDiv.innerHTML = `<p>Launch failed: ${error.message || error}</p>`
    }
  } finally {
    if (launchBtn) {
      launchBtn.disabled = false
      launchBtn.textContent = "🚀 Launch Token"
    }
  }
}

initApp()
