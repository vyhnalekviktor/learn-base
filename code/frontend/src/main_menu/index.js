import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

function debugLog(...args) {
  const panel = document.getElementById("debug-log");
  if (!panel) return;
  const msg = args
    .map((a) => {
      try {
        if (typeof a === "string") return a;
        return JSON.stringify(a, null, 2);
      } catch {
        return String(a);
      }
    })
    .join(" ");
  const ts = new Date().toISOString().split("T")[1].slice(0, 8);
  panel.textContent += `[${ts}] ${msg}\n`;
  panel.scrollTop = panel.scrollHeight;
}

function initDebugToggle() {
  const btn = document.getElementById("debug-toggle");
  const panel = document.getElementById("debug-panel");
  if (!btn || !panel) return;
  let hidden = false;
  btn.addEventListener("click", () => {
    hidden = !hidden;
    panel.style.maxHeight = hidden ? "22px" : "40vh";
    btn.textContent = hidden ? "Show" : "Hide";
  });
}

window.addEventListener("load", async () => {
  initDebugToggle();

  try {
    await sdk.actions.ready();

    // ==== USER CONTEXT / AVATAR ====

    let ctx = null;
    try {
      ctx = await sdk.context.getContext();
      debugLog("MiniApp context:", ctx);
    } catch (e) {
      console.error("Failed to get context", e);
      debugLog("Failed to get context", String(e));
    }

    const userInfo = document.getElementById("user-info");
    const placeholder = document.getElementById("user-avatar-placeholder");
    const nameEl = document.getElementById("user-name");
    const fidEl = document.getElementById("user-fid");

    if (userInfo) {
      userInfo.style.display = "flex";
      debugLog("user-info made visible");
    } else {
      debugLog("user-info element NOT FOUND");
    }

    const user =
      ctx?.user ||
      ctx?.viewer ||
      ctx?.cast?.author ||
      null;

    debugLog("Resolved user object:", user);

    const displayName =
      (user && (user.displayName || user.username || user.name)) ||
      "Farcaster user";

    const avatarUrl =
      (user &&
        (user.pfpUrl ||
          user.avatarUrl ||
          (user.pfp && user.pfp.url))) ||
      null;

    const fid =
      (user && user.fid) ||
      ctx?.fid ||
      null;

    debugLog("displayName:", displayName);
    debugLog("avatarUrl:", avatarUrl);
    debugLog("fid:", fid);

    if (avatarUrl && placeholder) {
      placeholder.style.backgroundImage = `url(${avatarUrl})`;
      placeholder.style.backgroundSize = "cover";
      placeholder.style.backgroundPosition = "center";
      debugLog("Avatar background set");
    } else {
      debugLog("Avatar URL missing or placeholder not found");
    }

    if (nameEl) {
      nameEl.textContent = displayName;
    } else {
      debugLog("user-name element NOT FOUND");
    }

    if (fidEl && fid) {
      fidEl.textContent = `@${fid}`;
    } else if (fidEl) {
      fidEl.textContent = "";
    } else {
      debugLog("user-fid element NOT FOUND");
    }

    // ==== WALLET / BACKEND INIT ====

    const ethProvider = await sdk.wallet.ethProvider;
    debugLog("ethProvider obtained");

    const accounts = await ethProvider.request({
      method: "eth_requestAccounts",
    });
    debugLog("eth_requestAccounts result:", accounts);

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      console.warn("Wallet address not found from ethProvider.request()");
      debugLog("Wallet address not found");
      return;
    }

    debugLog("Connected wallet:", wallet);

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;
    else debugLog("wallet-address element NOT FOUND");

    await initUserOnBackend(wallet);
  } catch (error) {
    console.error("Error during MiniApp wallet init:", error);
    debugLog("Global error:", String(error));
  }
});

async function initUserOnBackend(wallet) {
  debugLog("initUserOnBackend start for wallet:", wallet);
  try {
    const res = await fetch(`${API_BASE}/api/database/init-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    debugLog("init-user response status:", res.status);

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("init-user error:", msg);
      debugLog("init-user error:", msg);
      return;
    }

    const data = await res.json();
    console.log("init-user result:", data);
    debugLog("init-user result:", data);

    if (data.success === true && data.created === true) {
      debugLog("New user detected, showing welcome modal");
      showWelcomeModal();
    } else {
      debugLog("User already exists or success false");
    }
  } catch (err) {
    console.error("initUserOnBackend error:", err);
    debugLog("initUserOnBackend error:", String(err));
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
    <h2 style="font-size: 20px; margin: 0 0 10px 0;display: flex;align-items: center; gap: 8px;">
      <span>Welcome to BaseCamp</span>
    </h2>
    <p style="font-size: 14px; line-height: 1.5; margin: 0 0 10px 0; color: #e5e7eb;">
      BaseCamp is an interactive MiniApp for learning blockchain on Base (Ethereum L2).
    </p>
    <p style="font-size: 14px; line-height: 1.5; margin: 0 0 10px 0; color: #e5e7eb;">
      Complete hands-on labs to earn an NFT completion badge! Read theory, try your first test operations and then test yourself for scam recognition.
    </p>
    <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px 0; color: #bbf7d0;">
      You can complete all the steps for free!!
    </p>
    <button id="welcome-close-btn" style="
      width: 100%;
      margin-top: 4px;
      padding: 10px 14px;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      background: #0052ff;
      color: white;
      font-weight: 600;
      font-size: 14px;
    ">
      Let’s start learning
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
