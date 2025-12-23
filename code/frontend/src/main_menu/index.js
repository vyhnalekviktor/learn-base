    import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

window.addEventListener("load", async () => {
  try {
    await sdk.actions.ready();

    const capabilities = await sdk.getCapabilities();
    const chains = await sdk.getChains();

    console.log('Supported capabilities:', capabilities);
    console.log('Supported chains:', chains);

    const hasWallet = capabilities.includes('wallet.getEthereumProvider');
    const hasBaseSepolia = chains.includes('eip155:84532');

    if (!hasWallet) {
      showCompatibilityWarning('wallet');
      return;
    }

    // ====== CONTEXT: USER / AVATAR ======
    let ctx = null;
    try {
      ctx = await sdk.context;
    } catch (error) {
      console.log('sdk.context failed:', error);
      ctx = null;
    }

    const user = ctx?.user || null;
    const userInfo = document.getElementById("user-info");
    const placeholder = document.getElementById("user-avatar-placeholder");
    const nameEl = document.getElementById("user-name");
    const fidEl = document.getElementById("user-fid");

    if (userInfo) {
      userInfo.style.display = "flex";
    }

    // EXPLICITNÍ FALLBACK LOGIKA pro "Unknown user"
    let displayName = "Unknown user";
    let fidDisplay = "Unknown user";

    if (user) {
      displayName = user.displayName || user.username || (user.fid ? `FID ${user.fid}` : "Unknown user");
      fidDisplay = user.username ? `@${user.username}` : (user.fid ? `FID ${user.fid}` : "Unknown user");
    } else {
      displayName = "Unknown user";
      fidDisplay = "Unknown user";
    }

    const avatarUrl = user?.pfpUrl || null;

    if (avatarUrl && placeholder) {
      placeholder.style.backgroundImage = `url(${avatarUrl})`;
      placeholder.style.backgroundSize = "cover";
      placeholder.style.backgroundPosition = "center";
    } else {
      // Default avatar pokud není pfp
      placeholder.style.backgroundImage = `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM0QTREOEYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSI2IiByPSIyIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTZDOC44ODU3OSAxNiA4IDE1LjExNDIgOCAxNGgxNnYgMiIvPgo8L3N2Zz4KPC9zdmc+')`;
      placeholder.style.backgroundSize = "cover";
      placeholder.style.backgroundPosition = "center";
    }

    if (nameEl) {
      nameEl.textContent = displayName;
    }

    if (fidEl) {
      fidEl.textContent = fidDisplay;
    }

    console.log('User display:', { displayName, fidDisplay, avatarUrl, user }); // DEBUG

    // ====== WALLET / BACKEND INIT ======
    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({
      method: "eth_requestAccounts",
    });

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      showCompatibilityWarning('wallet');
      return;
    }

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;

    await initUserOnBackend(wallet);

    if (!hasBaseSepolia) {
      await grantFullPracticeProgress(wallet);
      showCompatibilityWarning('chain');
    }

  } catch (error) {
    console.error("Error during MiniApp init:", error);
    showCompatibilityWarning('error');
  }
});

async function grantFullPracticeProgress(wallet) {
  if (!wallet) return;

  console.log('Granting full practice progress for wallet without Base Sepolia support:', wallet);

  const practiceFields = ['send', 'receive', 'mint', 'launch'];

  try {
    for (const field of practiceFields) {
      await fetch(`${API_BASE}/api/database/update_field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          table_name: "USER_PROGRESS",
          field_name: field,
          value: true
        })
      });
    }

    await fetch(`${API_BASE}/api/database/practice-sent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet })
    });

    console.log('Full practice progress granted successfully');
  } catch (error) {
    console.error('Error granting practice progress:', error);
  }
}

function showCompatibilityWarning(type) {
  let title = "⚠️ Compatibility Issue";
  let message = "";
  let suggestion = "";
  let isPersistent = false;

  if (type === 'wallet') {
    title = "🔒 Wallet Required";
    message = "This MiniApp requires wallet access for interactive blockchain tutorials.";
    suggestion = "Please open BaseCamp in <strong>Coinbase Wallet</strong> or <strong>Base App</strong> to access all features.";
    isPersistent = true;
  } else if (type === 'chain') {
    title = "ℹ️ Limited Network Support";
    message = "<strong>Your environment does not support Base Sepolia testnet.</strong>";
    suggestion = "Practice labs will show errors during transaction signing. <strong>Don't worry - you've been automatically granted 100% practice progress</strong> and can still mint your completion badge! For full interactive experience, open in <strong>Coinbase Wallet</strong>.";
    isPersistent = true;
  } else {
    title = "❌ Initialization Error";
    message = "Failed to initialize the MiniApp.";
    suggestion = "Try opening in <strong>Coinbase Wallet</strong> or refreshing the page.";
    isPersistent = true;
  }

  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: ${type === 'chain' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'};
    color: white;
    padding: 16px 20px;
    text-align: center;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: system-ui, -apple-system, sans-serif;
  `;

  banner.innerHTML = `
    <div style="max-width: 700px; margin: 0 auto;">
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">
        ${title}
      </div>
      <div style="font-size: 14px; line-height: 1.5; opacity: 0.95; margin-bottom: 6px;">
        ${message}
      </div>
      <div style="font-size: 13px; line-height: 1.5; opacity: 0.95;">
        ${suggestion}
      </div>
      ${isPersistent && type === 'chain' ? `
        <button
          onclick="this.parentElement.parentElement.remove()"
          style="
            margin-top: 12px;
            padding: 8px 20px;
            background: rgba(255,255,255,0.25);
            border: 1px solid rgba(255,255,255,0.4);
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
          "
        >
          Got it, continue ✓
        </button>
      ` : ''}
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);
}

async function initUserOnBackend(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/init-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    if (!res.ok) {
      return;
    }

    const data = await res.json();

    if (data.success === true && data.created === true) {
      showWelcomeModal();
    }
  } catch (err) {
    console.error("initUserOnBackend error:", err);
  }
}

function showWelcomeModal() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(15,23,42,0.75)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  const modal = document.createElement("div");
  modal.style.maxWidth = "420px";
  modal.style.width = "90%";
  modal.style.background = "linear-gradient(145deg,#0f172a,#020617)";
  modal.style.border = "1px solid rgba(148,163,184,0.4)";
  modal.style.borderRadius = "18px";
  modal.style.padding = "20px 22px";
  modal.style.color = "white";
  modal.style.boxShadow = "0 20px 45px rgba(15,23,42,0.8)";
  modal.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";

  modal.innerHTML = `
    <h2 style="font-size:24px; margin:0 0 14px 0; font-weight:700; text-align:center;">
      Welcome to BaseCamp!
    </h2>
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px 0; opacity:0.95;">
      BaseCamp is an interactive MiniApp for learning blockchain on Base (Ethereum L2).
    </p>
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px 0; opacity:0.95;">
      Complete hands-on labs to earn an NFT completion badge! Read theory, try your first test operations and then test yourself for scam recognition.
    </p>
    <p style="font-size:14px; font-weight:600; text-align:center; margin:16px 0 0 0; color:#4ade80;">
      You can complete all the steps for free!!
    </p>
    <button
      id="welcome-close-btn"
      style="
        width:100%;
        margin-top:20px;
        padding:12px;
        background:#0052FF;
        color:white;
        border:none;
        border-radius:10px;
        font-size:15px;
        font-weight:600;
        cursor:pointer;
      "
    >
      Let's Start Learning! 🚀
    </button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeBtn = modal.querySelector("#welcome-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
  }
}
