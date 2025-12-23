import sdk from "https://esm.sh/farcasterminiapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

// Accordion toggle
function toggleAccordion(id) {
  const content = document.getElementById(`content-${id}`);
  const icon = document.getElementById(`icon-${id}`);
  if (!content || !icon) return;

  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    icon.textContent = "+";
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    icon.textContent = "-";
  }
}
window.toggleAccordion = toggleAccordion;

// Update progress in backend
async function updateFaucetProgress(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/update-field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        tablename: "USERPROGRESS",
        fieldname: "faucet",
        value: true,
      }),
    });

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("update-field error:", msg);
      return false;
    }

    return true;
  } catch (e) {
    console.error("updateFaucetProgress error:", e);
    return false;
  }
}

// Next button handler (updates progress, pak jde na send.html)
async function handleNextClick(event) {
  event.preventDefault();
  if (!currentWallet) {
    console.error("Wallet not available yet");
    return;
  }
  const ok = await updateFaucetProgress(currentWallet);
  if (ok) {
    window.location.href = "send.html";
  }
}

// Inicializace externích faucet tlačítek
function initExternalLinks() {
  const usdcBtn = document.getElementById("usdc-faucet-btn");
  if (usdcBtn) {
    usdcBtn.addEventListener("click", () => {
      sdk.actions.openUrl("https://faucet.circle.com");
    });
  }

  const ethBtn = document.getElementById("eth-faucet-btn");
  if (ethBtn) {
    ethBtn.addEventListener("click", () => {
      sdk.actions.openUrl("https://www.alchemy.com/faucets/base-sepolia");
    });
  }
}

// Wallet + MiniApp init
async function initWallet() {
  try {
    console.log("Page loaded, calling sdk.actions.ready...");
    await sdk.actions.ready();
    console.log("BaseCamp mini app is ready!");

    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      console.warn("Wallet address not found from ethProvider.request()");
      return;
    }

    console.log("Connected wallet from SDK:", wallet);
    currentWallet = wallet;

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;

    // zprovozni externí tlačítka až po ready()
    initExternalLinks();
  } catch (error) {
    console.error("Error during MiniApp wallet init:", error);
  }
}

window.addEventListener("load", initWallet);

// Navázání na Next tlačítko v navigaci
const nextLink = document.querySelector(
  "a.nav-btn.next-btn[href='send.html']"
);
if (nextLink) {
  nextLink.addEventListener("click", handleNextClick);
}
