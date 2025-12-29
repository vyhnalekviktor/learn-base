import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

// Fake Token Data
const FAKE_TOKEN = {
  name: "Honey Token",
  symbol: "HONEY",
  address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // (Fake address)
  marketCap: "$678,943",
  liquidity: "$12,689"
};

let userHoneyBalance = 0;

// === 1. WALLET INIT ===
async function initWallet() {
  try {
    await sdk.actions.ready();
    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            if (cache.wallet) currentWallet = cache.wallet;
        } catch (e) {}
    }
    if (!currentWallet) {
        currentWallet = sessionStorage.getItem('cached_wallet');
        if (!currentWallet) {
            const ethProvider = await sdk.wallet.ethProvider;
            const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
            currentWallet = accounts && accounts[0] ? accounts[0] : null;
            if (currentWallet) sessionStorage.setItem('cached_wallet', currentWallet);
        }
    }
    if(currentWallet) updateUI(currentWallet);
  } catch (error) {}
}

function updateUI(wallet) {
    const span = document.getElementById("wallet-address");
    if (span) span.textContent = `${wallet.slice(0,6)}...${wallet.slice(-4)}`;
}

async function updateLabProgress(wallet) {
  if (!wallet) return false;
  if (window.BaseCampTheme) window.BaseCampTheme.updateLocalProgress('lab2', true);
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, table_name: "USER_PROGRESS", field_name: "lab2", value: true })
  });
  return res.ok;
}

// === 2. STYLES FOR MODALS & UI ===
function injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* MODAL STYLES */
        .custom-modal-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center; z-index: 10000;
            animation: fadeIn 0.3s ease;
        }
        .custom-modal-content {
            background: #0f172a; border: 1px solid #334155; border-radius: 24px;
            width: 90%; max-width: 400px; padding: 0; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            text-align: center;
        }
        .modal-header { padding: 24px 24px 10px; }
        .modal-icon { font-size: 40px; margin-bottom: 10px; display: block; }
        .modal-title { font-size: 20px; font-weight: 700; color: white; margin: 0; }
        .modal-body { padding: 10px 24px 24px; color: #cbd5e1; font-size: 15px; line-height: 1.5; }
        .modal-footer { padding: 16px; background: #1e293b; border-top: 1px solid #334155; }

        .modal-btn {
            background: #334155; color: white; border: none; padding: 12px 0; width: 100%;
            border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;
            font-size: 16px;
        }
        .modal-btn:active { transform: scale(0.98); }

        /* VARIANTS */
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

// === 3. UI SIMULATION ===
document.addEventListener("DOMContentLoaded", async function () {
  await initWallet();
  injectStyles(); // Inject CSS

  const scamButton = document.querySelector(".scam-warning-btn");
  const runButton = document.querySelector(".cta-button");

  // "I found a SCAM" button logic
  if (scamButton) {
      scamButton.addEventListener("click", async function (e) {
        e.preventDefault();
        if (!currentWallet) { showModal("warning", "Please connect your wallet first!"); return; }

        updateLabProgress(currentWallet).catch(err => console.error("Save failed:", err));
          showModal("success", "Lab 2 COMPLETE!<br>High APY + 100% Sell Tax is a clear Honeypot signal.<br>Always verify the contract address before trading.");
      });
  }

  // "Start Simulation" button logic
  if (runButton) {
    runButton.addEventListener("click", function (e) {
      e.preventDefault();
      showHoneypotDemo();
    });
  }

  function showHoneypotDemo() {
    runButton.style.display = "none";
    const trySection = document.querySelector(".try-section");
    if (!trySection) return;

    trySection.classList.add("scam-active");
    trySection.innerHTML = `
      <div style="font-family: -apple-system, sans-serif;">

        <div class="dex-container" style="background:#0b1120; border:1px solid #1e293b; border-radius:16px; overflow:hidden; margin-bottom:20px;">
            <div style="padding:15px; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="background:#eab308; color:black; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">H</div>
                    <div>
                        <div style="font-weight:bold; color:white; font-size:16px;">${FAKE_TOKEN.symbol}/ETH</div>
                        <div style="font-size:12px; color:#22c55e;">+1250% APY 🚀</div>
                    </div>
                </div>
            </div>

            <div style="height:100px; background:linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(11,17,32,0) 100%); position:relative; border-bottom:1px solid #1e293b;">
                <div style="padding:15px;">
                    <div style="font-size:24px; font-weight:bold; color:#22c55e;">$0.0420</div>
                    <div style="font-size:12px; color:#94a3b8;">Liquidity: ${FAKE_TOKEN.liquidity}</div>
                </div>
                <svg viewBox="0 0 300 50" style="position:absolute; bottom:0; width:100%; height:50px; opacity:0.6;">
                    <path d="M0,50 L20,40 L40,45 L60,30 L80,35 L100,20 L120,25 L140,10 L160,15 L180,5 L200,10 L300,0" fill="none" stroke="#22c55e" stroke-width="2"/>
                </svg>
            </div>

            <div style="padding:15px;">
                <div style="display:flex; gap:10px;">
                    <button onclick="simulateBuy()" style="flex:1; background:#22c55e; color:black; border:none; padding:12px; border-radius:12px; font-weight:bold; cursor:pointer;">BUY</button>
                    <button onclick="simulateSell()" style="flex:1; background:#ef4444; color:white; border:none; padding:12px; border-radius:12px; font-weight:bold; cursor:pointer;">SELL</button>
                </div>
                <div id="trade-msg" style="text-align:center; font-size:12px; color:#cbd5e1; margin-top:10px; min-height:18px;">Balance: 0 HONEY</div>
            </div>
        </div>

        <div class="scanner-container" style="background:#1e293b; border:1px solid #334155; border-radius:16px; padding:20px; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; color:#fff; font-size:16px; display:flex; align-items:center; gap:8px;">
                    Token Scanner
                </h3>
                <span style="background:#ef4444; color:white; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold;">RISK: CRITICAL</span>
            </div>

            <div style="background:#0f172a; padding:15px; border-radius:12px; font-family:monospace; font-size:13px; border:1px dashed #475569;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:#94a3b8;">Buy Tax:</span>
                    <span style="color:#22c55e;">0% (OK)</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:#94a3b8;">Sell Tax:</span>
                    <span style="color:#ef4444; font-weight:bold;">100% (SCAM)</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding-top:8px; border-top:1px solid #334155;">
                    <span style="color:#94a3b8;">Simulation:</span>
                    <span style="color:#ef4444;">Transfer Failed</span>
                </div>
            </div>

            <div style="margin-top:15px; background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); padding:10px; border-radius:8px;">
                <div style="color:#ef4444; font-weight:bold; font-size:14px; text-align:center; margin-bottom:5px;">HONEYPOT DETECTED 🍯</div>
                <p style="margin:0; font-size:11px; color:#cbd5e1; text-align:center;">
                    Contract owner has disabled selling for regular users.
                </p>
            </div>

            <div style="margin-top:20px; text-align:center; border-top:1px solid #334155; padding-top:15px;">
                <p style="color:#94a3b8; font-size:12px; margin-bottom:10px;">For real tokens, always check manually:</p>
                <button onclick="openRealScanner()" style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:600; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:6px;">
                    Check on Honeypot.is ↗
                </button>
            </div>
        </div>

      </div>
    `;

    // Export functions to window
    window.simulateBuy = simulateBuy;
    window.simulateSell = simulateSell;
    window.openRealScanner = openRealScanner;
  }
});

// --- LOGIC ---

function simulateBuy() {
    const status = document.getElementById("trade-msg");
    status.textContent = "Buying...";
    status.style.color = "#eab308";
    setTimeout(() => {
        userHoneyBalance += 12500;
        status.textContent = `Buy Success! Balance: ${userHoneyBalance.toLocaleString()} HONEY`;
        status.style.color = "#22c55e";
    }, 600);
}

function simulateSell() {
    if (userHoneyBalance <= 0) {
        document.getElementById("trade-msg").textContent = "No balance to sell. Buy first.";
        return;
    }
    const status = document.getElementById("trade-msg");
    status.textContent = "Approving...";
    status.style.color = "#eab308";

    setTimeout(() => {
        status.textContent = "❌ ERROR: Transfer failed. (Honeypot Logic)";
        status.style.color = "#ef4444";
    }, 800);
}

function openRealScanner() {
    // Uses Farcaster SDK to open external tool safely
    const url = `https://honeypot.is`;
    sdk.actions.openUrl(url);
}

// === NEW MODAL SYSTEM ===
function showModal(type, msg) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';

    let title = '';
    let modalClass = '';

    if (type === 'success') {
        title = 'GREAT JOB!';
        modalClass = 'modal-success';
    } else if (type === 'danger') {
        title = 'WATCH OUT!';
        modalClass = 'modal-danger';
    } else {
        title = 'ATTENTION';
        modalClass = 'modal-warning';
    }

    overlay.innerHTML = `
        <div class="custom-modal-content ${modalClass}">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
            </div>
            <div class="modal-body">
                ${msg}
            </div>
            <div class="modal-footer">
                <button class="modal-btn" onclick="this.closest('.custom-modal-overlay').remove()">Got it</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close on background click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}