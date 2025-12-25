import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
const BASE_SEPOLIA_CHAIN_ID_DEC = 84532;

import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
const BASE_SEPOLIA_CHAIN_ID_DEC = 84532;

window.addEventListener("load", async () => {
  let loadingOverlay = null;

  try {
    console.log("Lab menu loaded, calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("BaseCamp mini app is ready!");

    // START: loading overlay
    loadingOverlay = showLoadingOverlay();

    const walletErrorSeen = localStorage.getItem("wallet_error_seen") === "true";
    let sepoliaStatus = localStorage.getItem("sepolia_status");

    // Skip silently if already known incompatible
    if (sepoliaStatus === "error" && walletErrorSeen) {
      console.log("Sepolia error already seen, skipping silently");
      hideLoadingOverlay(loadingOverlay);
      return;
    }

    // 1. Get wallet (cache or SDK)
    let wallet = localStorage.getItem("cached_wallet");

    if (!wallet) {
      console.log("No cached wallet, fetching from SDK...");
      const ethProvider = await sdk.wallet.ethProvider;

      if (!ethProvider) {
        hideLoadingOverlay(loadingOverlay);
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) {
          showCompatibilityWarning("wallet");
          localStorage.setItem("wallet_error_seen", "true");
        }
        return;
      }

      let accounts;
      try {
        accounts = await ethProvider.request({ method: "eth_requestAccounts" });
      } catch (e) {
        console.log("eth_requestAccounts failed:", e);
        hideLoadingOverlay(loadingOverlay);
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) {
          showCompatibilityWarning("wallet");
          localStorage.setItem("wallet_error_seen", "true");
        }
        return;
      }

      wallet = accounts && accounts.length > 0 ? accounts[0] : null;
      if (!wallet) {
        console.warn("Wallet address not found");
        hideLoadingOverlay(loadingOverlay);
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) {
          showCompatibilityWarning("wallet");
          localStorage.setItem("wallet_error_seen", "true");
        }
        return;
      }

      localStorage.setItem("cached_wallet", wallet);
      console.log("Wallet cached:", wallet);
    } else {
      console.log("Using cached wallet:", wallet);
    }

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;

    // 2. Network check - ONLY if not done before
    sepoliaStatus = localStorage.getItem("sepolia_status");
    if (!sepoliaStatus) {
      const ethProvider = await sdk.wallet.ethProvider;
      if (!ethProvider) {
        hideLoadingOverlay(loadingOverlay);
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) {
          showCompatibilityWarning("wallet");
          localStorage.setItem("wallet_error_seen", "true");
        }
        return;
      }

      const supportsSepolia = await detectBaseSepoliaSupport(ethProvider);
      console.log("Base Sepolia support:", supportsSepolia);

      if (supportsSepolia) {
        localStorage.setItem("sepolia_status", "ok");
      } else {
        // ✅ Grant progress ONLY first time
        await grantFullPracticeProgress(wallet);
        localStorage.setItem("sepolia_status", "warning");
        showCompatibilityWarning("chain");
      }
    } else {
      console.log("Sepolia status from cache:", sepoliaStatus);
      if (sepoliaStatus === "warning") {
        showCompatibilityWarning("chain");
      } else if (sepoliaStatus === "error" && !walletErrorSeen) {
        showCompatibilityWarning("error");
        localStorage.setItem("wallet_error_seen", "true");
      }
    }

    // Hide loading & load progress
    if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
    await getProgress(wallet);

  } catch (error) {
    console.error("Wallet init error:", error);
    if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
    localStorage.setItem("sepolia_status", "error");
    if (!localStorage.getItem("wallet_error_seen")) {
      showCompatibilityWarning("error");
      localStorage.setItem("wallet_error_seen", "true");
    }
  }
});

async function detectBaseSepoliaSupport(ethProvider) {
  try {
    const { JsonRpcProvider } = await import("https://esm.sh/ethers@6.9.0");

    // Test 1: Direct RPC access
    try {
      const readProvider = new JsonRpcProvider("https://sepolia.base.org");
      await readProvider.getBlockNumber();
      console.log("Base Sepolia RPC accessible");
      return true;
    } catch (rpcError) {
      console.log("Base Sepolia RPC failed, testing chain switch...");
    }

    // Test 2: Try chain switch
    try {
      await ethProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x14a34" }]
      });
      console.log("Wallet supports Base Sepolia chain switch");
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        console.log("Base Sepolia not added but switch supported");
        return true;
      }
    }

    console.log("Wallet incompatible with Base Sepolia");
    return false;
  } catch (e) {
    console.log("detectBaseSepoliaSupport fatal:", e);
    return false;
  }
}

async function grantFullPracticeProgress(wallet) {
  if (!wallet) return;

  console.log("Granting full practice progress:", wallet);
  const practiceFields = ["send", "receive", "mint", "launch"];

  for (const field of practiceFields) {
    try {
      const res = await fetch(`${API_BASE}/api/database/update_field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          table_name: "USER_PROGRESS",
          field_name: field,
          value: true,
        }),
      });
      console.log(`${field}: ${res.ok} (${res.status})`);
    } catch (error) {
      console.error(`${field}:`, error);
    }
  }
  console.log("Full practice progress granted");
}

function showLoadingOverlay() {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(2, 6, 23, 0.95);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 9999; backdrop-filter: blur(8px);
  `;

  const spinner = document.createElement("div");
  spinner.style.cssText = `
    width: 48px; height: 48px;
    border: 4px solid rgba(96, 165, 250, 0.2);
    border-top-color: #60a5fa; border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;

  const text = document.createElement("div");
  text.style.cssText = `
    margin-top: 20px; color: #e5e7eb;
    font-size: 15px; font-weight: 600;
    font-family: system-ui, -apple-system, Inter;
  `;
  text.textContent = "Checking wallet and network compatibility...";

  overlay.appendChild(spinner);
  overlay.appendChild(text);

  const style = document.createElement("style");
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  return overlay;
}

function hideLoadingOverlay(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.3s ease";
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
  }
}

function showCompatibilityWarning(type) {
  let title, message, suggestion, color;

  if (type === "wallet") {
    title = "Wallet Required";
    message = "This practice lab requires wallet access for Base transactions.";
    suggestion = "Open BaseCamp in Coinbase Wallet or Base App.";
    color = "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";
  } else if (type === "chain") {
    title = "Limited Network Support";
    message = "Your wallet doesn't support Base Sepolia testnet.";
    suggestion = "Practice progress automatically granted!";
    color = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
  } else {
    title = "Initialization Error";
    message = "Failed to initialize the practice lab.";
    suggestion = "Try Coinbase Wallet or refresh the page.";
    color = "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";
  }

  const banner = document.createElement("div");
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0;
    background: ${color};
    color: white; padding: 14px 18px; text-align: center; z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
  `;

  banner.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto; position: relative;">
      <button id="dismiss-warning" style="
        position: absolute; top: -6px; right: 0; width: 28px; height: 28px;
        background: rgba(255,255,255,0.25); border: none; border-radius: 50%;
        font-size: 18px; font-weight: 700; color: white; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      " onclick="this.parentNode.parentNode.style.opacity=0;this.parentNode.parentNode.style.transition='opacity 0.3s ease';setTimeout(()=>{if(this.parentNode.parentNode.parentNode)this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode)},300)">×</button>
      <div style="font-weight: 700; margin-bottom: 4px;">${title}</div>
      <div style="opacity: 0.95; margin-bottom: 4px;">${message}</div>
      <div style="opacity: 0.9; font-size: 13px;">${suggestion}</div>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);
}

async function getProgress(wallet) {
  if (!wallet) return;

  try {
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet })
    });

    if (!res.ok) throw new Error("Backend error");

    const data = await res.json();
    const progress = data.progress;

    if (!progress) return;

    const parts = [progress.faucet, progress.send, progress.receive, progress.mint, progress.launch];
    let completed = 0;

    for (const part of parts) {
      if (part === true) completed++;
    }

    const percent = Math.round((completed / parts.length) * 100);

    const label = document.getElementById("progress-percent");
    if (label) label.textContent = `${percent}%`;

    const bar = document.getElementById("progress-bar-fill");
    if (bar) bar.style.width = `${percent}%`;

    // Update menu item states
    if (progress.faucet === true) document.getElementById("item-faucet")?.classList.add("completed");
    if (progress.send === true) document.getElementById("item-send")?.classList.add("completed");
    if (progress.receive === true) document.getElementById("item-receive")?.classList.add("completed");
    if (progress.mint === true) document.getElementById("item-mint")?.classList.add("completed");
    if (progress.launch === true) document.getElementById("item-launch")?.classList.add("completed");

  } catch (err) {
    console.error("getProgress error:", err);
  }
}
// 🐛 DEBUG CONSOLE PANEL
function createDebugPanel() {
  const debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; width: 300px; max-height: 400px;
    background: rgba(0,0,0,0.9); border: 1px solid #333; border-radius: 12px;
    padding: 12px; font-family: monospace; font-size: 12px; color: #00ff00;
    z-index: 99999; overflow-y: auto; backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '🐛 DEBUG';
  toggleBtn.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; width: 80px; height: 40px;
    background: #ff6b6b; color: white; border: none; border-radius: 20px;
    font-weight: 600; cursor: pointer; z-index: 100000; font-size: 12px;
  `;

  const logs = document.createElement('div');
  logs.id = 'debug-logs';

  debugPanel.appendChild(logs);
  document.body.appendChild(toggleBtn);
  document.body.appendChild(debugPanel);

  let visible = false;
  toggleBtn.onclick = () => {
    visible = !visible;
    debugPanel.style.display = visible ? 'block' : 'none';
    toggleBtn.style.background = visible ? '#10b981' : '#ff6b6b';
  };

  // Debug log wrapper
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog.apply(console, args);
    const logDiv = document.createElement('div');
    logDiv.textContent = `[${new Date().toLocaleTimeString()}] ${args.join(' ')}`;
    logDiv.style.cssText = 'padding: 4px 0; border-bottom: 1px solid #222;';
    logs.appendChild(logDiv);
    logs.scrollTop = logs.scrollHeight;
  };

  // Debug error wrapper
  const originalError = console.error;
  console.error = (...args) => {
    originalError.apply(console, args);
    const logDiv = document.createElement('div');
    logDiv.style.color = '#ff6b6b';
    logDiv.textContent = `[ERROR ${new Date().toLocaleTimeString()}] ${args.join(' ')}`;
    logs.appendChild(logDiv);
    logs.scrollTop = logs.scrollHeight;
  };

  console.log('🐛 DEBUG PANEL: Ready! Click 🐛 button to toggle.');
}

// Spusť debug panel
createDebugPanel();


window.addEventListener("load", async () => {
  let loadingOverlay = null;

  try {
    console.log("Lab menu loaded, calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("BaseCamp mini app is ready!");

    // START: loading overlay
    loadingOverlay = showLoadingOverlay();

    const walletErrorSeen = localStorage.getItem("wallet_error_seen") === "true";
    let sepoliaStatus = localStorage.getItem("sepolia_status");

    // Skip silently if already known incompatible
    if (sepoliaStatus === "error" && walletErrorSeen) {
      console.log("Sepolia error already seen, skipping silently");
      hideLoadingOverlay(loadingOverlay);
      return;
    }

    // 1. Get wallet (cache or SDK)
    let wallet = localStorage.getItem("cached_wallet");

    if (!wallet) {
      console.log("No cached wallet, fetching from SDK...");
      const ethProvider = await sdk.wallet.ethProvider;

      if (!ethProvider) {
        hideLoadingOverlay(loadingOverlay);
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) {
          showCompatibilityWarning("wallet");
          localStorage.setItem("wallet_error_seen", "true");
        }
        return;
      }

      let accounts;
      try {
        accounts = await ethProvider.request({ method: "eth_requestAccounts" });
      } catch (e) {
        console.log("eth_requestAccounts failed:", e);
        hideLoadingOverlay(loadingOverlay);
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) {
          showCompatibilityWarning("wallet");
          localStorage.setItem("wallet_error_seen", "true");
        }
        return;
      }

      wallet = accounts && accounts.length > 0 ? accounts[0] : null;
      if (!wallet) {
        console.warn("Wallet address not found");
        hideLoadingOverlay(loadingOverlay);
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) {
          showCompatibilityWarning("wallet");
          localStorage.setItem("wallet_error_seen", "true");
        }
        return;
      }

      localStorage.setItem("cached_wallet", wallet);
      console.log("Wallet cached:", wallet);
    } else {
      console.log("Using cached wallet:", wallet);
    }

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;

    // 2. Network check - ONLY if not done before
    sepoliaStatus = localStorage.getItem("sepolia_status");
    if (!sepoliaStatus) {
      const ethProvider = await sdk.wallet.ethProvider;
      if (!ethProvider) {
        hideLoadingOverlay(loadingOverlay);
        localStorage.setItem("sepolia_status", "error");
        if (!walletErrorSeen) {
          showCompatibilityWarning("wallet");
          localStorage.setItem("wallet_error_seen", "true");
        }
        return;
      }

      const supportsSepolia = await detectBaseSepoliaSupport(ethProvider);
      console.log("Base Sepolia support:", supportsSepolia);

      if (supportsSepolia) {
        localStorage.setItem("sepolia_status", "ok");
      } else {
        // ✅ Grant progress ONLY first time
        await grantFullPracticeProgress(wallet);
        localStorage.setItem("sepolia_status", "warning");
        showCompatibilityWarning("chain");
      }
    } else {
      console.log("Sepolia status from cache:", sepoliaStatus);
      if (sepoliaStatus === "warning") {
        showCompatibilityWarning("chain");
      } else if (sepoliaStatus === "error" && !walletErrorSeen) {
        showCompatibilityWarning("error");
        localStorage.setItem("wallet_error_seen", "true");
      }
    }

    // Hide loading & load progress
    if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
    await getProgress(wallet);

  } catch (error) {
    console.error("Wallet init error:", error);
    if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
    localStorage.setItem("sepolia_status", "error");
    if (!localStorage.getItem("wallet_error_seen")) {
      showCompatibilityWarning("error");
      localStorage.setItem("wallet_error_seen", "true");
    }
  }
});

async function detectBaseSepoliaSupport(ethProvider) {
  try {
    const { JsonRpcProvider } = await import("https://esm.sh/ethers@6.9.0");

    // Test 1: Direct RPC access
    try {
      const readProvider = new JsonRpcProvider("https://sepolia.base.org");
      await readProvider.getBlockNumber();
      console.log("Base Sepolia RPC accessible");
      return true;
    } catch (rpcError) {
      console.log("Base Sepolia RPC failed, testing chain switch...");
    }

    // Test 2: Try chain switch
    try {
      await ethProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x14a34" }]
      });
      console.log("Wallet supports Base Sepolia chain switch");
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        console.log("Base Sepolia not added but switch supported");
        return true;
      }
    }

    console.log("Wallet incompatible with Base Sepolia");
    return false;
  } catch (e) {
    console.log("detectBaseSepoliaSupport fatal:", e);
    return false;
  }
}

async function grantFullPracticeProgress(wallet) {
  if (!wallet) return;

  console.log("Granting full practice progress:", wallet);
  const practiceFields = ["send", "receive", "mint", "launch"];

  for (const field of practiceFields) {
    try {
      const res = await fetch(`${API_BASE}/api/database/update_field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          table_name: "USER_PROGRESS",
          field_name: field,
          value: true,
        }),
      });
      console.log(`${field}: ${res.ok} (${res.status})`);
    } catch (error) {
      console.error(`${field}:`, error);
    }
  }
  console.log("Full practice progress granted");
}

function showLoadingOverlay() {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(2, 6, 23, 0.95);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 9999; backdrop-filter: blur(8px);
  `;

  const spinner = document.createElement("div");
  spinner.style.cssText = `
    width: 48px; height: 48px;
    border: 4px solid rgba(96, 165, 250, 0.2);
    border-top-color: #60a5fa; border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;

  const text = document.createElement("div");
  text.style.cssText = `
    margin-top: 20px; color: #e5e7eb;
    font-size: 15px; font-weight: 600;
    font-family: system-ui, -apple-system, Inter;
  `;
  text.textContent = "Checking wallet and network compatibility...";

  overlay.appendChild(spinner);
  overlay.appendChild(text);

  const style = document.createElement("style");
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  return overlay;
}

function hideLoadingOverlay(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.3s ease";
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
  }
}

function showCompatibilityWarning(type) {
  let title, message, suggestion, color;

  if (type === "wallet") {
    title = "Wallet Required";
    message = "This practice lab requires wallet access for Base transactions.";
    suggestion = "Open BaseCamp in Coinbase Wallet or Base App.";
    color = "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";
  } else if (type === "chain") {
    title = "Limited Network Support";
    message = "Your wallet doesn't support Base Sepolia testnet.";
    suggestion = "Practice progress automatically granted!";
    color = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
  } else {
    title = "Initialization Error";
    message = "Failed to initialize the practice lab.";
    suggestion = "Try Coinbase Wallet or refresh the page.";
    color = "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)";
  }

  const banner = document.createElement("div");
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0;
    background: ${color};
    color: white; padding: 14px 18px; text-align: center; z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
  `;

  banner.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto; position: relative;">
      <button id="dismiss-warning" style="
        position: absolute; top: -6px; right: 0; width: 28px; height: 28px;
        background: rgba(255,255,255,0.25); border: none; border-radius: 50%;
        font-size: 18px; font-weight: 700; color: white; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      " onclick="this.parentNode.parentNode.style.opacity=0;this.parentNode.parentNode.style.transition='opacity 0.3s ease';setTimeout(()=>{if(this.parentNode.parentNode.parentNode)this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode)},300)">×</button>
      <div style="font-weight: 700; margin-bottom: 4px;">${title}</div>
      <div style="opacity: 0.95; margin-bottom: 4px;">${message}</div>
      <div style="opacity: 0.9; font-size: 13px;">${suggestion}</div>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);
}

async function getProgress(wallet) {
  if (!wallet) return;

  try {
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet })
    });

    if (!res.ok) throw new Error("Backend error");

    const data = await res.json();
    const progress = data.progress;

    if (!progress) return;

    const parts = [progress.faucet, progress.send, progress.receive, progress.mint, progress.launch];
    let completed = 0;

    for (const part of parts) {
      if (part === true) completed++;
    }

    const percent = Math.round((completed / parts.length) * 100);

    const label = document.getElementById("progress-percent");
    if (label) label.textContent = `${percent}%`;

    const bar = document.getElementById("progress-bar-fill");
    if (bar) bar.style.width = `${percent}%`;

    // Update menu item states
    if (progress.faucet === true) document.getElementById("item-faucet")?.classList.add("completed");
    if (progress.send === true) document.getElementById("item-send")?.classList.add("completed");
    if (progress.receive === true) document.getElementById("item-receive")?.classList.add("completed");
    if (progress.mint === true) document.getElementById("item-mint")?.classList.add("completed");
    if (progress.launch === true) document.getElementById("item-launch")?.classList.add("completed");

  } catch (err) {
    console.error("getProgress error:", err);
  }
}
