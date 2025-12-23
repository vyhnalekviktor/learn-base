import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

function toggleAccordion(id) {
    const content = document.getElementById('content-' + id);
    const icon = document.getElementById('icon-' + id);

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.textContent = '▼';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.textContent = '▲';
    }
}
window.toggleAccordion = toggleAccordion;

async function initWallet() {
  try {
    console.log("Page loaded, calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("BaseCamp mini app is ready!");

    const ethProvider = await sdk.wallet.ethProvider;

    const accounts = await ethProvider.request({
      method: "eth_requestAccounts",
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

async function updateFaucetProgress(wallet) {
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet,
      table_name: "USER_PROGRESS",
      field_name: "faucet",
      value: true,
    }),
  });

  if (!res.ok) {
    let msg = "Unknown backend error";
    try {
      const err = await res.json();
      msg = err.detail || JSON.stringify(err);
    } catch (_) {}
    console.error("update_field error:", msg);
    return false;
  }

  return true;
}

async function handleNextClick(event) {
  event.preventDefault();
  if (!currentWallet) {
    console.error("Wallet not available yet");
    return;
  }
  window.location.href = "send.html";
  await updateFaucetProgress(currentWallet);
}

window.addEventListener("load", initWallet);

function openEthFaucet() {
  sdk.actions.openUrl("https://www.alchemy.com/faucets/base-sepolia");
}

function openUsdcFaucet() {
  sdk.actions.openUrl("https://faucet.circle.com/");
}

// aby byly dostupné z HTML:
window.openEthFaucet = openEthFaucet;
window.openUsdcFaucet = openUsdcFaucet;

const nextLink = document.querySelector("a.nav-btn.next-btn[href='send.html']");
if (nextLink) {
  nextLink.addEventListener("click", handleNextClick);
}
