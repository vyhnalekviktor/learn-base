import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
const BASE_SEPOLIA_CHAIN_ID_DEC = 84532;

window.addEventListener("load", async () => {
  try {
    await sdk.actions.ready();

    // ====== CONTEXT: USER / AVATAR ======
    let ctx = null;
    try {
      ctx = await sdk.context;
    } catch (error) {
      console.log("sdk.context failed:", error);
      ctx = null;
    }

    const user = ctx?.user || null;
    const userInfo = document.getElementById("user-info");
    const placeholder = document.getElementById("user-avatar-placeholder");
    const initialsEl = document.getElementById("user-initials");
    const nameEl = document.getElementById("user-name");
    const fidEl = document.getElementById("user-fid");

    if (userInfo) {
      userInfo.style.display = "flex";
    }

    let displayName = "Unknown user";
    let fidDisplay = "Unknown user";

    if (user) {
      displayName =
        user.displayName ||
        user.username ||
        (user.fid ? `FID ${user.fid}` : "Unknown user");
      fidDisplay = user.username
        ? `@${user.username}`
        : user.fid
        ? `FID ${user.fid}`
        : "Unknown user";
    }

    const avatarUrl = user?.pfpUrl || null;

    if (avatarUrl && placeholder) {
      placeholder.style.backgroundImage = `url(${avatarUrl})`;
      placeholder.style.backgroundSize = "cover";
      placeholder.style.backgroundPosition = "center";
      if (initialsEl) initialsEl.textContent = "";
    } else if (placeholder) {
      placeholder.style.backgroundImage = "";
      if (initialsEl) initialsEl.textContent = "?";
    }

    if (nameEl) nameEl.textContent = displayName;
    if (fidEl) fidEl.textContent = fidDisplay;

    console.log("User display:", { displayName, fidDisplay, avatarUrl, user });

    // ====== WALLET / BACKEND INIT ======
    const ethProvider = await sdk.wallet.ethProvider;
    if (!ethProvider) {
      showCompatibilityWarning("wallet");
      return;
    }

    const accounts = await ethProvider.request({
      method: "eth_requestAccounts",
    });
    const wallet =
      accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      showCompatibilityWarning("wallet");
      return;
    }

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;

    await initUserOnBackend(wallet);

  } catch (error) {
    console.error("Error during MiniApp init:", error);
    showCompatibilityWarning("error");
  }
});


async function initUserOnBackend(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/init-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    if (!res.ok) return;

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
      Let's Start Learning!
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
