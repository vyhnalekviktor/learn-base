import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
const BASE_SEPOLIA_CHAIN_ID_DEC = 84532;

window.addEventListener("load", async () => {
  let loadingOverlay = null;

  try {
    console.log("Lab menu loaded, calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("BaseCamp mini app is ready!");

    loadingOverlay = showLoadingOverlay();

    const ethProvider = await sdk.wallet.ethProvider;
    if (!ethProvider) {
      hideLoadingOverlay(loadingOverlay);
      showCompatibilityWarning("wallet");
      return;
    }

    const accounts = await ethProvider.request({
      method: "eth_requestAccounts",
    });

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      console.warn("Wallet address not found from ethProvider.request()");
      hideLoadingOverlay(loadingOverlay);
      showCompatibilityWarning("wallet");
      return;
    }

    console.log("Connected wallet from SDK:", wallet);

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;

    const supportsSepolia = await detectBaseSepoliaSupport(ethProvider);
    console.log("Base Sepolia support (lab menu):", supportsSepolia);

    if (!supportsSepolia) {
      await grantFullPracticeProgress(wallet);
      hideLoadingOverlay(loadingOverlay);
      showCompatibilityWarning("chain");
    } else {
      hideLoadingOverlay(loadingOverlay);
    }

    await getProgress(wallet);
  } catch (error) {
    console.error("Error during MiniApp wallet init (labMenu):", error);
    if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
    showCompatibilityWarning("error");
  }
});

function showLoadingOverlay() {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(8px);
  `;

  const spinner = document.createElement("div");
  spinner.style.cssText = `
    width: 48px;
    height: 48px;
    border: 4px solid rgba(96, 165, 250, 0.2);
    border-top-color: #60a5fa;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;

  const text = document.createElement("div");
  text.style.cssText = `
    margin-top: 20px;
    color: #e5e7eb;
    font-size: 15px;
    font-weight: 600;
    font-family: system-ui, -apple-system, Inter;
  `;
  text.textContent = "Checking network compatibility...";

  overlay.appendChild(spinner);
  overlay.appendChild(text);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(overlay);
  return overlay;
}

function hideLoadingOverlay(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.3s ease";
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  }
}

async function detectBaseSepoliaSupport(ethProvider) {
  try {
    const { JsonRpcProvider } = await import(
      "https://esm.sh/ethers@6.9.0"
    );

    let chainIdDec = null;
    try {
      const chainIdHex = await ethProvider.request({
        method: "eth_chainId",
      });
      chainIdDec = parseInt(chainIdHex, 16);
      console.log("Current chain from ethProvider:", chainIdDec);
    } catch (e) {
      console.log("eth_chainId failed:", e);
    }

    try {
      const readProvider = new JsonRpcProvider("https://sepolia.base.org");
      await readProvider.getBlockNumber();
      return chainIdDec === BASE_SEPOLIA_CHAIN_ID_DEC;
    } catch (e) {
      console.log("Base Sepolia RPC check failed:", e);
      return false;
    }
  } catch (e) {
    console.log("detectBaseSepoliaSupport fatal:", e);
    return false;
  }
}

async function grantFullPracticeProgress(wallet) {
  if (!wallet) return;

  console.log(
    "Granting full practice progress for wallet without Base Sepolia support (lab menu):",
    wallet
  );

  const practiceFields = ["faucet", "send", "receive", "mint", "launch"];

  try {
    for (const field of practiceFields) {
      await fetch(`${API_BASE}/api/database/update_field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          table_name: "USER_PROGRESS",
          field_name: field,
          value: true,
        }),
      });
    }

    await fetch(`${API_BASE}/api/database/practice-sent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    console.log("Full practice progress granted successfully (lab menu)");
  } catch (error) {
    console.error("Error granting practice progress (lab menu):", error);
  }
}

function showCompatibilityWarning(type) {
  let title = "Compatibility Issue";
  let message = "";
  let suggestion = "";

  if (type === "wallet") {
    title = "Wallet Required";
    message =
      "This practice lab requires wallet access for Base transactions.";
    suggestion =
      "Open BaseCamp in Coinbase Wallet or Base App for full functionality.";
  } else if (type === "chain") {
    title = "Limited Network Support";
    message =
      "Your environment does not support Base Sepolia testnet.";
    suggestion =
      "Practice transactions may fail. You have been automatically granted practice progress and can still mint your completion badge.";
  } else {
    title = "Initialization Error";
    message = "Failed to initialize the practice lab.";
    suggestion =
      "Try opening in Coinbase Wallet or refresh the page.";
  }

  const banner = document.createElement("div");
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: ${
      type === "chain"
        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
        : "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)"
    };
    color: white;
    padding: 14px 18px;
    text-align: center;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
  `;

  banner.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto;">
      <div style="font-weight: 700; margin-bottom: 4px;">
        ${title}
      </div>
      <div style="opacity: 0.95; margin-bottom: 4px;">
        ${message}
      </div>
      <div style="opacity: 0.9; font-size: 13px;">
        ${suggestion}
      </div>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);
}

async function getProgress(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("get-user error:", msg);
      return;
    }

    const data = await res.json();
    const progress = data.progress;
    if (!progress) {
      console.error("No progress object in response");
      return;
    }

    const parts = [
      progress.faucet,
      progress.send,
      progress.receive,
      progress.mint,
      progress.launch,
    ];

    let completed = 0;
    for (const part of parts) {
      if (part === true) completed += 1;
    }

    const percent = (completed / parts.length) * 100;
    console.log("Progress percent:", percent);

    const label = document.getElementById("progress-percent");
    if (label) {
      label.textContent = `${percent}%`;
    }

    const bar = document.getElementById("progress-bar-fill");
    if (bar) {
      bar.style.width = `${percent}%`;
    }

    if (progress.faucet === true) {
      const el = document.getElementById("item-faucet");
      if (el) el.classList.add("completed");
    }

    if (progress.send === true) {
      const el = document.getElementById("item-send");
      if (el) el.classList.add("completed");
    }

    if (progress.receive === true) {
      const el = document.getElementById("item-receive");
      if (el) el.classList.add("completed");
    }

    if (progress.mint === true) {
      const el = document.getElementById("item-mint");
      if (el) el.classList.add("completed");
    }

    if (progress.launch === true) {
      const el = document.getElementById("item-launch");
      if (el) el.classList.add("completed");
    }
  } catch (err) {
    console.error("getProgress error:", err);
  }
}
