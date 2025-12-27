import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
const API_BASE = "https://learn-base-backend.vercel.app";

let currentWallet = null;
let transactionCompleted = false;

async function initWallet() {
  try {
    await sdk.actions.ready();

    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            if (cache.wallet) {
                currentWallet = cache.wallet;
                console.log("Lab 3: Wallet cached:", currentWallet);
                return;
            }
        } catch (e) {}
    }

    const sessionWallet = sessionStorage.getItem('cached_wallet');
    if (sessionWallet) {
        currentWallet = sessionWallet;
        return;
    }

    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    currentWallet = accounts && accounts[0] ? accounts[0] : null;

    if (currentWallet) {
        sessionStorage.setItem('cached_wallet', currentWallet);
    }

  } catch (err) {
    console.error("Lab 3 wallet init error:", err);
  }
}

// === OPTIMIZED UPDATE ===
async function updateLabProgress(wallet) {
  if (!wallet) return false;

  // 1. Optimistic
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('lab3', true);
  }

  // 2. DB
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
  return res.ok;
}

async function saveLab3ProgressIfPossible() {
  if (!currentWallet) {
    showModal("warning", "Simulation finished. Connect wallet to save progress.");
    return;
  }
  const ok = await updateLabProgress(currentWallet);
  if (!ok) showModal("danger", "Simulation finished, but saving progress failed.");
}

function showModal(type, message) {
  const old = document.querySelector(".custom-modal");
  if (old) old.remove();
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-${type}-header"><h3>${type === "success" ? "SUCCESS" : type === "danger" ? "DANGER" : "WARNING"}</h3></div>
      <div class="modal-body" style="color: black;"><p>${message.replace(/\n/g, "<br>")}</p></div>
      <div class="modal-footer"><button class="modal-close-btn">OK</button></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".modal-close-btn").onclick = () => modal.remove();
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

function openWalletPopup({ amount, symbol, to }) {
  const old = document.querySelector(".wallet-popup");
  if (old) old.remove();

  const popup = document.createElement("div");
  popup.className = "wallet-popup";
  const displayWallet = currentWallet ? currentWallet.slice(0,6) + "..." + currentWallet.slice(-4) : "0x...";

  popup.innerHTML = `
    <div class="wallet-popup-inner">
      <div class="wallet-popup-header"><span class="wallet-provider">basepay</span></div>
      <div class="wallet-popup-body">
        <div class="wallet-signed">Signed in as ${displayWallet}</div>
        <div class="wallet-pay-title">Pay ${amount} ${symbol}</div>
        <div class="wallet-pay-to">To ${to}</div>
        <div class="wallet-pay-with">
          <div class="wallet-pay-label">Pay with</div>
          <div class="wallet-pay-row">
            <div class="wallet-pay-addr">${displayWallet}</div>
            <div class="wallet-pay-balance">6.00 ${symbol} Available</div>
          </div>
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
    popup.querySelector(".wallet-cancel").onclick = () => { popup.remove(); resolve(false); };
    popup.querySelector(".wallet-confirm").onclick = () => { popup.remove(); resolve(true); };
  });
}

function showTransactionUI(runButton) {
  runButton.style.display = "none";
  const trySection = document.querySelector(".try-section");
  if (!trySection) return;

  trySection.innerHTML = `
    <div class="tx-shell">
      <div class="tx-card-inner">
        <div class="tx-header"><h2 style="color:black;">Pay 1.00 USDC</h2><p>Simulation</p></div>
        <div class="tx-row tx-recipient">
          <div class="tx-row-left"><div class="tx-row-text"><div class="tx-row-title">The Artist</div></div></div>
          <div class="tx-pill tx-pill-success">Verified</div>
        </div>
        <div class="tx-progress-block">
          <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
          <div class="tx-progress-text" id="progressText">Waiting...</div>
        </div>
        <button class="connect-btn tx-pay-btn" id="payButton">⚡ Pay 1 USDC</button>
      </div>
    </div>
    <style>.tx-shell{background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:20px;border-radius:20px;max-width:400px;margin:0 auto;color:black;} .tx-card-inner{background:white;padding:20px;border-radius:16px;} .progress-bar{height:6px;background:#eee;border-radius:10px;overflow:hidden;margin:15px 0;} .progress-fill{height:100%;background:#22c55e;transition:width 0.3s;} .tx-pay-btn{width:100%;margin-top:10px;}</style>
  `;

  const payButton = document.getElementById("payButton");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");

  payButton.addEventListener("click", async e => {
    e.preventDefault();
    const confirmed = await openWalletPopup({ amount: "1.00", symbol: "USDC", to: "0x5b9a...e48F" });
    if (!confirmed) return;

    payButton.disabled = true;
    let conf = 0;
    const timer = setInterval(async () => {
      conf += 1;
      progressFill.style.width = (conf / 3) * 100 + "%";
      if (conf === 1) progressText.textContent = "Confirming...";
      if (conf === 2) progressText.textContent = "Almost done...";
      if (conf >= 3) {
        clearInterval(timer);
        progressText.textContent = "Success";
        payButton.textContent = "Paid";
        transactionCompleted = true;
        await saveLab3ProgressIfPossible();
      }
    }, 1000);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Lab 3 loaded");
  await initWallet();

  const runButton = document.querySelector(".cta-button");
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
        showModal("warning", "First finish the payment simulation.");
        return;
      }
      showModal("success", "Correct! This simulation showed a safe flow (Wallet Popup).");
    });
  }
});