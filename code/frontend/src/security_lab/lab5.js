import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

// ZMĚNA: Cache logika
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

  } catch (error) {
    console.error("Lab 5 wallet init error:", error);
  }
}

function updateUI(wallet) {
    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;
}

async function updateLabProgress(wallet) {
    if (!wallet) return false;
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
    return res.ok;
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
}

function showFakeDEXDemo(runButton) {
    runButton.style.display = "none";
    const trySection = document.querySelector(".try-section");
    if (!trySection) return;

    trySection.innerHTML = `
        <div class="dex-comparison-card">
            <div class="scam-header"><h2>Compare DEX Offers</h2></div>
            <div class="exchange-block scam-exchange">
                <div class="exchange-header"><div class="exchange-name">SuperSwap</div><div class="exchange-status exchange-status-warning">UNVERIFIED</div></div>
                <div class="exchange-main">
                    <div class="pair-price fake-price">1 ETH = 2,000 USDC (Cheap!)</div>
                    <button class="compact-swap-btn scam-swap-btn">Buy ETH</button>
                </div>
            </div>
            <div class="exchange-block legit-exchange">
                <div class="exchange-header"><div class="exchange-name">Coinbase</div><div class="exchange-status exchange-status-ok">VERIFIED</div></div>
                <div class="exchange-main">
                    <div class="pair-price">1 ETH = 3,000 USDC (Real price)</div>
                    <button class="compact-swap-btn" disabled>Market Rate</button>
                </div>
            </div>
        </div>
    `;

    const scamSwapBtn = document.querySelector(".scam-swap-btn");
    if (scamSwapBtn) {
        scamSwapBtn.addEventListener("click", () => {
            showModal("danger", "SCAM DETECTED! Price is too good to be true.");
        });
    }
}

// ZMĚNA: DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Lab 5 loaded");
    await initWallet();

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
                showModal("success", "CONGRATS! Lab 5 COMPLETE!");
            } else {
                showModal("danger", "Failed to save progress.");
            }
        });
    }
});