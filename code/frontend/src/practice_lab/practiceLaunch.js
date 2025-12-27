import sdk from "https://esm.sh/@farcaster/miniapp-sdk"

const BASE_SEPOLIA_CHAIN_ID = 84532
const FACTORY_ADDRESS = "0x0ea04CA4244f91b4e09b4D3E5922dBba48226F57"
const FACTORY_ABI = [
  "event TokenCreated(address indexed token, string name, string symbol, uint256 initialSupply, address indexed owner)",
  "function createToken(string name_, string symbol_, uint256 initialSupply_) external returns (address)"
]

let ethProvider = null
let currentWallet = null
const API_BASE = "https://learn-base-backend.vercel.app"

document.addEventListener('DOMContentLoaded', async () => {
  try {
    ethProvider = await sdk.wallet.ethProvider
    await sdk.actions.ready()
    const contractEl = document.getElementById("tokenContract")
    if (contractEl) contractEl.textContent = "Not deployed yet"
  } catch (error) { console.error("Init error:", error) }
});

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
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('launch', true);
  }
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        table_name: "USER_PROGRESS",
        field_name: "launch",
        value: true,
      }),
  })
  return res.ok;
}

window.launchToken = async function (tokenName) {
  const statusDiv = document.getElementById("launchStatus")
  const launchBtn = document.getElementById("launchTokenBtn")
  if (!statusDiv) return

  if (!tokenName || tokenName.trim().length < 3) {
    statusDiv.style.display = "block"
    statusDiv.className = "error-box"
    statusDiv.innerHTML = "<p>Name too short (min 3 chars).</p>"
    return
  }

  const cleanName = tokenName.trim()
  const symbol = cleanName.substring(0, 3).toUpperCase()

  try {
    if (launchBtn) { launchBtn.disabled = true; launchBtn.textContent = "Launching..."; }
    statusDiv.style.display = "block"
    statusDiv.className = "info-box"
    statusDiv.innerHTML = `Launching ${tokenName}...`

    const { BrowserProvider, Contract } = await import("https://esm.sh/ethers@6.9.0")
    const provider = new BrowserProvider(ethProvider)

    // Switch chain logic here if needed...

    const signer = await provider.getSigner()
    const wallet = await signer.getAddress()

    statusDiv.innerHTML += "<p>Confirm in wallet...</p>"
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)
    const tx = await factory.createToken(cleanName, symbol, 1000000)

    statusDiv.innerHTML = "Transaction submitted. Waiting..."
    const receipt = await tx.wait(1)

    // ✅ ZDE BYLA CHYBĚJÍCÍ LOGIKA PRO PARSOVÁNÍ LOGŮ
    let tokenAddress = null

    // 1. Zkusíme automatický parsing
    if (receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log)
          if (parsed && parsed.name === "TokenCreated") {
            tokenAddress = parsed.args.token
            break
          }
        } catch {}
      }
    }

    // 2. Fallback manuální dekódování (někdy parseLog selže u proxy)
    if (!tokenAddress && receipt.logs?.length > 0) {
      try {
        const lastLog = receipt.logs[receipt.logs.length - 1]
        const decoded = factory.interface.decodeEventLog("TokenCreated", lastLog.data, lastLog.topics)
        if (decoded?.token) {
          tokenAddress = decoded.token
        }
      } catch {}
    }

    if (!tokenAddress) {
      throw new Error("Token deployed, but address not found in logs.");
    }

    const contractEl = document.getElementById("tokenContract")
    if (contractEl) contractEl.textContent = tokenAddress

    await updatePracticeLaunchProgress(wallet)

    statusDiv.className = "success-box"
    statusDiv.innerHTML = `
      <p><strong>Token Launched!</strong></p>
      <p><strong>${cleanName}</strong> (${symbol})</p>
      <p>Supply: 1,000,000</p>
      <p>Contract: <code>${tokenAddress.slice(0,6)}...${tokenAddress.slice(-4)}</code></p>
      <button onclick="openSepoliaScanAddress('https://sepolia.basescan.org/address/${tokenAddress}')" style="margin-top:10px;">View on BaseScan</button>
    `;

  } catch (error) {
    statusDiv.className = "error-box"
    statusDiv.innerHTML = `Launch failed: ${error.message}`
  } finally {
    if (launchBtn) { launchBtn.disabled = false; launchBtn.textContent = "🚀 Launch Token"; }
  }
}

window.openSepoliaScanAddress = (addr) => sdk.actions.openUrl(addr);