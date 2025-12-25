import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
const BASE_SEPOLIA_CHAIN_ID_DEC = 84532;

// 🐛 DEBUG - JEN PRO TESTOVÁNÍ
const DEBUG = true;

if (DEBUG) {
  console.log("🔥 DEBUG MODE ENABLED");
  console.log("💾 LocalStorage:", {
    wallet: localStorage.getItem("cached_wallet"),
    status: localStorage.getItem("sepolia_status"),
    error: localStorage.getItem("wallet_error_seen")
  });
}

window.addEventListener("load", async () => {
  console.log("🚀 Lab menu START");

  let loadingOverlay = null;
  try {
    await sdk.actions.ready();
    console.log("✅ SDK ready");

    loadingOverlay = showLoadingOverlay();

    // Vymaž cache pro test
    if (DEBUG) {
      localStorage.removeItem("sepolia_status");
      console.log("🧹 Cache cleared for testing");
    }

    const walletErrorSeen = localStorage.getItem("wallet_error_seen") === "true";
    let sepoliaStatus = localStorage.getItem("sepolia_status");

    console.log("📊 Init state:", { walletErrorSeen, sepoliaStatus });

    if (sepoliaStatus === "error" && walletErrorSeen) {
      console.log("⏭️ Skipping silently");
      hideLoadingOverlay(loadingOverlay);
      return;
    }

    // 1. Získej wallet
    let wallet = localStorage.getItem("cached_wallet");
    if (!wallet) {
      console.log("🔍 Fetching wallet from SDK...");
      const ethProvider = await sdk.wallet.ethProvider;

      if (!ethProvider) {
        console.error("❌ No ethProvider");
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) showCompatibilityWarning("wallet");
        return;
      }

      const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
      wallet = accounts[0];

      if (!wallet) {
        console.error("❌ No wallet found");
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) showCompatibilityWarning("wallet");
        return;
      }

      localStorage.setItem("cached_wallet", wallet);
      console.log("✅ Wallet:", wallet.slice(0,8) + "...");
    }

    // 2. Network check - VŽDY pro test
    sepoliaStatus = localStorage.getItem("sepolia_status");
    if (!sepoliaStatus || DEBUG) {
      console.log("🧪 Testing Base Sepolia support...");

      const ethProvider = await sdk.wallet.ethProvider;
      const supportsSepolia = await detectBaseSepoliaSupport(ethProvider);

      console.log("📡 Base Sepolia support:", supportsSepolia);

      if (!supportsSepolia) {
        console.log("🎁 GRANTING FULL PROGRESS!");
        await grantFullPracticeProgress(wallet);
        localStorage.setItem("sepolia_status", "warning");
        showCompatibilityWarning("chain");
      } else {
        localStorage.setItem("sepolia_status", "ok");
      }
    }

    hideLoadingOverlay(loadingOverlay);
    await getProgress(wallet);

  } catch (error) {
    console.error("💥 FATAL ERROR:", error);
    if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
  }
});

async function detectBaseSepoliaSupport(ethProvider) {
  try {
    // Simplified test - just RPC
    const { JsonRpcProvider } = await import("https://esm.sh/ethers@6.9.0");
    const provider = new JsonRpcProvider("https://sepolia.base.org");
    await provider.getBlockNumber();
    console.log("✅ RPC OK");
    return true;
  } catch (e) {
    console.log("❌ RPC failed -> INCOMPATIBLE");
    return false;
  }
}

async function grantFullPracticeProgress(wallet) {
  console.log("🎁 Setting progress fields...");
  const fields = ["faucet", "send", "receive", "mint", "launch"];

  for (const field of fields) {
    try {
      const res = await fetch(`${API_BASE}/api/database/update_field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet, table_name: "USER_PROGRESS", field_name: field, value: true
        })
      });

      console.log(`${field}: ${res.status} ${res.ok ? "✅" : "❌"}`);

    } catch (e) {
      console.error(`${field}: NETWORK ERROR`);
    }
  }
}

async function getProgress(wallet) {
  console.log("📊 Loading progress...");
  try {
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: "POST",
      body: JSON.stringify({ wallet }),
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    console.log("📊 Backend response:", data);

    // Update UI
    const progress = data.progress || {};
    const completed = ["faucet", "send", "receive", "mint", "launch"]
      .filter(f => progress[f] === true).length;

    document.getElementById("progress-percent").textContent = `${completed * 20}%`;
    document.getElementById("progress-bar-fill").style.width = `${completed * 20}%`;

  } catch (e) {
    console.error("❌ getProgress failed:", e);
  }
}

function showLoadingOverlay() {
  const overlay = document.createElement("div");
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:system-ui;">
      <div style="width:40px;height:40px;border:3px solid #333;border-top-color:#00ff00;border-radius:50%;animation:spin 1s linear infinite;"></div>
      <div style="mt:16px;font-weight:600;">Checking wallet...</div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay.firstChild;
}

function hideLoadingOverlay(overlay) {
  if (overlay) overlay.remove();
}

function showCompatibilityWarning(type) {
  const msg = type === "chain" ?
    "🚀 Full progress granted - no Base Sepolia needed!" :
    "Open in Coinbase Wallet";

  const banner = document.createElement("div");
  banner.innerHTML = `<div style="position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#f59e0b;color:white;padding:12px 24px;border-radius:8px;font-weight:600;z-index:10000;">${msg}</div>`;
  document.body.appendChild(banner.firstChild);
  setTimeout(() => banner.firstChild.remove(), 5000);
}
