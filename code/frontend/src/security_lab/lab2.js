import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

let currentWallet = null;

// Fake token data - Honeypot SCAM
const FAKE_TOKEN = {
  name: "Honey Token",
  symbol: "HONEY",
  apy: "1250%",
  liquidity: "$12,689",
  marketCap: "$678,943",
  address: "0x1234567890abcdef1234567890abcdef12345678"
};

// Demo balance – kolik HONEY má user „nakoupeno“ v rámci labu
let userHoneyBalance = 0;

// ---------------- WALLET INIT ----------------

async function initWallet() {
  try {
    console.log("Page loaded, calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("BaseCamp mini app is ready!");

    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({
      method: "eth_requestAccounts"
    });

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;
    if (!wallet) {
      console.warn("Wallet address not found from ethProvider.request()");
      return;
    }

    console.log("Connected wallet from SDK:", wallet);
    currentWallet = wallet;

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;
  } catch (error) {
    console.error("Error during MiniApp wallet init:", error);
  }
}

// --------------- BACKEND PROGRESS ----------------

async function updateLabProgress(wallet) {
  if (!wallet) {
    console.error("NO WALLET - cannot call API");
    return false;
  }

  console.log("Calling API with wallet:", wallet);

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

  console.log("API response status:", res.status);

  if (!res.ok) {
    let msg = "Unknown backend error";
    try {
      const err = await res.json();
      msg = err.detail || JSON.stringify(err);
    } catch (_) {}
    console.error("update_field error:", msg);
    return false;
  }

  console.log("API call SUCCESS");
  return true;
}

// --------------- DOM READY ----------------

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Lab 2 loaded - Honeypot Token SCAM (High APY)");

  await initWallet();

  const scamButton = document.querySelector(".scam-warning-btn");
  const runButton = document.querySelector(".cta-button");

  if (!scamButton) {
    console.error("SCAM button (.scam-warning-btn) not found");
    return;
  }

  // 1) SCAM button – uložit progress
  scamButton.addEventListener("click", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    console.log("SCAM button clicked, currentWallet:", currentWallet);

    if (!currentWallet) {
      showModal("warning", "Please connect your wallet first!");
      return;
    }

    const success = await updateLabProgress(currentWallet);
    if (success) {
      showModal(
        "success",
        "CONGRATS! You identified the HONEYPOT SCAM!<br>" +
          "1250% APY je silný red flag.<br>" +
          "Token lze často koupit, ale nejde ho prodat nebo je extrémní skryté fee.<br>" +
          "Vždy ověř možnost výstupu z pozice v exploreru a simulaci swapu."
      );
    } else {
      showModal(
        "danger",
        "Failed to save progress. Check console for details."
      );
    }
  });

  // 2) Spustit lab – honeypot DApp demo
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

    // stejné centrování jako u lab 1
    trySection.classList.add("scam-active");

    trySection.innerHTML = `
      <div class="honeypot-dapp">
        <div class="scam-header">
          <h2>${FAKE_TOKEN.name.toUpperCase()}</h2>
          <p><strong>${FAKE_TOKEN.apy} APY</strong> on new Base token!</p>
          <p>
            Liquidity: ${FAKE_TOKEN.liquidity}
            &nbsp;&nbsp; MC: ${FAKE_TOKEN.marketCap}
          </p>
          <h3>Stake for insane yields!</h3>
        </div>

        <div class="swap-section">
          <div class="input-group">
            <input
              type="number"
              id="buyAmount"
              placeholder="0.1 ETH"
              value="0.1"
              class="swap-input"
            />
            <button class="scam-claim-btn swap-btn buy-btn compact-swap-btn" onclick="simulateBuy()">
              BUY + STAKE
            </button>
          </div>

          <div class="input-group" style="margin-top: 10px;">
            <input
              type="number"
              id="sellAmount"
              placeholder="1000 HONEY"
              value="1000"
              class="swap-input"
            />
            <button class="scam-claim-btn swap-btn sell-btn compact-swap-btn" onclick="simulateSell()">
              SELL HONEY
            </button>
          </div>

          <p id="honey-balance" style="margin-top: 10px; font-size: 14px; opacity: 0.9;">
            Your HONEY balance in this demo: 0
          </p>
        </div>

        <!-- Honeypot scanner UI podobné honeypot.is + odkaz na real tool -->
        <h3 style="margin-top: 25px; margin-bottom: 8px; font-size:16px; font-weight:700;">
          Honeypot detector:
        </h3>
        <div class="seed-input-section warning-box" style="margin-top: 0; padding: 0; text-align:left; font-size:13px; overflow:hidden;">

          <div style="display:flex; width:100%;">

            <!-- Levý sloupec jako na honeypot.is -->
            <div style="
              background:#2d3b3f;
              color:#ff6060;
              font-weight:800;
              font-size:26px;
              letter-spacing:3px;
              writing-mode:vertical-rl;
              text-orientation:mixed;
              text-align:center;
              padding:22px 10px;
              min-width:70px;
              display:flex;
              align-items:center;
              justify-content:center;
            ">
              FAILED
            </div>

            <!-- Pravý panel s výsledky simulace -->
            <div style="flex:1; background:#111927; color:#e8f0ff; padding:18px 18px 14px 18px;">

              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:10px;">
                <div>
                  <div style="font-size:18px; font-weight:700;">${FAKE_TOKEN.name}</div>
                  <div style="opacity:0.8; font-size:13px;">${FAKE_TOKEN.symbol}</div>
                  <div style="margin-top:8px; font-size:12px; opacity:0.8;">
                    ADDRESS
                  </div>
                  <div style="font-family:monospace; font-size:11px; word-break:break-all;">
                    ${FAKE_TOKEN.address}
                  </div>
                </div>
                <div style="text-align:right; font-size:13px;">
                  <div style="font-weight:700; color:#ff9f43;">HIGH RISK OF HONEYPOT</div>
                  <div style="opacity:0.8; font-size:11px; margin-top:2px;">
                    This can always change – do your own due diligence.
                  </div>
                </div>
              </div>

              <div style="margin-top:10px; font-size:12px; display:flex; flex-wrap:wrap; gap:24px;">
                <div>
                  <div style="opacity:0.8;">BUY TAX</div>
                  <div>2.0%</div>
                </div>
                <div>
                  <div style="opacity:0.8;">SELL TAX</div>
                  <div style="color:#ff6060; font-weight:600;">98.0%</div>
                </div>
                <div>
                  <div style="opacity:0.8;">TRANSFER TAX</div>
                  <div>0.0%</div>
                </div>
              </div>

              <div style="margin-top:10px; font-size:12px; line-height:1.5;">
                <div style="opacity:0.8; margin-bottom:2px;">SIMULATION RESULT (demo)</div>
                <div>
                  • Buy swaps: pass with expected output.<br>
                  • Sell swaps: revert or return &lt; 1% of input.<br>
                  • Pattern matches known honeypot tokens on Base.
                </div>
              </div>

              <div style="margin-top:10px; font-size:11px; opacity:0.9;">
                For real research you can use independent honeypot scanners like
                <a href="https://honeypot.is/base" target="_blank" rel="noopener noreferrer" style="color:#4aa8ff; text-decoration:underline;">
                  honeypot.is/base
                </a>
                and compare results with BaseScan and DEX simulators.
              </div>

            </div>
          </div>
        </div>

        <div id="transaction-result" class="transaction-result" style="margin-top: 20px;"></div>
      </div>
    `;

    // funkce pro inline onclick
    window.simulateBuy = simulateBuy;
    window.simulateSell = simulateSell;
  }
});

// --------------- HONEYPOT SIMULACE ----------------

function updateHoneyBalanceText() {
  const el = document.getElementById("honey-balance");
  if (!el) return;
  el.textContent =
    "Your HONEY balance in this demo: " +
    userHoneyBalance.toLocaleString();
}

function simulateBuy() {
  const amountInput = document.getElementById("buyAmount");
  const amountEth =
    amountInput && amountInput.value ? Number(amountInput.value) : 0;

  if (!amountEth || amountEth <= 0) {
    showModal("warning", "Enter a valid ETH amount to buy HONEY.");
    return;
  }

  const resultDiv = document.getElementById("transaction-result");

  // jednoduchý fake rate: 1 ETH = 120 000 HONEY
  const receivedHoney = Math.round(amountEth * 120000);
  userHoneyBalance += receivedHoney;
  updateHoneyBalanceText();

  showModal(
    "success",
    `BUY simulation OK! (${amountEth} ETH → ~${receivedHoney.toLocaleString()} HONEY)<br>`
  );
}

function simulateSell() {
  const amountInput = document.getElementById("sellAmount");
  const amountHoney =
    amountInput && amountInput.value ? Number(amountInput.value) : 0;

  if (!amountHoney || amountHoney <= 0) {
    showModal("warning", "Enter a valid HONEY amount to sell.");
    return;
  }

  if (userHoneyBalance <= 0) {
    showModal(
      "warning",
      "You have no HONEY in this demo.<br>First simulate a BUY before you try to SELL."
    );
    return;
  }

  if (amountHoney > userHoneyBalance) {
    showModal(
      "warning",
      "You cannot sell more HONEY than you bought in this demo.<br>" +
        "Your current demo balance is " +
        userHoneyBalance.toLocaleString() +
        " HONEY."
    );
    return;
  }

  const resultDiv = document.getElementById("transaction-result");

  showModal(
    "danger",
    "HONEYPOT CONFIRMED!<br>" +
      "• Token BUY: looks fine, you can acquire HONEY<br>" +
      "• Token SELL: blocked or extremely taxed<br>" +
      "• " +
      FAKE_TOKEN.apy +
      " APY is a massive red flag<br>" +
      "Always verify that you can exit the position (SELL) and use tools like honeypot.is before you buy a token."
  );
}

// --------------- MODAL SYSTÉM ----------------

function showModal(type, message) {
  const oldModal = document.querySelector(".custom-modal");
  if (oldModal) oldModal.remove();

  const modal = document.createElement("div");
  modal.className = `custom-modal modal-${type}`;

  const headerClass =
    type === "success"
      ? "modal-success-header"
      : type === "danger"
      ? "modal-danger-header"
      : "modal-warning-header";

  modal.innerHTML = `
    <div class="modal-content">
      <div class="${headerClass} modal-type-header">
        <h3>${type === "success" ? "SUCCESS" : type === "danger" ? "DANGER" : "WARNING"}</h3>
      </div>
      <div class="modal-body">
        <p>${message}</p>
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

  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.remove();
  });
}
