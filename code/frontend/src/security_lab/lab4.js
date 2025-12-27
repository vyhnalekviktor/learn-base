import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
const API_BASE = "https://learn-base-backend.vercel.app";

let currentWallet = null;

async function initWallet() {
  try {
    await sdk.actions.ready();

    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            if (cache.wallet) {
                currentWallet = cache.wallet;
                updateUI(currentWallet);
                return;
            }
        } catch (e) {}
    }

    const sessionWallet = sessionStorage.getItem('cached_wallet');
    if (sessionWallet) {
        currentWallet = sessionWallet;
        updateUI(currentWallet);
        return;
    }

    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    currentWallet = accounts && accounts[0] ? accounts[0] : null;

    if (currentWallet) {
        sessionStorage.setItem('cached_wallet', currentWallet);
        updateUI(currentWallet);
    }

  } catch (err) {
    console.error("Lab 4 wallet init error:", err);
  }
}

function updateUI(wallet) {
    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;
}

// === OPTIMIZED UPDATE ===
async function updateLabProgress(wallet) {
  if (!wallet) return false;

  // 1. Optimistic
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('lab4', true);
  }

  // 2. DB
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet,
      table_name: "USER_PROGRESS",
      field_name: "lab4",
      value: true,
    }),
  });
  if (!res.ok) return false;
  return true;
}

function showModal(type, message) {
  const old = document.querySelector(".custom-modal");
  if (old) old.remove();
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-${type}-header"><h3>${type === "success" ? "SUCCESS" : type === "danger" ? "WRONG" : "WARNING"}</h3></div>
      <div class="modal-body" style="color: black;"><p>${message.replace(/\n/g, "<br>")}</p></div>
      <div class="modal-footer"><button class="modal-close-btn">OK</button></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".modal-close-btn").onclick = () => modal.remove();
}

function injectQuizStylesIfNeeded() {
  if (document.getElementById("lab4-quiz-styles")) return;
  const style = document.createElement("style");
  style.id = "lab4-quiz-styles";
  style.textContent = `
    .wallet-quiz-card { background: linear-gradient(135deg, #0b5cff, #0061d9); padding: 20px; border-radius: 18px; color: white; margin-top: 20px; }
    .quiz-row { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .quiz-choice { display: flex; gap: 10px; }
    .quiz-row-correct { background: rgba(0,255,0,0.2); }
    .quiz-row-wrong { background: rgba(255,0,0,0.2); }
  `;
  document.head.appendChild(style);
}

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Lab 4 loaded");
  await initWallet();
  injectQuizStylesIfNeeded();

  const runButton = document.querySelector(".cta-button");
  if (runButton) {
    runButton.addEventListener("click", (e) => {
      e.preventDefault();
      renderQuizCard(runButton);
    });
  }
});

function renderQuizCard(runButton) {
  runButton.style.display = "none";
  const trySection = document.querySelector(".try-section");
  if (!trySection) return;

  trySection.innerHTML = `
    <div class="card wallet-quiz-card">
      <div class="quiz-table">
        ${['wallet-connect','seed-phrase','private-key','backup-file'].map(type => `
        <div class="quiz-row" data-type="${type}">
          <div>${type.replace('-',' ').toUpperCase()}</div>
          <div class="quiz-choice">
            <label><input type="radio" name="${type}" value="ok"> OK</label>
            <label><input type="radio" name="${type}" value="scam"> SCAM</label>
          </div>
        </div>`).join('')}
      </div>
      <button class="primary-btn" onclick="evaluateAnswers()" style="margin-top:20px; width:100%;">Evaluate</button>
    </div>
  `;
}

window.evaluateAnswers = async function () {
  const rows = document.querySelectorAll(".quiz-row");
  const answers = {};

  rows.forEach((row) => {
    const type = row.dataset.type;
    const checked = row.querySelector('input[type="radio"]:checked');
    if (checked) answers[type] = checked.value;
    row.classList.remove("quiz-row-correct", "quiz-row-wrong");
  });

  const correct = { "wallet-connect": "ok", "seed-phrase": "scam", "private-key": "scam", "backup-file": "scam" };
  const allAnswered = Object.keys(correct).every(k => answers[k]);

  if (!allAnswered) {
    showModal("warning", "Answer all questions first.");
    return;
  }

  let isAllCorrect = true;
  rows.forEach(row => {
    const t = row.dataset.type;
    if (answers[t] === correct[t]) row.classList.add("quiz-row-correct");
    else { row.classList.add("quiz-row-wrong"); isAllCorrect = false; }
  });

  if (!isAllCorrect) {
    showModal("danger", "Wrong answers. Remember: Only WalletConnect is safe.");
    return;
  }

  showModal("success", "CONGRATS! Lab 4 COMPLETE!");
  if (currentWallet) await updateLabProgress(currentWallet);
  else showModal("warning", "Connect wallet to save progress.");
};