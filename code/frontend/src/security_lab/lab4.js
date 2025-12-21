import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
const API_BASE = "https://learn-base-backend.vercel.app";

let currentWallet = null;

// -------- WALLET INIT (ONLY FOR PROGRESS) --------
async function initWallet() {
  try {
    console.log("Lab 4: calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("Mini app ready");

    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      console.warn(
        "Lab 4: no wallet from eth_requestAccounts – quiz works, but progress cannot be saved."
      );
      return;
    }

    currentWallet = wallet;
    console.log("Lab 4: connected wallet:", wallet);

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;
  } catch (err) {
    console.error("Lab 4: wallet init error:", err);
  }
}

// -------- BACKEND PROGRESS (LAB 4) --------
async function updateLabProgress(wallet) {
  if (!wallet) return false;
  try {
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

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("Lab 4: update_field error:", msg);
      return false;
    }

    console.log("Lab 4: PROGRESS SAVED OK");
    return true;
  } catch (e) {
    console.error("Lab 4: update_field exception:", e);
    return false;
  }
}

// -------- MODAL (SAME STYLE AS OTHER LABS) --------
function showModal(type, message) {
  const old = document.querySelector(".custom-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.className = "custom-modal";

  const headerClass =
    type === "success"
      ? "modal-success-header"
      : type === "danger"
      ? "modal-danger-header"
      : "modal-warning-header";

  modal.innerHTML = `
    <div class="modal-content">
      <div class="${headerClass}">
        <h3>${type === "success" ? "SUCCESS" : type === "danger" ? "WRONG" : "WARNING"}</h3>
      </div>
      <div class="modal-body">
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
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

// -------- INLINE QUIZ-SPECIFIC CSS --------
function injectQuizStylesIfNeeded() {
  if (document.getElementById("lab4-quiz-styles")) return;

  const style = document.createElement("style");
  style.id = "lab4-quiz-styles";
  style.textContent = `
    .wallet-quiz-card {
      background: linear-gradient(135deg, #0b5cff, #0061d9);
      border-radius: 18px;
      padding: 24px 28px;
      color: #fff;
      box-shadow: 0 18px 45px rgba(0,0,0,0.35);
      max-width: 760px;
      margin: 0 auto;
    }

    .wallet-quiz-card .card-title {
      font-size: 24px;
      margin-bottom: 4px;
      text-align: left;
    }

    .wallet-quiz-card .card-subtitle {
      font-size: 14px;
      opacity: 0.85;
      margin-bottom: 18px;
      text-align: left;
    }

    .quiz-header-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .quiz-legend {
      font-size: 12px;
      text-align: right;
    }

    .legend-pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.35);
      margin-left: 6px;
      margin-bottom: 4px;
      white-space: nowrap;
    }

    .legend-ok {
      background: rgba(0,255,135,0.12);
      border-color: rgba(0,255,135,0.7);
    }

    .legend-scam {
      background: rgba(255,90,90,0.15);
      border-color: rgba(255,120,120,0.8);
    }

    .quiz-table {
      width: 100%;
      border-radius: 14px;
      background: rgba(0,0,0,0.14);
      padding: 10px 12px 6px;
    }

    .quiz-table-header {
      display: grid;
      grid-template-columns: 3fr 0.7fr 0.7fr;
      column-gap: 12px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.85;
      margin-bottom: 4px;
    }

    .quiz-col-label {
      padding-left: 4px;
    }

    .quiz-row {
      display: grid;
      grid-template-columns: 3fr 0.7fr 0.7fr;
      column-gap: 12px;
      align-items: center;
      padding: 10px 4px;
      border-radius: 10px;
      transition: background 0.15s ease, transform 0.1s ease;
    }

    .quiz-row + .quiz-row {
      margin-top: 4px;
    }

    .quiz-row:hover {
      background: rgba(0,0,0,0.18);
      transform: translateY(-1px);
    }

    .quiz-option-info {
      text-align: left;
    }

    .quiz-option-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .quiz-option-desc {
      font-size: 12px;
      opacity: 0.9;
      margin: 0;
    }

    .quiz-choice {
      display: flex;
      justify-content: center;
    }

    .quiz-radio-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 28px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.35);
      cursor: pointer;
      position: relative;
      transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .quiz-radio-pill:hover {
      background: rgba(255,255,255,0.06);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.4);
    }

    .quiz-radio-pill input {
      opacity: 0;
      position: absolute;
      inset: 0;
      margin: 0;
      cursor: pointer;
    }

    .quiz-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.7);
      background: transparent;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .quiz-dot-danger {
      border-color: rgba(255,180,180,0.9);
    }

    .quiz-radio-pill input:checked + .quiz-dot {
      background: #00ff99;
      border-color: #00ff99;
    }

    .quiz-radio-pill input:checked + .quiz-dot-danger {
      background: #ff6b6b;
      border-color: #ff6b6b;
    }

    .quiz-row-correct {
      background: rgba(0,255,135,0.18);
    }

    .quiz-row-wrong {
      background: rgba(255,120,120,0.22);
    }

    .quiz-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-top: 18px;
    }

    .quiz-hint {
      font-size: 12px;
      opacity: 0.9;
      text-align: center;
      max-width: 460px;
      display: none;
    }

    .quiz-hint.visible {
      display: block;
    }

    .wallet-quiz-card .primary-btn {
      padding: 10px 26px;
      font-size: 14px;
      border-radius: 999px;
      min-width: 180px;
    }

    @media (max-width: 640px) {
      .wallet-quiz-card {
        padding: 18px 16px;
      }
      .quiz-header-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .quiz-table-header,
      .quiz-row {
        grid-template-columns: 2.6fr 0.8fr 0.8fr;
      }
      .quiz-footer {
        align-items: stretch;
      }
      .wallet-quiz-card .primary-btn {
        width: 100%;
        text-align: center;
      }
    }
  `;
  document.head.appendChild(style);
}

// -------- MAIN LAB 4 UI --------
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Lab 4 loaded - Login options");
  await initWallet();
  injectQuizStylesIfNeeded();

  const runButton = document.querySelector(".cta-button");
  if (!runButton) {
    console.error("Run button (.cta-button) not found");
    return;
  }

  runButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    renderQuizCard(runButton);
  });
});

function renderQuizCard(runButton) {
  runButton.style.display = "none";
  const trySection = document.querySelector(".try-section");
  if (!trySection) return;

  trySection.innerHTML = `
    <div class="card wallet-quiz-card">
      <div class="quiz-table">
        <div class="quiz-table-header">
          <div class="quiz-col-label">Login option</div>
          <div class="quiz-col-ok">OK</div>
          <div class="quiz-col-scam">SCAM</div>
        </div>

        <div class="quiz-row" data-type="wallet-connect">
          <div class="quiz-option-info">
            <div class="quiz-option-title">Official Wallet Connect Modal</div>
            <p class="quiz-option-desc">
              Secure connection via WalletConnect / MetaMask popup. The dApp never sees your seed phrase or private key.
            </p>
          </div>
          <div class="quiz-choice">
            <label class="quiz-radio-pill">
              <input type="radio" name="wallet-connect" value="ok">
              <span class="quiz-dot"></span>
            </label>
          </div>
          <div class="quiz-choice">
            <label class="quiz-radio-pill">
              <input type="radio" name="wallet-connect" value="scam">
              <span class="quiz-dot quiz-dot-danger"></span>
            </label>
          </div>
        </div>

        <div class="quiz-row" data-type="seed-phrase">
          <div class="quiz-option-info">
            <div class="quiz-option-title">Seed Phrase Entry</div>
            <p class="quiz-option-desc">
              Typing your 12–24 word seed phrase directly into a website or MiniApp UI.
            </p>
          </div>
          <div class="quiz-choice">
            <label class="quiz-radio-pill">
              <input type="radio" name="seed-phrase" value="ok">
              <span class="quiz-dot"></span>
            </label>
          </div>
          <div class="quiz-choice">
            <label class="quiz-radio-pill">
              <input type="radio" name="seed-phrase" value="scam">
              <span class="quiz-dot quiz-dot-danger"></span>
            </label>
          </div>
        </div>

        <div class="quiz-row" data-type="private-key">
          <div class="quiz-option-info">
            <div class="quiz-option-title">Private Key Entry</div>
            <p class="quiz-option-desc">
              Pasting your raw private key into a form on a dApp page.
            </p>
          </div>
          <div class="quiz-choice">
            <label class="quiz-radio-pill">
              <input type="radio" name="private-key" value="ok">
              <span class="quiz-dot"></span>
            </label>
          </div>
          <div class="quiz-choice">
            <label class="quiz-radio-pill">
              <input type="radio" name="private-key" value="scam">
              <span class="quiz-dot quiz-dot-danger"></span>
            </label>
          </div>
        </div>

        <div class="quiz-row" data-type="backup-file">
          <div class="quiz-option-info">
            <div class="quiz-option-title">Backup File Upload</div>
            <p class="quiz-option-desc">
              Uploading your wallet backup / JSON file into a random site or MiniApp.
            </p>
          </div>
          <div class="quiz-choice">
            <label class="quiz-radio-pill">
              <input type="radio" name="backup-file" value="ok">
              <span class="quiz-dot"></span>
            </label>
          </div>
          <div class="quiz-choice">
            <label class="quiz-radio-pill">
              <input type="radio" name="backup-file" value="scam">
              <span class="quiz-dot quiz-dot-danger"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="quiz-footer">
        <button class="primary-btn" onclick="evaluateAnswers()">Evaluate Answers</button>
      </div>
    </div>
  `;
}

// -------- EVALUATION LOGIC --------
window.evaluateAnswers = async function () {
  const rows = document.querySelectorAll(".quiz-row");
  const answers = {};
  const hint = document.getElementById("lab4-quiz-hint");
  if (hint) hint.classList.remove("visible");

  rows.forEach((row) => {
    const type = row.dataset.type;
    const checked = row.querySelector('input[type="radio"]:checked');
    if (type && checked) answers[type] = checked.value;
    row.classList.remove("quiz-row-correct", "quiz-row-wrong");
  });

  const correctAnswers = {
    "wallet-connect": "ok",
    "seed-phrase": "scam",
    "private-key": "scam",
    "backup-file": "scam",
  };

  const allAnswered = Object.keys(correctAnswers).every((t) => answers[t]);
  if (!allAnswered) {
    showModal(
      "warning",
      "Please choose OK or SCAM for every login option before evaluating."
    );
    return;
  }

  let allCorrect = true;
  rows.forEach((row) => {
    const type = row.dataset.type;
    const correct = correctAnswers[type];
    if (answers[type] === correct) {
      row.classList.add("quiz-row-correct");
    } else {
      row.classList.add("quiz-row-wrong");
      allCorrect = false;
    }
  });

  if (!allCorrect) {
    if (hint) hint.classList.add("visible");
    showModal(
      "danger",
        "Some answers are wrong. Review each row and try again.\n\n" +
        "WalletConnect popups are the only safe way to connect a wallet. Any page asking for seed, private key or backup file is a scam."
    );
    return;
  }

  showModal(
    "success",
    "All answers correct.\nLegitimate dApps connect via WalletConnect and never ask directly for seed phrases, private keys, or backup files."
  );

  if (!currentWallet) {
    showModal(
      "warning",
      "To save your progress, connect your wallet in the MiniApp."
    );
    return;
  }

  const ok = await updateLabProgress(currentWallet);
  if (!ok) {
    showModal(
      "danger",
      "Quiz finished, but saving your Lab 4 progress failed.\nCheck the console for API details."
    );
  } else {
    showModal("success", "Lab 4 completed.\nYour progress was saved.");
  }
};
