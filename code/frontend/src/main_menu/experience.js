// experience.js - Experience + FREE NFT mint + Debug Console
import sdk from "https://esm.sh/@farcaster/miniapp-sdk"

// ========== DEBUG CONSOLE ==========
let debugLogs = []
let debugInitialized = false

function createDebugConsole() {
  if (debugInitialized) return
  debugInitialized = true

  const debugHTML = `
    <div id="debug-console" style="display: none; flex-direction: column;
      position: fixed; bottom: 20px; right: 20px; width: 450px; max-height: 600px;
      background: #1e293b; border: 2px solid #0052FF; border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,82,255,0.3); z-index: 999999;
      font-family: 'Courier New', monospace; font-size: 11px;">

      <div id="debug-header" style="background: linear-gradient(135deg, #0052FF 0%, #0041CC 100%);
        color: white; padding: 12px 16px; cursor: move; user-select: none; display: flex;
        justify-content: space-between; align-items: center; border-radius: 10px 10px 0 0;">
        <strong style="font-size: 13px;">BaseCamp Debug Console</strong>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.exportDebugLogs()" style="background: #10b981; border: none;
            color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;
            font-size: 10px; font-weight: bold;">Export</button>
          <button onclick="window.clearDebugConsole()" style="background: #ef4444; border: none;
            color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;
            font-size: 10px; font-weight: bold;">Clear</button>
          <button onclick="window.hideDebugConsole()" style="background: #64748b; border: none;
            color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;
            font-size: 10px; font-weight: bold;">Hide</button>
        </div>
      </div>

      <div id="debug-tabs" style="display: flex; background: #334155; border-bottom: 1px solid #475569;">
        <button class="debug-tab active" data-tab="all" style="flex: 1; padding: 10px; background: none;
          border: none; color: white; cursor: pointer; font-weight: 600; border-bottom: 2px solid #0052FF;">All</button>
        <button class="debug-tab" data-tab="info" style="flex: 1; padding: 10px; background: none;
          border: none; color: #94a3b8; cursor: pointer;">Info</button>
        <button class="debug-tab" data-tab="success" style="flex: 1; padding: 10px; background: none;
          border: none; color: #94a3b8; cursor: pointer;">Success</button>
        <button class="debug-tab" data-tab="warn" style="flex: 1; padding: 10px; background: none;
          border: none; color: #94a3b8; cursor: pointer;">Warn</button>
        <button class="debug-tab" data-tab="error" style="flex: 1; padding: 10px; background: none;
          border: none; color: #94a3b8; cursor: pointer;">Error</button>
      </div>

      <div id="debug-logs" style="padding: 12px; max-height: 450px; overflow-y: auto;
        background: #0f172a; color: #e2e8f0; border-radius: 0 0 10px 10px;"></div>
    </div>
    <button id="debug-toggle" style="position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
      background: linear-gradient(135deg, #0052FF 0%, #0041CC 100%); border: none; border-radius: 50%;
      color: white; font-size: 24px; cursor: pointer; z-index: 1000000;
      box-shadow: 0 8px 20px rgba(0,82,255,0.4); transition: transform 0.2s ease;">⟐</button>
  `

  document.body.insertAdjacentHTML("beforeend", debugHTML)
  initDebugListeners()
  makeDraggable()
}

function initDebugListeners() {
  const toggleBtn = document.getElementById("debug-toggle")
  const consoleEl = document.getElementById("debug-console")

  toggleBtn.onclick = () => {
    const isVisible = consoleEl.style.display === "flex"
    consoleEl.style.display = isVisible ? "none" : "flex"
    toggleBtn.style.display = isVisible ? "block" : "none"
  }

  window.hideDebugConsole = () => {
    consoleEl.style.display = "none"
    toggleBtn.style.display = "block"
  }

  toggleBtn.onmouseenter = () => (toggleBtn.style.transform = "scale(1.1)")
  toggleBtn.onmouseleave = () => (toggleBtn.style.transform = "scale(1)")

  document.querySelectorAll(".debug-tab").forEach((tab) => {
    tab.onclick = (e) => {
      document.querySelectorAll(".debug-tab").forEach((t) => {
        t.classList.remove("active")
        t.style.color = "#94a3b8"
        t.style.borderBottom = "none"
      })
      e.target.classList.add("active")
      e.target.style.color = "white"
      e.target.style.borderBottom = "2px solid #0052FF"
      filterLogs(e.target.dataset.tab)
    }
  })
}

function makeDraggable() {
  const consoleEl = document.getElementById("debug-console")
  const header = document.getElementById("debug-header")
  let isDragging = false,
    startX,
    startY,
    startRight,
    startBottom

  header.onmousedown = (e) => {
    if (e.target.tagName === "BUTTON") return
    isDragging = true
    startX = e.clientX
    startY = e.clientY
    const rect = consoleEl.getBoundingClientRect()
    startRight = window.innerWidth - rect.right
    startBottom = window.innerHeight - rect.bottom
  }

  document.onmousemove = (e) => {
    if (!isDragging) return
    const dx = startX - e.clientX
    const dy = startY - e.clientY
    consoleEl.style.right = startRight + dx + "px"
    consoleEl.style.bottom = startBottom + dy + "px"
  }

  document.onmouseup = () => {
    isDragging = false
    document.onmousemove = null
    document.onmouseup = null
  }
}

function debugLog(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  })
  const colors = {
    info: "#3b82f6",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  }

  const logEntry = { time: timestamp, message, type, page: window.location.pathname }
  debugLogs.push(logEntry)
  console.log(`${timestamp} [${type.toUpperCase()}] ${message}`)

  const logsContainer = document.getElementById("debug-logs")
  if (logsContainer) {
    const logEl = document.createElement("div")
    logEl.className = `debug-log-item debug-type-${type}`
    logEl.dataset.type = type
    logEl.style.cssText = `margin-bottom: 10px; padding: 10px; border-left: 4px solid ${colors[type]};
      background: rgba(255,255,255,0.05); border-radius: 6px; word-wrap: break-word; line-height: 1.5;`

    logEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <strong style="color: #94a3b8; font-size: 10px;">${timestamp}</strong>
        <span style="color: ${colors[type]}; font-weight: bold; font-size: 10px;">${type.toUpperCase()}</span>
      </div>
      <div style="color: #e2e8f0; font-size: 12px;">${escapeHtml(message)}</div>
    `
    logsContainer.insertBefore(logEl, logsContainer.firstChild)
    logsContainer.scrollTop = 0
  }
}

function filterLogs(type) {
  document.querySelectorAll(".debug-log-item").forEach((log) => {
    log.style.display = type === "all" ? "block" : log.dataset.type === type ? "block" : "none"
  })
}

window.clearDebugConsole = () => {
  const logsContainer = document.getElementById("debug-logs")
  if (logsContainer) logsContainer.innerHTML = ""
  debugLogs = []
  debugLog("Console cleared", "info")
}

window.exportDebugLogs = () => {
  const logText = debugLogs
    .map((log) => `${log.time} [${log.type.toUpperCase()}] ${log.message}`)
    .join("\n")
  const blob = new Blob([logText], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `basecamp-debug-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  debugLog("Logs exported successfully", "success")
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// ========== APP KONSTANTY ==========
const API_BASE = "https://learn-base-backend.vercel.app"
const BASE_CHAIN_ID_HEX = "0x2105" // Base mainnet
const NFT_CONTRACT = "0xA76F456f6FbaB161069fc891c528Eb56672D3e69"

let currentWallet = null

// ========== INIT ==========
window.addEventListener("load", async () => {
  createDebugConsole()
  debugLog("Experience page loaded", "info")

  try {
    await sdk.actions.ready()
    debugLog("MiniApp SDK ready", "success")

    const ethProvider = sdk.wallet.ethProvider
    const accounts = await ethProvider.request({ method: "eth_requestAccounts" })
    const wallet = accounts && accounts.length > 0 ? accounts[0] : null

    if (!wallet) {
      debugLog("Wallet address not found", "error")
      return
    }

    currentWallet = wallet.toLowerCase()
    debugLog(`Connected wallet: ${currentWallet}`, "success")

    const span = document.getElementById("wallet-address")
    if (span) span.textContent = currentWallet

    await getProgressAndSetupMint(currentWallet, ethProvider)
  } catch (error) {
    debugLog(`Init error: ${error.message}`, "error")
  }
})

// ========== BACKEND + PROGRESS ==========
async function getProgressAndSetupMint(wallet, ethProvider) {
  try {
    debugLog("Loading user progress from backend...", "info")

    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    })

    if (!res.ok) {
      debugLog(`get-user failed: status ${res.status}`, "error")
      return
    }

    const data = await res.json()
    const info = data.info
    const progress = data.progress

    if (!info || !progress) {
      debugLog("No progress/info object in response", "warn")
      return
    }

    // theory progress
    const theoryBar = document.getElementById("theoryProgressBar")
    const theoryText = document.getElementById("theoryProgressText")
    const theoryPercent = info.completed_theory ? 100 : 0
    if (theoryBar) theoryBar.style.width = `${theoryPercent}%`
    if (theoryText) theoryText.textContent = `${theoryPercent}%`

    // base labs progress
    const baseParts = [progress.faucet, progress.send, progress.receive, progress.mint, progress.launch]
    let baseCompleted = 0
    for (const part of baseParts) if (part === true) baseCompleted++
    const basePercent = Math.round((baseCompleted / baseParts.length) * 100)
    const baseBar = document.getElementById("baseLabProgressBar")
    const baseText = document.getElementById("baseLabProgressText")
    if (baseBar) baseBar.style.width = `${basePercent}%`
    if (baseText) baseText.textContent = `${basePercent}%`

    // security labs progress
    const securityParts = [progress.lab1, progress.lab2, progress.lab3, progress.lab4, progress.lab5]
    let securityCompleted = 0
    for (const part of securityParts) if (part === true) securityCompleted++
    const securityPercent = Math.round((securityCompleted / securityParts.length) * 100)
    const secBar = document.getElementById("securityProgressBar")
    const secText = document.getElementById("securityProgressText")
    if (secBar) secBar.style.width = `${securityPercent}%`
    if (secText) secText.textContent = `${securityPercent}%`

    const completedAll = info.completed_all === true
    const nftSection = document.getElementById("nftSection")
    const mintBtn = document.getElementById("mintNftBtn")

    if (completedAll) {
      debugLog("All sections completed – enabling NFT mint", "success")
      if (nftSection) nftSection.classList.remove("locked")
      if (mintBtn) mintBtn.disabled = false
    } else {
      debugLog("Not completed_all, mint remains locked", "warn")
    }

    if (mintBtn) {
      mintBtn.onclick = async () => {
        await handleFreeMint(ethProvider)
      }
    }
  } catch (err) {
    debugLog(`getProgressAndSetupMint error: ${err.message}`, "error")
  }
}

// ========== FREE NFT MINT (claim) ==========
async function handleFreeMint(ethProvider) {
  const mintBtn = document.getElementById("mintNftBtn")
  try {
    debugLog("Mint button clicked", "info")

    const { ethers } = await import("https://esm.sh/ethers@6.9.0")

    const accounts2 = await ethProvider.request({ method: "eth_requestAccounts" })
    const userWallet = accounts2 && accounts2[0] ? accounts2[0].toLowerCase() : null
    if (!userWallet) {
      debugLog("Wallet not found in mint handler", "error")
      alert("Wallet address not found")
      return
    }

    debugLog(`Minting for wallet: ${userWallet}`, "info")

    let chainId = await ethProvider.request({ method: "eth_chainId" })
    debugLog(`Current chainId: ${chainId}`, "info")
    if (chainId !== BASE_CHAIN_ID_HEX) {
      debugLog("Switching to Base mainnet...", "warn")
      await ethProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      })
      chainId = await ethProvider.request({ method: "eth_chainId" })
      debugLog(`New chainId: ${chainId}`, "success")
    }

    const iface = new ethers.Interface([
      "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, (bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) payable",
    ])

    const receiver = userWallet
    const tokenId = 0n
    const quantity = 1n
    const currency = "0x0000000000000000000000000000000000000000"
    const pricePerToken = 0n

    const allowlistProof = {
      proof: [],
      quantityLimitPerWallet: 0n,
      pricePerToken: 0n,
      currency: "0x0000000000000000000000000000000000000000",
    }

    const dataBytes = "0x"

    const claimData = iface.encodeFunctionData("claim", [
      receiver,
      tokenId,
      quantity,
      currency,
      pricePerToken,
      allowlistProof,
      dataBytes,
    ])

    debugLog("Sending claim transaction to NFT contract...", "info")

    const claimTx = await ethProvider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: userWallet,
          to: NFT_CONTRACT,
          data: claimData,
        },
      ],
    })

    debugLog(`Claim tx hash: ${claimTx}`, "success")

    const ownedSection = document.getElementById("ownedNftSection")
    if (ownedSection) ownedSection.style.display = "block"
    if (mintBtn) {
      mintBtn.disabled = true
      mintBtn.textContent = "NFT Minted!"
    }

    alert(`NFT minted!\nTx hash: ${claimTx}`)
  } catch (e) {
    debugLog(`Mint error: ${e.message}`, "error")
    alert("Error: " + (e.message || e))
  }
}
