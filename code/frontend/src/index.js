import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

// === LOADER FUNCTION ===
function hideLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.visibility = 'hidden';
    // Remove from DOM after transition to free up memory
    setTimeout(() => {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 550);
  }
}

function showCompatibilityWarning(reason) {
  console.warn(`[Index] MiniApp needs ${reason}: wallet for full functionality`);
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
<div style="text-align:center;margin-bottom:15px;font-size:42px">🎓</div>
<h2 style="margin:0 0 10px 0;font-size:22px;font-weight:700;color:#fff;text-align:center">Welcome to BaseCamp</h2>
<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#cbd5e1;text-align:center">
BaseCamp is an interactive MiniApp for learning blockchain on Base (Ethereum L2).
</p>
<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#cbd5e1;text-align:center">
Complete hands-on labs to earn an NFT completion badge! Read theory, try your first test operations and then test yourself for scam recognition.
</p>
<p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#cbd5e1;text-align:center">
You can complete all the steps for free!!
</p>
<button id="welcome-close-btn" style="width:100%;padding:12px 24px;background:linear-gradient(135deg,#0052ff,#0033cc);border:none;border-radius:10px;color:white;font-weight:600;font-size:15px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 8px rgba(0,82,255,0.3)">
Let's Start Learning
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
    console.error("[Index] initUserOnBackend error:", err);
  }
}

// Safety timeout: Ensure loader disappears after 5s even if something hangs
setTimeout(() => {
    hideLoader();
}, 5000);

window.addEventListener("load", async () => {
  try {
    await sdk.actions.ready();

    let cachedWallet = null;

    try {
      if (window.BaseCampTheme && window.BaseCampTheme.waitForWallet) {
        const cache = await window.BaseCampTheme.waitForWallet();
        cachedWallet = cache.wallet;
        console.log('[Index] Wallet cache ready:', cachedWallet, 'Sepolia:', cache.sepolia_status);
      } else {
         console.warn('[Index] BaseCampTheme not found');
      }

    } catch (err) {
      console.log('[Index] Wallet cache timeout, trying sessionStorage fallback:', err);
      cachedWallet = sessionStorage.getItem('cached_wallet');
    }

    if (cachedWallet) {
      const span = document.getElementById("wallet-address");
      if (span) span.textContent = cachedWallet;
      await initUserOnBackend(cachedWallet);
    } else {
      console.log("[Index] No cached wallet available yet");
    }

    // Context loading
    let ctx = null;
    try {
      ctx = await sdk.context;
    } catch (error) {
      console.log("[Index] sdk.context failed:", error);
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

    console.log("[Index] User display:", { displayName, fidDisplay, avatarUrl, user });

  } catch (error) {
    console.error("[Index] Error during MiniApp init:", error);
    showCompatibilityWarning("error");
  } finally {
    // === KEY CHANGE: Hide loader when everything is done (or failed) ===
    hideLoader();
    console.log("[Index] Loader hidden");
  }
});