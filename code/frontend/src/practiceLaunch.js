// practiceLaunch.js
import sdk from "https://esm.sh/@farcaster/miniapp-sdk"

const BASE_SEPOLIA_CHAIN_ID = 84532
const BASE_MAINNET_CHAIN_ID = 8453

// TokenFactory deployed via Remix on Base Sepolia
const FACTORY_ADDRESS = "0x0ea04CA4244f91b4e09b4D3E5922dBba48226F57"

const FACTORY_ABI = [
  "event TokenCreated(address indexed token, string name, string symbol, uint256 initialSupply, address indexed owner)",
  "function createToken(string name_, string symbol_, uint256 initialSupply_) external returns (address)"
]

let ethProvider = null
let originalChainId = null

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

window.launchToken = async function (tokenName) {
  const statusDiv = document.getElementById("launchStatus")
  const launchBtn = document.getElementById("launchTokenBtn")

  if (!statusDiv) return

  if (!tokenName || tokenName.trim().length < 3) {
    statusDiv.style.display = "block"
    statusDiv.className = "error-box"
    statusDiv.innerHTML = "<p>Token name must be at least 3 characters long.</p>"
    return
  }

  const cleanName = tokenName.trim()
  const symbol = cleanName.substring(0, 3).toUpperCase()

  try {
    if (!ethProvider) {
      throw new Error("Base App not initialized")
    }

    if (launchBtn) {
      launchBtn.disabled = true
      launchBtn.textContent = "Launching..."
    }

    statusDiv.style.display = "block"
    statusDiv.className = "info-box"
    statusDiv.style.background = ""
    statusDiv.style.borderLeftColor = ""
    statusDiv.style.textAlign = "left"
    statusDiv.innerHTML = `
      <p>Launching token:</p>
      <p><strong>${cleanName}</strong> (${symbol})</p>
      <p>Supply: 1,000,000 tokens</p>
    `

    const { BrowserProvider, Contract } = await import(
      "https://esm.sh/ethers@6.9.0"
    )

    const provider = new BrowserProvider(ethProvider)
    const network = await provider.getNetwork()
    originalChainId = Number(network.chainId)

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
            params: [
              {
                chainId: "0x14a34",
                chainName: "Base Sepolia",
                nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia.basescan.org"]
              }
            ]
          })
        } else {
          throw switchError
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    const signer = await provider.getSigner()
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)

    const supply = 1_000_000

    statusDiv.innerHTML += "<p>Please confirm the deployment in your wallet...</p>"

    const tx = await factory.createToken(cleanName, symbol, supply)
    const txHash = tx.hash
    const shortHash = `${txHash.substring(0, 10)}...${txHash.substring(
      txHash.length - 8
    )}`

    statusDiv.innerHTML = `
      <p><strong>Transaction submitted!</strong></p>
      <p>Hash: <code>${shortHash}</code></p>
      <p>Waiting for confirmation...</p>
    `

    const receipt = await tx.wait(1)

    let tokenAddress = null
    try {
      for (const log of receipt.logs || []) {
        try {
          const parsed = factory.interface.parseLog(log)
          if (parsed && parsed.name === "TokenCreated") {
            tokenAddress = parsed.args.token
            break
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.error("Failed to parse TokenCreated event:", e)
    }

    if (!tokenAddress) {
      statusDiv.className = "error-box"
      statusDiv.innerHTML = `
        <p>Transaction confirmed, but could not read TokenCreated event.</p>
        <p>Check the transaction on BaseScan:</p>
        <a href="https://sepolia.basescan.org/tx/${txHash}" target="_blank" class="learn-more">View transaction</a>
      `
      return
    }

    const contractEl = document.getElementById("tokenContract")
    if (contractEl) contractEl.textContent = tokenAddress

    const scannerUrl = `https://sepolia.basescan.org/address/${tokenAddress}`

    // Mint-like success card
    statusDiv.className = "info-box"
    statusDiv.style.background = "#dcf5f8"
    statusDiv.style.borderLeftColor = "transparent"
    statusDiv.style.textAlign = "center"
    statusDiv.innerHTML = `
      <p style="font-weight: 700; font-size: 18px; margin-bottom: 8px;">Token launched successfully!</p>
      <p style="font-weight: 700; margin: 4px 0;">${cleanName} (${symbol})</p>
      <p style="margin: 4px 0;">Supply: 1,000,000 tokens</p>
      <p style="margin: 12px 0 4px;">Contract:</p>
      <p style="margin: 0 0 16px;">
        <code style="font-size: 13px;">${tokenAddress}</code>
      </p>
      <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 10px;">
        <button
          onclick="window.open('${scannerUrl}', '_blank')"
          style="
            padding: 12px 16px;
            background: white;
            color: #0052FF;
            border-radius: 12px;
            border: 2px solid #0052FF;
            cursor: pointer;
            font-weight: 700;
            font-size: 15px;
          "
        >
          View on BaseScan
        </button>
        <button
          onclick="window.open('https://account.base.app/activity', '_blank')"
          style="
            padding: 12px 16px;
            background: white;
            color: #0052FF;
            border-radius: 12px;
            border: 2px solid #0052FF;
            cursor: pointer;
            font-weight: 700;
            font-size: 15px;
          "
        >
          View in wallet
        </button>
      </div>
      <p style="margin-top: 12px; font-size: 12px; color: #666;">
        Your token has been deployed on Base Sepolia testnet.
      </p>
    `
  } catch (error) {
    console.error("Launch error:", error)
    statusDiv.className = "error-box"

    if (error.code === 4001) {
      statusDiv.innerHTML = "<p>Transaction rejected by user.</p>"
    } else if (
      typeof error.message === "string" &&
      error.message.toLowerCase().includes("insufficient")
    ) {
      statusDiv.innerHTML =
        "<p>Insufficient ETH for gas fees. Get testnet ETH from a faucet.</p>"
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
