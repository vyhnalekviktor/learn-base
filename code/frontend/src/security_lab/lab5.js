// lab5.js - Fake DEX / exchange rate SCAM (Lab 5)
import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

// ------------- WALLET INIT (same pattern as other labs) -------------
async function initWallet() {
    try {
        console.log("Lab 5 calling sdk.actions.ready...");
        await sdk.actions.ready();
        console.log("Mini app ready");

        const ethProvider = await sdk.wallet.ethProvider;
        const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
        const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

        if (!wallet) {
            console.warn(
                "Lab 5: no wallet from eth_requestAccounts - simulation will still work, but progress cannot be saved."
            );
            return;
        }

        currentWallet = wallet;
        console.log("Lab 5 connected wallet:", wallet);

        const span = document.getElementById("wallet-address");
        if (span) span.textContent = wallet;
    } catch (error) {
        console.error("Lab 5 wallet init error:", error);
    }
}

// ------------- BACKEND PROGRESS (LAB 5) -------------
async function updateLabProgress(wallet) {
    if (!wallet) {
        console.error("Lab 5: NO WALLET - cannot call API");
        return false;
    }

    try {
        const res = await fetch(`${API_BASE}/api/database/update_field`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                wallet,
                table_name: "USER_PROGRESS",
                field_name: "lab5",
                value: true,
            }),
        });

        if (!res.ok) {
            let msg = "Unknown backend error";
            try {
                const err = await res.json();
                msg = err.detail || JSON.stringify(err);
            } catch {
                // ignore
            }
            console.error("Lab 5 update_field error:", msg);
            return false;
        }

        console.log("Lab 5 PROGRESS SAVED OK");
        return true;
    } catch (e) {
        console.error("Lab 5 update_field exception:", e);
        return false;
    }
}

// ------------- MODAL SYSTEM (aligned with other labs) -------------
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
                <h3>${type === "success" ? "SUCCESS" : type === "danger" ? "DANGER WARNING" : "WARNING"}</h3>
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
    if (closeBtn) {
        closeBtn.onclick = () => modal.remove();
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ------------- EXCHANGE UI (Coinbase vs Fake SuperSwap) -------------
function showFakeDEXDemo(runButton) {
    runButton.style.display = "none";
    const trySection = document.querySelector(".try-section");
    if (!trySection) return;

    trySection.innerHTML = `
        <div class="dex-comparison-card">
            <div class="scam-header">
                <h2>Compare These DEX Offers</h2>
            </div>

            <!-- FAKE EXCHANGE BLOCK -->
            <div class="exchange-block scam-exchange">
                <div class="exchange-header">
                    <div class="exchange-title">
                        <div>
                            <div class="exchange-name">SuperSwap</div>
                        </div>
                    </div>
                    <div class="exchange-status exchange-status-warning">

                        UNVERIFIED EXCHANGE
                    </div>
                </div>

                <div class="exchange-main">
                    <div class="pair-row">
                        <div class="pair-symbol">ETH / USDC</div>
                        <div class="pair-price fake-price">2,000.00</div>
                        <div class="pair-change neutral-change">+0.2%</div>
                    </div>

                    <div class="order-type-row">
                        <button class="order-tab order-tab-active">Market</button>
                        <button class="order-tab">Limit</button>
                    </div>

                    <div class="order-form">
                        <div class="order-form-row">
                            <label>From</label>
                            <div class="order-input-wrap">
                                <input type="number" value="1" class="order-input" />
                                <span class="order-input-suffix">ETH</span>
                            </div>
                        </div>
                        <div class="order-form-row">
                            <label>To (estimated)</label>
                            <div class="order-input-wrap">
                                <input type="number" value="2000" class="order-input" readonly />
                                <span class="order-input-suffix">USDC</span>
                            </div>
                        </div>
                        <div class="order-meta">
                            <span>Price: 1 ETH = 2,000 USDC</span>
                            <span class="meta-sep">•</span>
                            <span>Fee: 0.10%</span>
                        </div>
                        <button class="compact-swap-btn scam-swap-btn">Buy ETH at 2,000 USDC</button>
                    </div>

                    <div class="token-details">
                        <div class="token-row">
                            <span class="token-label">Token</span>
                            <span class="token-value">USDC (unverified)</span>
                        </div>
                        <div class="token-row">
                            <span class="token-label">Contract</span>
                            <span class="token-value token-value-danger">0x833589...ABCD </span>
                        </div>
                        <div class="token-row">
                            <span class="token-label">Network</span>
                            <span class="token-value">Base</span>
                        </div>
                        <div class="token-row token-row-hint">
                            <span class="token-label">Where to check</span>
                            <span class="token-value">
                                Open this contract on BaseScan or another block explorer
                                and compare it with official USDC addresses from Circle docs or token lists like CoinGecko.
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- LEGIT EXCHANGE BLOCK -->
            <div class="exchange-block legit-exchange">
                <div class="exchange-header">
                    <div class="exchange-title">
                        <div class="exchange-logo exchange-logo-blue">CB</div>
                        <div>
                            <div class="exchange-name">Coinbase</div>
                        </div>
                    </div>
                    <div class="exchange-status exchange-status-ok">

                        VERIFIED EXCHANGE
                    </div>
                </div>

                <div class="exchange-main">
                    <div class="pair-row">
                        <div class="pair-symbol">ETH / USDC</div>
                        <div class="pair-price">3,000.00</div>
                        <div class="pair-change neutral-change">+0.2%</div>
                    </div>

                    <div class="order-type-row">
                        <button class="order-tab order-tab-active">Market</button>
                        <button class="order-tab">Limit</button>
                    </div>

                    <div class="order-form">
                        <div class="order-form-row">
                            <label>From</label>
                            <div class="order-input-wrap">
                                <input type="number" value="1" class="order-input" />
                                <span class="order-input-suffix">ETH</span>
                            </div>
                        </div>
                        <div class="order-form-row">
                            <label>To (estimated)</label>
                            <div class="order-input-wrap">
                                <input type="number" value="3000" class="order-input" readonly />
                                <span class="order-input-suffix">USDC</span>
                            </div>
                        </div>
                        <div class="order-meta">
                            <span>Price: 1 ETH = 3,000 USDC</span>
                            <span class="meta-sep">•</span>
                            <span>Fee: 0.10%</span>
                        </div>
                        <button class="compact-swap-btn" disabled>Trusted market rate</button>
                    </div>

                    <div class="token-details">
                        <div class="token-row">
                            <span class="token-label">Token</span>
                            <span class="token-value">USDC</span>
                        </div>
                        <div class="token-row">
                            <span class="token-label">Contract</span>
                            <span class="token-value">
                                0x833589...2913 (verified)
                            </span>
                        </div>
                        <div class="token-row">
                            <span class="token-label">Network</span>
                            <span class="token-value">Base</span>
                        </div>
                        <div class="token-row token-row-hint">
                            <span class="token-label">Where to check</span>
                            <span class="token-value">
                                You can verify this contract on BaseScan and
                                cross-check it with official USDC contract lists (Circle docs, CoinGecko, CoinMarketCap).
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const scamSwapBtn = document.querySelector(".scam-swap-btn");
    if (scamSwapBtn) {
        scamSwapBtn.addEventListener("click", () => {
            showModal(
                "danger",
                "SCAM DETECTED!\n\n" +
                    "SuperSwap UI tries to look like a real exchange, but:\n" +
                    "- ETH is 33% cheaper (2,000 vs 3,000 USDC).\n" +
                    "- USDC contract is fake / unverified and does not match official USDC.\n" +
                    "- Brand has no reputation.\n\n" +
                    "Lesson: When the rate is too good, always verify the token contract in a block explorer and the exchange reputation before trading."
            );
        });
    }
}

// ------------- ENTRYPOINT -------------
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Lab 5 DOMContentLoaded");
    await initWallet(); // only needed to be able to save progress

    const scamButton = document.querySelector(".scam-warning-btn");
    const runButton = document.querySelector(".cta-button");

    if (runButton) {
        runButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showFakeDEXDemo(runButton);
        });
    }

    if (scamButton) {
        scamButton.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!currentWallet) {
                showModal("warning", "Please connect your wallet first!");
                return;
            }

            const success = await updateLabProgress(currentWallet);

            if (success) {
                showModal(
                    "success",
                    "CONGRATS! Lab 5 COMPLETE!\n\n" +
                        "You identified the Fake DEX / exchange rate scam.\n" +
                        "Too good rates are a strong red flag.\n" +
                        "Always verify token contracts in a block explorer and check official lists from the issuer."
                );
            } else {
                showModal(
                    "danger",
                    "Lab 5 finished, but saving your progress failed. Check console for API details."
                );
            }
        });
    }
});
