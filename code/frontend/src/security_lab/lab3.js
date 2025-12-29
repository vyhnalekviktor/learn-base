import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;
let transactionCompleted = false;

// === 1. INIT WALLET ===
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
} catch (err) {}
}

async function updateLabProgress(wallet) {
  if (!wallet) return false;
  if (window.BaseCampTheme) window.BaseCampTheme.updateLocalProgress('lab3', true);
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, table_name: "USER_PROGRESS", field_name: "lab3", value: true })
  });
  return res.ok;
}

// === 2. STYLES ===
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
        .modal-btn { background: #334155; color: white; border: none; padding: 12px 0; width: 100%; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 16px; }
        .modal-success .modal-btn { background: #22c55e; color: #022c22; }
        .modal-success .modal-title { color: #22c55e; }
        .modal-warning .modal-btn { background: #eab308; color: black; }
        .modal-warning .modal-title { color: #eab308; }

        /* WALLET POPUP STYLES */
        .wallet-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            display: flex; align-items: flex-end; justify-content: center; z-index: 9999;
        }
        @media(min-width: 500px) { .wallet-overlay { align-items: center; } }

        .wallet-card {
            width: 100%; max-width: 375px; background: #ffffff; border-radius: 20px 20px 0 0;
            overflow: hidden; font-family: -apple-system, sans-serif;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s ease-out; color: #1f2937;
        }
        @media(min-width: 500px) { .wallet-card { border-radius: 20px; } }

        .w-header { background: #f3f4f6; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; }
        .w-network { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #374151; background: #e5e7eb; padding: 4px 8px; border-radius: 12px; }
        .w-dot { width: 8px; height: 8px; background: #0052ff; border-radius: 50%; }

        .w-body { padding: 20px; }
        .w-origin { text-align: center; margin-bottom: 20px; }
        .w-domain { font-weight: 600; font-size: 16px; margin-bottom: 4px; }
        .w-verified { color: #059669; font-size: 12px; background: #d1fae5; padding: 2px 8px; border-radius: 10px; display: inline-block; }

        .w-action { text-align: center; margin-bottom: 24px; }
        .w-amount { font-size: 32px; font-weight: 800; color: #111827; }

        .w-details { background: #f9fafb; border-radius: 12px; padding: 12px; font-size: 14px; }
        .w-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: #6b7280; }
        .w-val { color: #111827; font-weight: 500; }
        .w-address { font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 13px; }

        .w-footer { padding: 16px; display: flex; gap: 12px; border-top: 1px solid #f3f4f6; }
        .w-btn { flex: 1; padding: 14px; border-radius: 12px; font-weight: 600; cursor: pointer; border: none; font-size: 16px; }
        .w-btn-reject { background: #f3f4f6; color: #374151; }
        .w-btn-confirm { background: #0052ff; color: white; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    `;
    document.head.appendChild(style);
}

// === 3. REALISTIC WALLET POPUP ===
function openWalletPopup({ amount, symbol }) {
  const overlay = document.createElement("div");
  overlay.className = "wallet-overlay";
  const shortWallet = currentWallet ? `${currentWallet.slice(0,5)}...${currentWallet.slice(-4)}` : "0x12...ABCD";

  overlay.innerHTML = `
    <div class="wallet-card">
      <div class="w-header">
        <div class="w-network"><div class="w-dot"></div> Base Mainnet</div>
        <div style="font-size: 12px; color: #6b7280;">${shortWallet}</div>
      </div>

      <div class="w-body">
        <div class="w-origin">
            <div style="font-size: 40px; margin-bottom: 10px;">🎨</div>
            <div class="w-domain">rare-art.xyz</div>
            <div class="w-verified">✓ Verified App</div>
        </div>

        <div class="w-action">
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Send Payment</div>
            <div class="w-amount">- ${amount} ${symbol}</div>
        </div>

        <div class="w-details">
            <div class="w-row">
                <span>To:</span>
                <span class="w-val">The Artist</span>
            </div>
            <div class="w-row" style="margin-bottom: 12px;">
                <span>Address:</span>
                <span class="w-address">0xArt...Coll</span>
            </div>
            <div class="w-row">
                <span>Network Fee</span>
                <span class="w-val">0.00004 ETH <span style="color:#9ca3af">($0.15)</span></span>
            </div>
            <div class="w-row">
                <span>Total Cost</span>
                <span class="w-val">$1.15</span>
            </div>
        </div>
      </div>

      <div class="w-footer">
        <button class="w-btn w-btn-reject" id="w-reject">Reject</button>
        <button class="w-btn w-btn-confirm" id="w-confirm">Pay</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  return new Promise(resolve => {
    document.getElementById("w-reject").onclick = () => { overlay.remove(); resolve(false); };
    document.getElementById("w-confirm").onclick = () => { overlay.remove(); resolve(true); };
  });
}

// === 4. ARTIST PAYMENT UI SIMULATION ===
function showTransactionUI(runButton) {
  runButton.style.display = "none";
  const trySection = document.querySelector(".try-section");
  if (!trySection) return;

  trySection.innerHTML = `
    <div style="background: #1e293b; border-radius: 16px; padding: 24px; text-align: center; border: 1px solid #334155; max-width: 400px; margin: 0 auto;">

        <div style="background: #0f172a; border-radius: 12px; overflow: hidden; margin-bottom: 20px; position: relative;">
            <div style="height: 200px; background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 60px;">🌌</span>
            </div>
            <div style="padding: 15px; text-align: left;">
                <h3 style="color: white; margin: 0 0 5px 0;">Cosmic Dreams #42</h3>
                <p style="color: #94a3b8; font-size: 14px; margin: 0;">Created by <strong>VisualArtist.eth</strong></p>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; color: #cbd5e1; font-size: 14px;">
            <span>Price:</span>
            <span style="font-weight: bold; color: white; font-size: 18px;">1.00 USDC</span>
        </div>

        <div id="tx-status-area" style="display:none; margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
            <div style="display:inline-block; width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #0052ff; border-radius: 50%; animation: spin 1s linear infinite; vertical-align: middle; margin-right: 8px;"></div>
            <span style="color: #cbd5e1; font-size: 14px;">Waiting for signature...</span>
        </div>

        <button id="trigger-btn" style="width: 100%; padding: 16px; background: white; color: #0f172a; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 16px; transition: all 0.2s;">
            Buy Now
        </button>

        <p style="color: #64748b; font-size: 12px; margin-top: 15px;">
            Simulated transaction. No real funds needed.
        </p>
    </div>
    <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
  `;

  const triggerBtn = document.getElementById("trigger-btn");
  const statusArea = document.getElementById("tx-status-area");

  triggerBtn.addEventListener("click", async () => {
    // 1. DApp UI Update
    triggerBtn.style.opacity = "0.5";
    triggerBtn.disabled = true;
    triggerBtn.textContent = "Check Wallet...";
    statusArea.style.display = "block";

    // 2. Open Wallet Popup (Delay for realism)
    setTimeout(async () => {
        const confirmed = await openWalletPopup({ amount: "1.00", symbol: "USDC" });

        if (confirmed) {
            statusArea.innerHTML = `<span style="color: #22c55e; font-weight: bold;">✓ Transaction Sent!</span>`;
            triggerBtn.textContent = "Purchased";
            triggerBtn.style.background = "#22c55e";
            triggerBtn.style.color = "white";
            triggerBtn.style.opacity = "1";
            transactionCompleted = true;
            updateLabProgress(currentWallet).catch(err => console.error("Save failed:", err));

            setTimeout(() => {
                showModal("success", "EXCELLENT!<br><br>You verified the recipient (Artist) and amount before paying.<br>Always double-check what you sign.");
            }, 800);
        } else {
            statusArea.innerHTML = `<span style="color: #ef4444;">✕ Rejected by user</span>`;
            triggerBtn.textContent = "Try Again";
            triggerBtn.disabled = false;
            triggerBtn.style.opacity = "1";

            setTimeout(() => {
                showModal("warning", "You rejected the payment.<br><br>This is safe, but to complete the lab, please verify and confirm the transaction simulation.");
            }, 800);
        }
    }, 1000);
  });
}

// === MAIN LISTENER ===
document.addEventListener("DOMContentLoaded", async () => {
  await initWallet();
  injectStyles();

  const runBtn = document.querySelector(".cta-button");
  const scamBtn = document.querySelector(".scam-warning-btn");

  if (runBtn) {
      runBtn.onclick = (e) => {
          e.preventDefault();
          showTransactionUI(runBtn);
      }
  }

  if (scamBtn) {
      scamBtn.onclick = (e) => {
          e.preventDefault();
          if(transactionCompleted) showModal("success", "Lab already completed!");
          else showModal("warning", "Please run the simulation first.");
      }
  }
});

// === MODAL UTILS ===
function showModal(type, msg) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';

    let icon = '', title = '', modalClass = '';

    if (type === 'success') { icon = ''; title = 'GREAT JOB!'; modalClass = 'modal-success'; }
    else if (type === 'danger') { icon = '🛑'; title = 'WATCH OUT!'; modalClass = 'modal-danger'; }
    else { icon = '⚠️'; title = 'NOTICE'; modalClass = 'modal-warning'; }

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