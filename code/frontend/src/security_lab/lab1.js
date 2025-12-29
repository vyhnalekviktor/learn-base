import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

// === 1. WALLET INIT ===
async function initWallet() {
  try {
    console.log("Lab 1 init...");
    await sdk.actions.ready();

    // 1. Zkus cache z common.js (nejrychlejší)
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

    // 2. Zkus sessionStorage (záloha)
    const sessionWallet = sessionStorage.getItem('cached_wallet');
    if (sessionWallet) {
        currentWallet = sessionWallet;
        updateUI(currentWallet);
        return;
    }

    // 3. Fallback: SDK request
    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: "eth_requestAccounts" });

    currentWallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (currentWallet) {
        sessionStorage.setItem('cached_wallet', currentWallet);
        updateUI(currentWallet);
    }
  } catch (error) {
    console.error("Lab 1 init error:", error);
  }
}

function updateUI(wallet) {
    const span = document.getElementById("wallet-address");
    if (span) span.textContent = `${wallet.slice(0,6)}...${wallet.slice(-4)}`;
}

async function updateLabProgress(wallet) {
  if (!wallet) return false;
  if (window.BaseCampTheme) window.BaseCampTheme.updateLocalProgress('lab1', true);
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet,
      table_name: "USER_PROGRESS",
      field_name: "lab1",
      value: true,
    }),
  });
  return res.ok;
}

// === 2. STYLES (Sjednoceno s Lab 2 - 5) ===
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

// === 3. MAIN LOGIC ===
document.addEventListener('DOMContentLoaded', function() {
    // 1. Aktivujeme styly a UI hned
    injectStyles();

    const scamButton = document.querySelector('.scam-warning-btn');
    const runButton = document.querySelector('.cta-button');

    if (scamButton) {
        scamButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (!currentWallet) {
                showModal('warning', 'Please connect your wallet first!');
                return;
            }

            // Fire and forget progress update
            updateLabProgress(currentWallet).catch(err => console.error("Save failed:", err));
            showModal('success', "Lab 1 COMPLETE!<br>Never share seed phrase or private key with anybody!");
        });
    }

    if (runButton) {
        runButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showScamDemo();
        });
    }

    // 2. Načteme wallet na pozadí
    initWallet();

    // --- Demo Logic ---
    function showScamDemo() {
        runButton.style.display = 'none';
        const trySection = document.querySelector('.try-section');
        if (!trySection) return;

        trySection.innerHTML = `
            <div class="scam-header">
                <h2>Claim BASE Airdrop</h2>
                <p>Get 500 BASE tokens FREE!</p>
            </div>
            <div class="fake-wallet-section">
                <button class="connect-btn" onclick="showSeedInput()">Connect Wallet</button>
            </div>
            <div class="seed-input-section" id="seedSection" style="display: none;">
                <h4>Enter your 12/24 word seed phrase to claim</h4>
                <textarea class="seed-textarea" placeholder="word1 word2 word3 ... word24" id="seedInput"></textarea>
                <button class="scam-claim-btn" onclick="showScamAlert()" id="claimBtn">Claim 500 BASE</button>
            </div>
        `;
        trySection.classList.add('scam-active');

        setTimeout(() => {
            const seedInput = document.getElementById('seedInput');
            if(seedInput) {
                seedInput.addEventListener('input', function() {
                    if (this.value.trim().length > 0) {
                        showModal('danger', 'NEVER enter your seed phrase anywhere!<br>Your wallet could be DRAINED instantly!');
                        this.value = '';
                    }
                });
            }
        }, 100);
    }

    window.showSeedInput = function() {
        document.getElementById('seedSection').style.display = 'block';
        document.querySelector('.fake-wallet-section').style.display = 'none';
    };

    window.showScamAlert = function() {
        const seedValue = document.getElementById('seedInput').value.trim();
        if (!seedValue) {
            showModal('warning', 'Please enter your seed phrase to claim 500 BASE tokens!');
            return;
        }
        showModal('success', 'LAB 1 COMPLETE!<br><br>You understood the SCAM mechanics perfectly!<br><br>Key lesson: NEVER enter seed phrase anywhere!');
    };
});

// === MODAL UTILS (Sjednocené) ===
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