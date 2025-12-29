import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

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
    if (span) span.textContent = wallet;
}

async function updateLabProgress(wallet) {
    if (!wallet) return false;
    if (window.BaseCampTheme) window.BaseCampTheme.updateLocalProgress('lab5', true);
    const res = await fetch(`${API_BASE}/api/database/update_field`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, table_name: "USER_PROGRESS", field_name: "lab5", value: true }),
    });
    return res.ok;
}

// === 2. STYLES ===
function injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* LAYOUT */
        .dex-wrapper { display: flex; flex-direction: column; gap: 30px; max-width: 480px; margin: 0 auto; }

        /* CARD STYLES */
        .dex-card {
            background: #0f172a; border-radius: 20px; padding: 20px;
            border: 1px solid #334155; position: relative;
            font-family: -apple-system, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .dex-scam { border-color: #ef4444; }
        .dex-real { border-color: #334155; opacity: 0.9; }

        /* HEADER */
        .dex-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .dex-brand { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; color: white; }
        .dex-logo { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .logo-scam { background: #ef4444; color: white; }
        .logo-real { background: #334155; color: white; }

        .status-badge { font-size: 10px; padding: 4px 8px; border-radius: 6px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-risk { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .badge-verified { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }

        /* CHART AREA */
        .dex-chart {
            height: 100px; margin-bottom: 15px; border-radius: 12px;
            background: linear-gradient(180deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0) 100%);
            border: 1px solid #1e293b; position: relative; overflow: hidden;
        }
        .chart-svg { width: 100%; height: 100%; display: block; }
        .chart-info { position: absolute; top: 10px; left: 12px; }
        .chart-price { font-size: 20px; font-weight: 700; color: white; }
        .chart-change { font-size: 12px; font-weight: 500; }
        .change-down { color: #ef4444; }
        .change-up { color: #22c55e; }
        .change-neutral { color: #94a3b8; }

        /* INPUTS */
        .swap-box { background: #1e293b; border-radius: 16px; padding: 16px; margin-bottom: 4px; border: 1px solid transparent; transition: border-color 0.2s; }
        .dex-scam .swap-box:hover { border-color: rgba(239,68,68,0.3); }

        .box-label { color: #94a3b8; font-size: 13px; margin-bottom: 8px; display: flex; justify-content: space-between; }
        .box-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }

        .amount-input {
            background: transparent; border: none; color: white; font-size: 24px; font-weight: 500;
            width: 100%; outline: none; cursor: default;
        }

        .token-pill {
            background: #0f172a; padding: 6px 12px; border-radius: 20px;
            display: flex; align-items: center; gap: 8px; font-weight: 600; color: white; border: 1px solid #334155;
            min-width: 110px; justify-content: center;
        }

        .token-icon { width: 20px; height: 20px; border-radius: 50%; background: #ccc; }
        .icon-usdc { background: #2775ca; }
        .icon-eth { background: #627eea; }
        .icon-unknown { background: #ef4444; display:flex; align-items:center; justify-content:center; font-size:12px; }

        .contract-warning { font-size: 10px; color: #ef4444; margin-top: 4px; text-align: right; display: block; font-weight: bold; }

        .arrow-divider { text-align: center; margin: -14px 0; z-index: 10; position: relative; }
        .arrow-circle { background: #1e293b; border: 4px solid #0f172a; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; margin: 0 auto; }

        /* BUTTONS */
        .action-btn { width: 100%; padding: 16px; border-radius: 16px; font-weight: 700; font-size: 18px; border: none; margin-top: 16px; cursor: pointer; transition: transform 0.1s; }
        .btn-swap { background: #ef4444; color: white; box-shadow: 0 4px 15px rgba(239,68,68,0.3); }
        .btn-swap:active { transform: scale(0.98); }
        .btn-connect { background: #3b82f6; color: white; opacity: 0.5; cursor: not-allowed; }

        /* COMPARISON LABEL */
        .vs-label { text-align: center; color: #64748b; font-weight: bold; font-size: 14px; margin: -10px 0; text-transform: uppercase; letter-spacing: 2px; }

        /* --- UNIFIED MODAL STYLES (MATCHING LAB 4) --- */
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

// === 3. UI RENDER ===
function showFakeDEXDemo(runButton) {
    runButton.style.display = "none";
    const trySection = document.querySelector(".try-section");
    if (!trySection) return;

    trySection.innerHTML = `
        <div class="dex-wrapper">

            <div class="dex-card dex-scam">
                <div class="dex-header">
                    <div class="dex-brand">
                        <div class="dex-logo logo-scam">⚡</div>
                        FlashDex
                    </div>
                    <div class="status-badge badge-risk">Unverified App</div>
                </div>

                <div class="dex-chart">
                    <div class="chart-info">
                        <div class="chart-price">$2,000.00</div>
                    </div>
                    <svg class="chart-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,5 L10,5 L20,8 L30,5 L40,10 L50,30 L60,25 L70,35 L80,32 L90,38 L100,35"
                              fill="none" stroke="#ef4444" stroke-width="2" vector-effect="non-scaling-stroke"/>
                        <path d="M0,5 L10,5 L20,8 L30,5 L40,10 L50,30 L60,25 L70,35 L80,32 L90,38 L100,35 L100,50 L0,50 Z"
                              fill="rgba(239, 68, 68, 0.1)" stroke="none"/>
                    </svg>
                </div>

                <div class="swap-box">
                    <div class="box-label">
                        <span>You pay</span>
                        <span>Balance: 5,000</span>
                    </div>
                    <div class="box-row">
                        <input type="text" value="2,000" class="amount-input" readonly>
                        <div class="token-pill">
                            <div class="token-icon icon-unknown">?</div>
                            USDC
                        </div>
                    </div>
                    <span class="contract-warning">⚠️ Contract Unverified</span>
                </div>

                <div class="arrow-divider"><div class="arrow-circle">⬇</div></div>

                <div class="swap-box">
                    <div class="box-label">
                        <span>You receive</span>
                    </div>
                    <div class="box-row">
                        <input type="text" value="1.0" class="amount-input" readonly style="color:#22c55e">
                        <div class="token-pill">
                            <div class="token-icon icon-eth"></div>
                            ETH
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; font-size:12px; color:#94a3b8; margin-top:10px; padding:0 5px;">
                    <span>Rate</span>
                    <span style="color:#ef4444; font-weight:bold;">1 ETH = 2,000 USDC</span>
                </div>

                <button class="action-btn btn-swap" id="scam-btn">SWAP NOW</button>
            </div>

            <div class="vs-label">vs</div>

            <div class="dex-card dex-real">
                <div class="dex-header">
                    <div class="dex-brand">
                        <div class="dex-logo logo-real">🦄</div>
                        Uniswap
                    </div>
                    <div class="status-badge badge-verified">Verified</div>
                </div>

                <div class="dex-chart">
                    <div class="chart-info">
                        <div class="chart-price">$3,200.00</div>
                        <div class="chart-change change-neutral">ETH Market Price</div>
                    </div>
                    <svg class="chart-svg" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,20 L15,18 L30,22 L45,20 L60,21 L75,19 L90,20 L100,20"
                              fill="none" stroke="#64748b" stroke-width="2" vector-effect="non-scaling-stroke"/>
                        <path d="M0,20 L15,18 L30,22 L45,20 L60,21 L75,19 L90,20 L100,20 L100,50 L0,50 Z"
                              fill="rgba(100, 116, 139, 0.1)" stroke="none"/>
                    </svg>
                </div>

                <div class="swap-box" style="opacity:0.6">
                    <div class="box-label">You pay</div>
                    <div class="box-row">
                        <input type="text" value="3,200" class="amount-input" disabled>
                        <div class="token-pill">
                            <div class="token-icon icon-usdc"></div>
                            USDC
                        </div>
                    </div>
                </div>

                <div class="arrow-divider"><div class="arrow-circle">⬇</div></div>

                <div class="swap-box" style="opacity:0.6">
                    <div class="box-label">You receive</div>
                    <div class="box-row">
                        <input type="text" value="1.0" class="amount-input" disabled>
                        <div class="token-pill">
                            <div class="token-icon icon-eth"></div>
                            ETH
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; font-size:12px; color:#94a3b8; margin-top:10px; padding:0 5px;">
                    <span>Market Rate</span>
                    <span>1 ETH = 3,200 USDC</span>
                </div>

                <button class="action-btn btn-connect" disabled>Connect Wallet</button>
            </div>

        </div>
    `;

    document.getElementById("scam-btn").addEventListener("click", () => {
        showModal("danger",
            "<strong>1. Price Trap:</strong> The chart shows a fake 'crash' to $2,000. Real market is $3,200.<br><br>" +
            "<strong>2. Fake Token:</strong> The 'USDC' contract is unverified. You might be approving a malicious contract.<br><br>" +
            "Always check the URL and Contract Address."
        );
    });
}

// === INIT ===
document.addEventListener("DOMContentLoaded", function () {
    injectStyles();

    const scamButton = document.querySelector(".scam-warning-btn");
    const runButton = document.querySelector(".cta-button");

    if (runButton) {
        runButton.addEventListener("click", (e) => {
            e.preventDefault();
            showFakeDEXDemo(runButton);
        });
    }
    initWallet();

    if (scamButton) {
        scamButton.addEventListener("click", async (e) => {
            e.preventDefault();
            if (!currentWallet) {
                showModal("warning", "Please connect your wallet first!");
                return;
            }
            updateLabProgress(currentWallet).catch(err => console.error("Save failed:", err));
            showModal("success", "CONGRATS! Lab 5 COMPLETE!<br>You identified the <strong>Fake Price</strong> and <strong>Unverified Contract</strong>.");
        });
    }
});

// === MODAL UTILS (Unified with Lab 4) ===
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