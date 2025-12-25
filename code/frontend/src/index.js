import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

function showCompatibilityWarning(reason) {
  console.warn(`MiniApp potřebuje ${reason}: wallet pro plné funkce`);
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
  modal.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Inter', Inter";

  modal.innerHTML = `
    <h2 style="margin:0 0 14px;font-size:22px;font-weight:700;">Welcome to BaseCamp!</h2>
    <p style="margin:0 0 12px;font-size:14.5px;line-height:1.6;color:#cbd5e1;">
      BaseCamp is an interactive MiniApp for learning blockchain on Base (Ethereum L2).
    </p>
    <p style="margin:0 0 16px;font-size:14.5px;line-height:1.6;color:#cbd5e1;">
      Complete hands-on labs to earn an NFT completion badge! Read theory, try your first test operations and then test yourself for scam recognition.
    </p>
    <p style="margin:0 0 20px;font-size:14.5px;font-weight:600;color:#60a5fa;">
      You can complete all the steps for free!!
    </p>
    <button id="welcome-close-btn" style="width:100%;padding:12px;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;border-radius:10px;color:white;font-size:15px;font-weight:600;cursor:pointer;">
      Start learning
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

window.addEventListener("load", async () => {
  try {
    await sdk.actions.ready();

        // ====== POUŽIJ CACHED WALLET ======
    const cachedWallet = localStorage.getItem('cached_wallet');
    if (cachedWallet) {
      const span = document.getElementById("wallet-address");
      if (span) span.textContent = cachedWallet;
      await initUserOnBackend(cachedWallet);
    } else {
      console.log("No cached wallet available yet");
    }

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

    let displayName = "satoshi, is it you? (unknown)";
    let fidDisplay = "";
    if (user) {
      displayName = user.displayName || user.username || (user.fid ? `FID ${user.fid}` : "");
      fidDisplay = user.username ? `@${user.username}` : user.fid ? `FID ${user.fid}` : "satoshi, is it you? (unknown)";
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

  } catch (error) {
    console.error("Error during MiniApp init:", error);
    showCompatibilityWarning("error");
  }
});
