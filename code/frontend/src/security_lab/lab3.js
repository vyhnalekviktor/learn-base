// lab3.js – simulated Base payment, wallet only for progress (no status box)

import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

let currentWallet = null;      // only for saving progress
let transactionCompleted = false;

// ---------- WALLET INIT (ONLY FOR PROGRESS) ----------
async function initWallet() {
  try {
    console.log("Lab 3: calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("Mini app ready");

    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      console.warn("Lab 3: no wallet from eth_requestAccounts – simulation will still work, but progress cannot be saved.");
      return;
    }

    currentWallet = wallet;
    console.log("Lab 3: connected wallet:", wallet);
  } catch (err) {
    console.error("Lab 3: wallet init error:", err);
  }
}

// ---------- BACKEND PROGRESS (LAB 3) ----------
async function updateLabProgress(wallet) {
  if (!wallet) return false;
  try {
    const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        table_name: "USER_PROGRESS",
        field_name: "lab3",
        value: true
      })
    });

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("Lab 3: update_field error:", msg);
      return false;
    }

    console.log("Lab 3: PROGRESS SAVED OK");
    return true;
  } catch (e) {
    console.error("Lab 3: update_field exception:", e);
    return false;
  }
}

// helper: tries to save progress, but does not block UX
async function saveLab3ProgressIfPossible() {
  if (!currentWallet) {
    console.warn("Lab 3: no wallet, cannot save progress");
    showModal(
      "warning",
      "Transaction simulation finished.\nTo save your progress, please connect your wallet next time."
    );
    return;
  }
  const ok = await updateLabProgress(currentWallet);
  if (!ok) {
    showModal("danger", "Simulation finished, but saving your progress failed.");
  }
}

// ---------- GENERIC MODAL ----------
function showModal(type, message) {
  const old = document.querySelector(".custom-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-${type}-header">
        <h3>${type === "success" ? "SUCCESS" : type === "danger" ? "DANGER" : "WARNING"}</h3>
      </div>
      <div class="modal-body" style="color: black;">
        <p>${message.replace(/\n/g, "<br>")}</p>
      </div>
      <div class="modal-footer">
        <button class="modal-close-btn">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector(".modal-close-btn");
  closeBtn.onclick = () => modal.remove();
  modal.addEventListener("click", e => {
    if (e.target === modal) modal.remove();
  });
}

// ---------- SIMULATED BASE WALLET POPUP ----------
function openWalletPopup({ amount, symbol, to }) {
  const old = document.querySelector(".wallet-popup");
  if (old) old.remove();

  const popup = document.createElement("div");
  popup.className = "wallet-popup";
  popup.innerHTML = `
    <div class="wallet-popup-inner">
      <div class="wallet-popup-header">
        <span class="wallet-provider">basepay</span>
      </div>

      <div class="wallet-popup-body">
        <div class="wallet-signed">
          Signed in as ${currentWallet ? currentWallet.slice(0,6) + "..." + currentWallet.slice(-4) : "0x… (simulated)"}
        </div>

        <div class="wallet-pay-title">Pay ${amount} ${symbol}</div>
        <div class="wallet-pay-to">To ${to}</div>

        <div class="wallet-pay-with">
          <div class="wallet-pay-label">Pay with</div>
          <div class="wallet-pay-row">
            <div class="wallet-pay-addr">${currentWallet ? currentWallet.slice(0,6) + "..." + currentWallet.slice(-4) : "0x…"} </div>
            <div class="wallet-pay-balance">6.00 ${symbol} Available</div>
          </div>
        </div>

        <div class="wallet-est">
          <span>Est. total</span>
          <span>${amount} ${symbol}</span>
        </div>
      </div>

      <div class="wallet-popup-footer">
        <button class="wallet-btn wallet-cancel">Cancel</button>
        <button class="wallet-btn wallet-confirm">Pay now</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  return new Promise(resolve => {
    popup.querySelector(".wallet-cancel").onclick = () => {
      popup.remove();
      resolve(false);
    };
    popup.querySelector(".wallet-confirm").onclick = () => {
      popup.remove();
      resolve(true);
    };
  });
}

// ---------- TRANSACTION UI ----------
function showTransactionUI(runButton) {
  runButton.style.display = "none";
  const trySection = document.querySelector(".try-section");
  if (!trySection) return;

  trySection.innerHTML = `
    <div class="tx-shell">
      <div class="tx-card-inner">

        <div class="tx-header">
          <h2 style="color: black;">Pay 1.00 USDC</h2>
          <p>Base chain paygate simulation</p>
        </div>

        <div class="tx-row tx-recipient">
          <div class="tx-row-left">
            <div class="tx-row-icon">🎨</div>
            <div class="tx-row-text">
              <div class="tx-row-title">The Artist</div>
            </div>
          </div>
          <div class="tx-pill tx-pill-success">Verified</div>
        </div>

        <div class="tx-row tx-amount">
          <div class="tx-row-text">
            <div class="tx-amount-main" style="color: black;">1.00 USDC</div>
          </div>
        </div>

        <div class="tx-progress-block">
          <div class="tx-progress-header">
            <span>Base chain confirmation</span>
            <span id="blockCount" class="tx-progress-count">0 / 3</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill" style="width:0%"></div>
          </div>
          <div class="tx-progress-text" id="progressText">Waiting for wallet confirmation…</div>
        </div>

        <button class="connect-btn tx-pay-btn" id="payButton">
          ⚡ Pay 1.00 USDC
        </button>

      </div>
    </div>

    <style>
      .tx-shell{
        max-width:520px;margin:0 auto;
        padding:24px;border-radius:26px;
        background:linear-gradient(135deg,#1d4ed8,#7c3aed);
      }
      .tx-card-inner{
        background:rgba(255,255,255,0.97);
        border-radius:22px;padding:26px 22px;
        box-shadow:0 20px 40px rgba(15,23,42,0.25);
      }
      .tx-header{text-align:center;margin-bottom:22px;}
      .tx-header-icon{font-size:32px;margin-bottom:6px;}
      .tx-header h2{margin:0 0 4px;font-size:24px;}
      .tx-header p{margin:0;color:#64748b;font-size:14px;}
      .tx-row{
        display:flex;align-items:center;justify-content:space-between;
        background:#f8fafc;border-radius:18px;
        padding:12px 14px;margin-bottom:12px;
      }
      .tx-row-left{display:flex;align-items:center;gap:10px;}
      .tx-row-icon{
        width:32px;height:32px;border-radius:999px;background:#e5e7eb;
        display:flex;align-items:center;justify-content:center;font-size:18px;
      }
      .tx-row-title{font-size:14px;font-weight:600;color:#0f172a;}
      .tx-row-sub{font-size:12px;color:#64748b;}
      .tx-pill{
        border-radius:999px;padding:4px 10px;
        font-size:11px;font-weight:600;
      }
      .tx-pill-success{background:#bbf7d0;color:#166534;}
      .tx-amount-main{font-size:22px;font-weight:700;}
      .tx-amount-sub{font-size:12px;color:#64748b;}
      .tx-progress-block{margin:16px 0 14px;}
      .tx-progress-header{
        display:flex;justify-content:space-between;
        font-size:12px;color:#475569;margin-bottom:4px;
      }
      .tx-progress-count{
        font-family:monospace;background:#e5e7eb;
        border-radius:999px;padding:0 8px;
      }
      .progress-bar{
        height:6px;border-radius:999px;
        background:#e5e7eb;overflow:hidden;
      }
      .progress-fill{
        height:100%;
        background:linear-gradient(90deg,#22c55e,#4ade80);
        transition:width 0.35s ease;
      }
      .tx-progress-text{
        text-align:center;font-size:12px;
        color:#64748b;margin-top:4px;
      }
      .tx-pay-btn{width:100%;margin:14px 0 0;font-size:15px;}
      /* wallet popup */
      .wallet-popup{
        position:fixed;inset:0;
        display:flex;align-items:center;justify-content:center;
        background:rgba(15,23,42,0.65);z-index:10000;
      }
      .wallet-popup-inner{
        width:360px;border-radius:18px;background:#050816;color:white;
        padding:16px 18px 14px;box-shadow:0 18px 45px rgba(0,0,0,0.7);
      }
      .wallet-popup-header{text-align:right;font-size:11px;color:#9ca3af;margin-bottom:6px;}
      .wallet-provider{text-transform:lowercase;}
      .wallet-signed{font-size:12px;color:#9ca3af;margin-bottom:10px;}
      .wallet-token-icon{
        width:56px;height:56px;border-radius:999px;background:#111827;
        margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:28px;
      }
      .wallet-pay-title{text-align:center;font-size:18px;font-weight:700;margin-bottom:2px;}
      .wallet-pay-to{text-align:center;font-size:11px;color:#9ca3af;margin-bottom:14px;}
      .wallet-pay-with{
        background:#020617;border-radius:12px;
        padding:10px 11px;margin-bottom:10px;font-size:11px;
      }
      .wallet-pay-label{color:#9ca3af;margin-bottom:4px;}
      .wallet-pay-row{display:flex;justify-content:space-between;align-items:center;}
      .wallet-pay-addr{font-family:monospace;font-size:11px;}
      .wallet-pay-balance{color:#9ca3af;font-size:11px;}
      .wallet-est{
        display:flex;justify-content:space-between;
        font-size:12px;margin-bottom:10px;
      }
      .wallet-popup-footer{display:flex;gap:8px;}
      .wallet-btn{
        flex:1;border-radius:10px;padding:9px 0;
        border:none;font-size:13px;font-weight:600;cursor:pointer;
      }
      .wallet-cancel{background:#111827;color:#e5e7eb;}
      .wallet-confirm{background:white;color:#111827;}
    </style>
  `;

  const payButton      = document.getElementById("payButton");
  const progressFill   = document.getElementById("progressFill");
  const progressText   = document.getElementById("progressText");
  const blockCountSpan = document.getElementById("blockCount");

  payButton.addEventListener("click", async e => {
    e.preventDefault();
    e.stopPropagation();

    // 1) Simulated Base wallet popup – no real tx
    const confirmed = await openWalletPopup({
      amount: "1.00",
      symbol: "USDC",
      to: "0x5b9a...e48F"
    });
    if (!confirmed) {
      // button text můžeš klidně vrátit do defaultu, nechávám beze změny
      return;
    }

    // 2) Simulated Base confirmations (3 steps, fast)
    payButton.disabled = true;

    let conf = 0;
    const total = 3;

    const timer = setInterval(async () => {
      conf += 1;
      progressFill.style.width = (conf / total) * 100 + "%";
      blockCountSpan.textContent = `${conf} / ${total}`;

      if (conf === 1) {
        progressText.textContent = "Included in a block…";
      } else if (conf === 2) {
        progressText.textContent = "Almost final on Base…";
      } else if (conf >= total) {
        clearInterval(timer);
        progressText.textContent = "Final on Base chain";
        payButton.textContent = "Payment successful";
        transactionCompleted = true;
        await saveLab3ProgressIfPossible();
      }
    }, 1700); // ~5 s total
  });
}

// ---------- ENTRYPOINT ----------
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Lab 3 – DOMContentLoaded");
  await initWallet(); // only to have currentWallet for progress

  const runButton  = document.querySelector(".cta-button");
  const scamButton = document.querySelector(".scam-warning-btn");

  if (runButton) {
    runButton.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      showTransactionUI(runButton);
    });
  }

  if (scamButton) {
    scamButton.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();

      if (!transactionCompleted) {
        showModal(
          "warning",
          "And why?\n\nFirst finish the payment simulation.\nThen you will see why this flow is NOT a scam."
        );
        return;
      }

      showModal(
        "success",
        "And why is this NOT a scam?\n\n" +
        "• The transaction itself was only simulated\n" +
        "• You still had to confirm it in a wallet-like popup\n" +
        "• The popup clearly showed amount and recipient\n" +
        "• No seed phrase or private key was ever requested\n\n" +
        "This is what a safe, legitimate payment experience looks like."
      );
    });
  }
});
