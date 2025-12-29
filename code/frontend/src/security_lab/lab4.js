import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

// === 1. WALLET INIT ===
async function initWallet() {
  try {
    await sdk.actions.ready();
    // Cache check
    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            if (cache.wallet) currentWallet = cache.wallet;
        } catch (e) {}
    }
    // Session check
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
  } catch (err) {}
}

function updateUI(wallet) {
    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;
}

async function updateLabProgress(wallet) {
  if (!wallet) return false;
  if (window.BaseCampTheme) window.BaseCampTheme.updateLocalProgress('lab4', true);
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, table_name: "USER_PROGRESS", field_name: "lab4", value: true }),
  });
  return res.ok;
}

// === 2. STYLES (Ultra-Stable Layout) ===
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* vynutíme box-sizing pro všechno uvnitř */
    .quiz-card * {
        box-sizing: border-box;
    }

    /* QUIZ CONTAINER */
    .quiz-card {
        background: #1e293b;
        padding: 24px;
        border-radius: 20px;
        margin: 20px auto;
        color: white;
        border: 1px solid #334155;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);

        /* KLÍČOVÉ PRO ROZTAŽENÍ: */
        width: 100%;           /* Zabere všechno místo */
        max-width: 480px;      /* Ale ne víc než 480px */
        display: block;        /* Ujistíme se, že je to blok */
    }

    /* ROWS */
    .quiz-row {
        padding: 20px 0;
        border-bottom: 1px solid #334155;
        width: 100%;
    }
    .quiz-row:last-child { border-bottom: none; }

    /* QUESTION TEXT */
    .quiz-question-text {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 15px;
        display: block;
        color: #f8fafc;
        width: 100%;
    }

    /* BUTTON GRID */
    .quiz-options {
        display: grid;
        grid-template-columns: 1fr 1fr; /* 50% - 50% */
        gap: 12px;
        width: 100%;
    }

    /* OPTION BUTTONS */
    .option-label {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 14px 10px;
        background: #0f172a;
        border: 2px solid #334155;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 700;
        font-size: 15px;
        color: #94a3b8;
        transition: all 0.2s ease;
        text-align: center;
        position: relative;
        width: 100%; /* Roztáhne se do plné šířky buňky gridu */
        user-select: none;
    }

    /* HIDE RADIO */
    .option-label input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }

    /* CHECKED STATES */
    .option-label:has(input[value="safe"]:checked) {
        background: rgba(34, 197, 94, 0.15);
        border-color: #22c55e;
        color: #22c55e;
        box-shadow: 0 0 15px rgba(34, 197, 94, 0.1);
    }

    .option-label:has(input[value="scam"]:checked) {
        background: rgba(239, 68, 68, 0.15);
        border-color: #ef4444;
        color: #ef4444;
        box-shadow: 0 0 15px rgba(239, 68, 68, 0.1);
    }

    /* EXPLANATION BOX */
    .quiz-explanation {
        font-size: 14px;
        color: #cbd5e1;
        margin-top: 15px;
        display: none;
        padding: 15px;
        background: #0f172a;
        border-radius: 10px;
        line-height: 1.5;
        width: 100%;
        word-break: break-word; /* Zabrání přetečení dlouhých slov */
    }

    .quiz-row.correct .quiz-explanation { display: block; border-left: 4px solid #22c55e; }
    .quiz-row.wrong .quiz-explanation { display: block; border-left: 4px solid #ef4444; }

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
        text-align: center; font-family: -apple-system, sans-serif;
    }
    .modal-header { padding: 24px 24px 10px; }
    .modal-title { font-size: 20px; font-weight: 700; color: white; margin: 0; }
    .modal-body { padding: 10px 24px 24px; color: #cbd5e1; font-size: 15px; line-height: 1.5; }
    .modal-footer { padding: 16px; background: #1e293b; border-top: 1px solid #334155; }
    .modal-btn {
        background: #334155; color: white; border: none; padding: 12px 0; width: 100%;
        border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 16px;
    }

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

const QUESTIONS = [
    {
        id: 'wallet-connect',
        text: 'Website asks to "Connect Wallet"',
        correct: 'safe',
        explain: "✅ Correct! Connecting wallet (read-only) is standard. Just verify what you sign afterwards."
    },
    {
        id: 'seed-phrase',
        text: 'Support asks for "Seed Phrase"',
        correct: 'scam',
        explain: "🛑 Correct! Support will NEVER ask for your seed phrase. This gives them full access to steal funds."
    },
    {
        id: 'private-key',
        text: 'App asks for "Private Key" to fix bug',
        correct: 'scam',
        explain: "🛑 Correct! Private keys should never leave your wallet. Legitimate dApps don't need them."
    },
    {
        id: 'backup-file',
        text: 'Site asks to upload "Backup File"',
        correct: 'scam',
        explain: "🛑 Correct! Your Backup File (Keystore) contains your private keys. Never upload it to unknown sites."
    }
];

// === 3. MAIN LISTENER ===
document.addEventListener("DOMContentLoaded", function () {
  injectStyles();

  const runButton = document.querySelector(".cta-button");
  if (runButton) {
    runButton.addEventListener("click", (e) => {
      e.preventDefault();
      renderQuizCard(runButton);
    });
  }

  initWallet();
});

function renderQuizCard(runButton) {
  runButton.style.display = "none";
  const trySection = document.querySelector(".try-section");
  if (!trySection) return;

  const rowsHtml = QUESTIONS.map(q => `
    <div class="quiz-row" data-id="${q.id}">
        <span class="quiz-question-text">${q.text}</span>
        <div class="quiz-options">
            <label class="option-label">
                <input type="radio" name="${q.id}" value="safe">
                SAFE
            </label>
            <label class="option-label">
                <input type="radio" name="${q.id}" value="scam">
                SCAM
            </label>
        </div>
        <div class="quiz-explanation"></div>
    </div>
  `).join('');

  trySection.innerHTML = `
    <div class="quiz-card">
      <h3 style="margin:0 0 20px 0; color:#60a5fa; text-align:center;">Safe or Scam?</h3>
      <div class="quiz-table">${rowsHtml}</div>
      <button class="primary-btn" onclick="evaluateAnswers()" style="margin-top:25px; width:100%; background:#0052ff; padding:14px; border-radius:12px; border:none; color:white; font-weight:bold; cursor:pointer; font-size:16px;">Evaluate Answers</button>
    </div>
  `;
}

window.evaluateAnswers = async function () {
  const rows = document.querySelectorAll(".quiz-row");
  let isAllCorrect = true;
  let allAnswered = true;

  rows.forEach((row) => {
    const checked = row.querySelector('input[type="radio"]:checked');
    if (!checked) allAnswered = false;
  });

  if (!allAnswered) {
    showModal("warning", "Please answer all questions before submitting.");
    return;
  }

  rows.forEach((row) => {
    const id = row.dataset.id;
    const checked = row.querySelector('input[type="radio"]:checked');
    const explanationEl = row.querySelector('.quiz-explanation');
    const questionData = QUESTIONS.find(q => q.id === id);

    row.classList.remove("correct", "wrong");

    const val = checked.value;
    if (val === questionData.correct) {
        row.classList.add("correct");
        explanationEl.innerHTML = questionData.explain;
    } else {
        row.classList.add("wrong");
        explanationEl.innerHTML = "Incorrect. <br>" + questionData.explain.replace("Correct!", "").replace("Correct!", "");
        isAllCorrect = false;
    }
  });

  if (isAllCorrect) {
    if (currentWallet) updateLabProgress(currentWallet).catch(err => console.error("Save failed:", err));
    showModal("success", "CONGRATS! Lab 4 COMPLETE!<br> You have mastered logins!");
  } else {
    showModal("danger", "Some answers are wrong.<br><br>Please review the explanations below and try to understand why.");
  }
};

function showModal(type, msg) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';

    let title = 'NOTICE';
    let modalClass = 'modal-warning';

    if (type === 'success') { title = 'GREAT JOB!'; modalClass = 'modal-success'; }
    else if (type === 'danger') { title = 'WATCH OUT!'; modalClass = 'modal-danger'; }

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