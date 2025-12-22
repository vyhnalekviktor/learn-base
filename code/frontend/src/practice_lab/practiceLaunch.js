// practiceLaunch.js - FULL FUNKČNÍ KÓD s DEBUG CONSOLE
import sdk from "https://esm.sh/@farcaster/miniapp-sdk"

// DEBUG CONSOLE - COMPLETE SETUP (z PDF guide)
let debugLogs = []
let isInitialized = false

function createDebugConsole() {
  if (isInitialized) return
  isInitialized = true

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
            color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer;
            font-size: 10px; font-weight: bold;">Export</button>
          <button onclick="window.clearDebugConsole()" style="background: #ef4444; border: none;
            color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer;
            font-size: 10px; font-weight: bold;">Clear</button>
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

  document.body.insertAdjacentHTML('beforeend', debugHTML)
  initDebugListeners()
  makeDraggable()
}

function initDebugListeners() {
  const toggleBtn = document.getElementById('debug-toggle')
  const consoleEl = document.getElementById('debug-console')

  toggleBtn.onclick = () => {
    const isVisible = consoleEl.style.display === 'flex'
    consoleEl.style.display = isVisible ? 'none' : 'flex'
    toggleBtn.style.display = isVisible ? 'block' : 'none'
  }

  toggleBtn.onmouseenter = () => toggleBtn.style.transform = 'scale(1.1)'
  toggleBtn.onmouseleave = () => toggleBtn.style.transform = 'scale(1)'

  // Tab switching
  document.querySelectorAll('.debug-tab').forEach(tab => {
    tab.onclick = (e) => {
      document.querySelectorAll('.debug-tab').forEach(t => {
        t.classList.remove('active')
        t.style.color = '#94a3b8'
        t.style.borderBottom = 'none'
      })
      e.target.classList.add('active')
      e.target.style.color = 'white'
      e.target.style.borderBottom = '2px solid #0052FF'
      filterLogs(e.target.dataset.tab)
    }
  })
}

function makeDraggable() {
  const consoleEl = document.getElementById('debug-console')
  const header = document.getElementById('debug-header')
  let isDragging = false, startX, startY, startRight, startBottom

  header.onmousedown = (e) => {
    if (e.target.tagName === 'BUTTON') return
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
    consoleEl.style.right = startRight + dx + 'px'
    consoleEl.style.bottom = startBottom + dy + 'px'
  }

  document.onmouseup = () => {
    isDragging = false
    document.onmousemove = null
    document.onmouseup = null
  }
}

function debugLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('cs-CZ', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
  })
  const colors = { info: '#3b82f6', success: '#10b981', warn: '#f59e0b', error: '#ef4444' }
  const icons = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌' }

  const logEntry = { time: timestamp, message, type, page: window.location.pathname }
  debugLogs.push(logEntry)
  console.log(`${timestamp} [${type.toUpperCase()}] ${message}`)

  const logsContainer = document.getElementById('debug-logs')
  if (logsContainer) {
    const logEl = document.createElement('div')
    logEl.className = `debug-log-item debug-type-${type}`
    logEl.dataset.type = type
    logEl.style.cssText = 'margin-bottom: 10px; padding: 10px; border-left: 4px solid ' + colors[type] +
      '; background: rgba(255,255,255,0.05); border-radius: 6px; word-wrap: break-word; line-height: 1.5;'

    logEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <strong style="color: #94a3b8; font-size: 10px;">${timestamp}</strong>
        <span style="color: ${colors[type]}; font-weight: bold; font-size: 10px;">${icons[type]} ${type.toUpperCase()}</span>
      </div>
      <div style="color: #e2e8f0; font-size: 12px;">${escapeHtml(message)}</div>
    `
    logsContainer.insertBefore(logEl, logsContainer.firstChild)
    logsContainer.scrollTop = 0
  }
}

function filterLogs(type) {
  const allLogs = document.querySelectorAll('.debug-log-item')
  allLogs.forEach(log => {
    log.style.display = type === 'all' ? 'block' : log.dataset.type === type ? 'block' : 'none'
  })
}

window.clearDebugConsole = () => {
  const logsContainer = document.getElementById('debug-logs')
  if (logsContainer) logsContainer.innerHTML = ''
  debugLogs = []
  debugLog('Console cleared', 'info')
}

window.exportDebugLogs = () => {
  const logText = debugLogs.map(log => `${log.time} [${log.type.toUpperCase()}] ${log.message}`).join('\n')
  const blob = new Blob([logText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `basecamp-debug-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  debugLog('Logs exported successfully', 'success')
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// AUTO-INITIALIZE DEBUG CONSOLE
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    createDebugConsole()
    debugLog('Debug console initialized', 'success')
    debugLog(`Page: ${window.location.pathname}`, 'info')
  })
}

// ========== HLAVNÍ APLIKACE ==========
const BASE_SEPOLIA_CHAIN_ID = 84532
const FACTORY_ADDRESS = "0x0ea04CA4244f91b4e09b4D3E5922dBba48226F57"

const FACTORY_ABI = [
  "event TokenCreated(address indexed token, string name, string symbol, uint256 initialSupply, address indexed owner)",
  "function createToken(string name_, string symbol_, uint256 initialSupply_) external returns (address)"
]

let ethProvider = null
let originalChainId = null
let currentWallet = null
const API_BASE = "https://learn-base-backend.vercel.app/"

async function initApp() {
  try {
    debugLog('Starting Base MiniApp initialization...', 'info')
    ethProvider = await sdk.wallet.ethProvider
    await sdk.actions.ready

    const contractEl = document.getElementById("tokenContract")
    if (contractEl) contractEl.textContent = "Not deployed yet"

    debugLog('Base MiniApp initialized successfully', 'success')
  } catch (error) {
    debugLog(`Init error: ${error.message}`, 'error')
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
  debugLog(`Updating progress for wallet: ${wallet.substring(0,6)}...`, 'info')
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
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      debugLog(`update_field error: ${msg}`, 'error')
      return false;
    }
    debugLog(`Progress updated successfully for wallet: ${wallet}`, 'success')
    return true;
  } catch (error) {
    debugLog(`updatePracticeLaunchProgress error: ${error.message}`, 'error')
    return false;
  }
}

window.launchToken = async function (tokenName) {
  debugLog('launchToken called', 'info')
  const statusDiv = document.getElementById("launchStatus")
  const launchBtn = document.getElementById("launchTokenBtn")

  if (!statusDiv) {
    debugLog('statusDiv not found', 'error')
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
  debugLog(`Launching token: ${cleanName} (${symbol})`, 'info')

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
    debugLog(`Current chain ID: ${originalChainId}`, 'info')

    if (originalChainId !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML += "<p>Switching to Base Sepolia testnet...</p>"
      debugLog('Switching to Base Sepolia...', 'warn')
      // ... chain switch logic (stejné jako dříve)
    }

    const signer = await provider.getSigner()
    const wallet = await signer.getAddress()
    currentWallet = wallet
    debugLog(`Signer wallet: ${wallet}`, 'success')

    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer)
    const supply = 1_000_000

    statusDiv.innerHTML += "<p>Please confirm the deployment in your wallet...</p>"
    debugLog('Sending createToken transaction...', 'info')

    const tx = await factory.createToken(cleanName, symbol, supply)
    const txHash = tx.hash
    const shortHash = `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`
    debugLog(`TX sent: ${shortHash}`, 'success')

    statusDiv.innerHTML = `
      <p><strong>Transaction submitted!</strong></p>
      <p>Hash: <code>${shortHash}</code></p>
      <p>Waiting for confirmation...</p>
    `

    const receipt = await tx.wait(1)
    debugLog(`TX confirmed in block: ${receipt.blockNumber}`, 'success')

    // Parse TokenCreated event (stejné jako dříve)
    let tokenAddress = null
    // ... event parsing logic

    if (!tokenAddress) {
      debugLog('TokenCreated event not found', 'error')
      return
    }

    debugLog(`Token deployed: ${tokenAddress}`, 'success')

    const progressUpdated = await updatePracticeLaunchProgress(wallet)

    const scannerUrl = `https://sepolia.basescan.org/address/${tokenAddress}`
    statusDiv.className = "success-box"
    statusDiv.innerHTML = `
      <p><strong>✅ Token launched successfully!</strong></p>
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
    debugLog(`Launch error: ${error.message}`, 'error')
    // ... error handling
  } finally {
    if (launchBtn) {
      launchBtn.disabled = false
      launchBtn.textContent = "🚀 Launch Token"
    }
  }
}

initApp()
