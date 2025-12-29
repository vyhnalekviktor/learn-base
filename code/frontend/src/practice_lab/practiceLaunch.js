import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
const { BrowserProvider, Contract, JsonRpcProvider } = await import('https://esm.sh/ethers@6.9.0');

const BASE_SEPOLIA_CHAIN_ID = 84532;
const FACTORY_ADDRESS = "0x0ea04CA4244f91b4e09b4D3E5922dBba48226F57";
const FACTORY_ABI = [
  "event TokenCreated(address indexed token, string name, string symbol, uint256 initialSupply, address indexed owner)",
  "function createToken(string name_, string symbol_, uint256 initialSupply_) external returns (address)"
];

const API_BASE = "https://learn-base-backend.vercel.app";
let ethProvider = null;

// === 1. INIT ===
document.addEventListener('DOMContentLoaded', async () => {
  injectStyles(); // Aktivujeme styly pro modaly
  try {
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();
    const contractEl = document.getElementById("tokenContract");
    if (contractEl) contractEl.textContent = "Not deployed yet";
  } catch (error) { console.error("Init error:", error); }
});

window.toggleAccordion = function (id) {
  const content = document.getElementById("content-" + id);
  const icon = document.getElementById("icon-" + id);
  if (!content) return;
  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    icon.textContent = "▼";
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    icon.textContent = "▲";
  }
}

async function updatePracticeLaunchProgress(wallet) {
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('launch', true);
  }
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, table_name: "USER_PROGRESS", field_name: "launch", value: true, }),
  });
  return res.ok;
}

// === 2. STYLY (Stejné jako v Lab 4/5) ===
function injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .custom-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.3s ease; }
        .custom-modal-content { background: #0f172a; border: 1px solid #334155; border-radius: 24px; width: 90%; max-width: 400px; padding: 0; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); text-align: center; font-family: -apple-system, sans-serif; }
        .modal-header { padding: 24px 24px 10px; }
        .modal-title { font-size: 20px; font-weight: 700; color: white; margin: 0; }
        .modal-body { padding: 10px 24px 24px; color: #cbd5e1; font-size: 15px; line-height: 1.5; }
        .modal-footer { padding: 16px; background: #1e293b; border-top: 1px solid #334155; }
        .modal-btn { background: #334155; color: white; border: none; padding: 12px 0; width: 100%; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 16px; }
        .modal-success .modal-btn { background: #22c55e; color: #022c22; }
        .modal-success .modal-title { color: #22c55e; }
        .modal-danger .modal-btn { background: #ef4444; color: white; }
        .modal-danger .modal-title { color: #ef4444; }
        .modal-warning .modal-btn { background: #eab308; color: black; }
        .modal-warning .modal-title { color: #eab308; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
}

// === 3. LOGIKA ===
window.launchToken = async function (tokenName) {
  const statusDiv = document.getElementById("launchStatus");
  const launchBtn = document.getElementById("launchTokenBtn");
  if (!statusDiv) return;

  if (!tokenName || tokenName.trim().length < 3) {
    showModal('warning', "Token name is too short (min 3 chars).");
    return;
  }

  const cleanName = tokenName.trim();
  const symbol = cleanName.substring(0, 3).toUpperCase();

  try {
    if (launchBtn) { launchBtn.disabled = true; launchBtn.textContent = "Launching..."; }

    // Zobrazíme loading ve statusDiv (jen během čekání)
    statusDiv.style.display = "block";
    statusDiv.className = "info-box";
    statusDiv.innerHTML = `Preparing ${tokenName}...`;

    if (!ethProvider) ethProvider = await sdk.wallet.ethProvider;
    if (!ethProvider) throw new Error("Wallet not connected. Please reload.");

    let tempProvider = new BrowserProvider(ethProvider);
    let network = await tempProvider.getNetwork();

    if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML = 'Switching to Base Sepolia...';
      try {
        await ethProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x14a34' }] });
      } catch (e) {}
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 1000));
        tempProvider = new BrowserProvider(ethProvider);
        network = await tempProvider.getNetwork();
        if (Number(network.chainId) === BASE_SEPOLIA_CHAIN_ID) break;
        attempts++;
      }
      if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) throw new Error("Failed to switch network.");
    }

    const walletProvider = new BrowserProvider(ethProvider);
    const signer = await walletProvider.getSigner();
    const wallet = await signer.getAddress();

    statusDiv.innerHTML = "Please confirm transaction in your wallet...";
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

    let tx;
    try { tx = await factory.createToken(cleanName, symbol, 1000000, { gasLimit: 3000000 }); }
    catch (err) { tx = await factory.createToken(cleanName, symbol, 1000000); }

    statusDiv.innerHTML = "Transaction submitted. Waiting for confirmation...";
    const publicProvider = new JsonRpcProvider('https://sepolia.base.org');
    const receipt = await publicProvider.waitForTransaction(tx.hash);

    if (!receipt || receipt.status === 0) throw new Error("Transaction reverted on chain.");

    let tokenAddress = null;
    if (receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed && parsed.name === "TokenCreated") { tokenAddress = parsed.args.token; break; }
        } catch {}
      }
    }

    if (!tokenAddress && receipt.logs?.length > 0) {
       try {
        const lastLog = receipt.logs[receipt.logs.length - 1];
        const decoded = factory.interface.decodeEventLog("TokenCreated", lastLog.data, lastLog.topics);
        if (decoded?.token) tokenAddress = decoded.token;
       } catch {}
    }

    if (!tokenAddress) throw new Error("Token deployed, but address not found in logs.");

    const contractEl = document.getElementById("tokenContract");
    if (contractEl) contractEl.textContent = tokenAddress;

    await updatePracticeLaunchProgress(wallet);

    // !!! TADY JE TA ZMĚNA !!!
    // Skryjeme ten "blbý" status div ve stránce
    statusDiv.style.display = "none";

    const shortAddress = tokenAddress.slice(0, 4) + "..." + tokenAddress.slice(-4);
    showModal('success', `
      <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 15px;">
          <p style="margin: 5px 0;"><strong>Name:</strong> ${cleanName}</p>
          <p style="margin: 5px 0;"><strong>Symbol:</strong> ${symbol}</p>
          <p style="margin: 5px 0;"><strong>Supply:</strong> 1,000,000</p>
          <p style="margin: 5px 0;"><strong>Address:</strong> <br><code style="font-size: 11px; word-break: break-all; color: #94a3b8;">${shortAddress}</code></p>
      </div>
      <button onclick="openSepoliaScanAddress('https://sepolia.basescan.org/address/${tokenAddress}')" style="width: 100%; padding: 12px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">View on BaseScan</button>
    `);

  } catch (error) {
    statusDiv.style.display = "none";
    showModal('danger', `Launch failed:<br>${error.message}`);
  } finally {
    if (launchBtn) { launchBtn.disabled = false; launchBtn.textContent = "🚀 Launch Token"; }
  }
}

// === 4. MODAL UTILS (Přesně podle Security Lab) ===
function showModal(type, msg) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';

    let title = 'NOTICE';
    let modalClass = 'modal-warning';

    if (type === 'success') { title = 'TOKEN LAUNCHED!'; modalClass = 'modal-success'; }
    else if (type === 'danger') { title = 'LAUNCH FAILED'; modalClass = 'modal-danger'; }

    overlay.innerHTML = `
        <div class="custom-modal-content ${modalClass}">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
            </div>
            <div class="modal-body">${msg}</div>
            <div class="modal-footer">
                <button class="modal-btn" onclick="this.closest('.custom-modal-overlay').remove()">Got it</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

window.openSepoliaScanAddress = (addr) => sdk.actions.openUrl(addr);