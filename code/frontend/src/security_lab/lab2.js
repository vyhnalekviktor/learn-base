import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

const FAKE_TOKEN = {
  name: "Honey Token",
  symbol: "HONEY",
  apy: "1250%",
  liquidity: "$12,689",
  marketCap: "$678,943",
  address: "0x1234567890abcdef1234567890abcdef12345678"
};

let userHoneyBalance = 0;

// === WALLET INIT (OPTIMIZED) ===
async function initWallet() {
  try {
    await sdk.actions.ready();

    // 1. Try cache from common.js (fastest)
    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            if (cache.wallet) {
                currentWallet = cache.wallet;
                updateUI(currentWallet);
                return;
            }
        } catch (e) {
            // Timeout, proceed to fallback
        }
    }

    // 2. Try sessionStorage fallback
    const sessionWallet = sessionStorage.getItem('cached_wallet');
    if (sessionWallet) {
        currentWallet = sessionWallet;
        updateUI(currentWallet);
        return;
    }

    // 3. Fallback: SDK request (slowest)
    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    currentWallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (currentWallet) {
        sessionStorage.setItem('cached_wallet', currentWallet);
        updateUI(currentWallet);
    }

  } catch (error) {
    console.error("Lab 2 wallet init error:", error);
  }
}

function updateUI(wallet) {
    const span = document.getElementById("wallet-address");
    if (span) span.textContent = `${wallet.slice(0,6)}...${wallet.slice(-4)}`;
}

// === BACKEND PROGRESS ===
async function updateLabProgress(wallet) {
  if (!wallet) return false;

  const res = await fetch(`${API_BASE}/api/database/update_field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet,
      table_name: "USER_PROGRESS",
      field_name: "lab2",
      value: true
    })
  });

  if (!res.ok) return false;
  return true;
}

// === DOM READY ===
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Lab 2 loaded");
  await initWallet();

  const scamButton = document.querySelector(".scam-warning-btn");
  const runButton = document.querySelector(".cta-button");

  if (scamButton) {
      scamButton.addEventListener("click", async function (e) {
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
            "CONGRATS! Lab 2 COMPLETE!\n\n" +
            "1250% APY is a red flag. Always verify token contracts."
          );
        } else {
          showModal("danger", "Failed to save progress.");
        }
      });
  }

  if (runButton) {
    runButton.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      showHoneypotDemo();
    });
  }

  function showHoneypotDemo() {
    runButton.style.display = "none";
    const trySection = document.querySelector(".try-section");
    if (!trySection) return;

    trySection.classList.add("scam-active");
    trySection.innerHTML = `
      <div class="honeypot-dapp">
        <div class="scam-header">
          <h2>${FAKE_TOKEN.name.toUpperCase()}</h2>
          <p><strong>${FAKE_TOKEN.apy} APY</strong> on new Base token!</p>
          <p>Liquidity: ${FAKE_TOKEN.liquidity} &nbsp;&nbsp; MC: ${FAKE_TOKEN.marketCap}</p>
          <h3>Stake for insane yields!</h3>
        </div>
        <div class="swap-section">
          <div class="input-group">
            <input type="number" id="buyAmount" placeholder="0.1 ETH" value="0.1" class="swap-input" />
            <button class="scam-claim-btn swap-btn buy-btn compact-swap-btn" onclick="simulateBuy()">BUY + STAKE</button>
          </div>
          <div class="input-group" style="margin-top: 10px;">
            <input type="number" id="sellAmount" placeholder="1000 HONEY" value="1000" class="swap-input" />
            <button class="scam-claim-btn swap-btn sell-btn compact-swap-btn" onclick="simulateSell()">SELL HONEY</button>
          </div>
          <p id="honey-balance" style="margin-top: 10px; font-size: 14px; opacity: 0.9;">Your HONEY balance: 0</p>
        </div>
        <div id="transaction-result" class="transaction-result" style="margin-top: 20px;"></div>
      </div>
    `;
    window.simulateBuy = simulateBuy;
    window.simulateSell = simulateSell;
  }
});

// === SIMULATION LOGIC ===
function updateHoneyBalanceText() {
  const el = document.getElementById("honey-balance");
  if (el) el.textContent = "Your HONEY balance: " + userHoneyBalance.toLocaleString();
}

function simulateBuy() {
  const amountInput = document.getElementById("buyAmount");
  const amountEth = amountInput ? Number(amountInput.value) : 0;
  if (!amountEth || amountEth <= 0) {
    showModal("warning", "Enter valid ETH amount.");
    return;
  }
  const receivedHoney = Math.round(amountEth * 120000);
  userHoneyBalance += receivedHoney;
  updateHoneyBalanceText();
  showModal("success", `BUY simulation OK! (+${receivedHoney.toLocaleString()} HONEY)`);
}

function simulateSell() {
  if (userHoneyBalance <= 0) {
    showModal("warning", "You have no HONEY to sell. Buy first.");
    return;
  }
  showModal(
    "danger",
    "HONEYPOT CONFIRMED!<br>Token BUY works, but SELL is blocked/taxed.<br>Always check 'Honeypot detector' tools."
  );
}

// === MODAL SYSTEM ===
function showModal(type, message) {
  const oldModal = document.querySelector(".custom-modal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.className = `custom-modal modal-${type}`;
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-${type}-header"><h3>${type === "success" ? "SUCCESS" : type === "danger" ? "DANGER" : "WARNING"}</h3></div>
      <div class="modal-body" style="color: black;"><p>${message.replace(/\n/g, "<br>")}</p></div>
      <div class="modal-footer"><button class="modal-close-btn">OK</button></div>
    </div>
  `;
  document.body.appendChild(modal);
  const closeBtn = modal.querySelector(".modal-close-btn");
  if(closeBtn) closeBtn.onclick = () => modal.remove();
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

window.openLink = function() {
  sdk.actions.openUrl(`https://honeypot.is/base`);
};