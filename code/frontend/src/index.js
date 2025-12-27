import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

// === LOADER FUNCTION ===
function hideLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.visibility = 'hidden';
    setTimeout(() => {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 550);
  }
}

function showCompatibilityWarning(reason) {
  console.warn(`[Index] MiniApp needs ${reason}: wallet for full functionality`);
}

// === BACKEND INIT ===
async function initUserOnBackend(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/init-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    if (res.ok) {
        const data = await res.json();
        return data.created === true;
    }
    return false;
  } catch (e) {
    console.warn("Backend init failed", e);
    return false;
  }
}

// === WELCOME MODAL ===
function showWelcomeModal() {
  if (document.getElementById('welcome-modal-overlay')) return;

  const overlay = document.createElement("div");
  overlay.id = 'welcome-modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(15,23,42,0.85); backdrop-filter: blur(5px);
    display: flex; align-items: center; justify-content: center; z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    max-width: 420px; width: 90%; background: #0f172a; border: 1px solid #334155;
    border-radius: 24px; padding: 32px 24px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);
  `;

  modal.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 20px;">🏕️</div>
    <h2 style="color:white; margin:0 0 12px 0;">Welcome to BaseCamp!</h2>
    <p style="color:#94a3b8; font-size: 16px; margin-bottom: 24px;">Start your journey into the Base ecosystem.</p>
    <button id="closeWelcome" style="background: #0052FF; color: white; border: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; width: 100%;">Let's go!</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById('closeWelcome').onclick = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  };
}

// === MAIN LOGIC ===
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Initialize Farcaster SDK
    await sdk.actions.ready();

    // 2. Get Wallet (Try Cache First)
    let wallet = sessionStorage.getItem('cached_wallet');

    // If not in cache, try SDK
    if (!wallet) {
      const ethProvider = sdk.wallet.ethProvider;
      if (ethProvider) {
          try {
              const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
              wallet = accounts && accounts[0] ? accounts[0] : null;
              if (wallet) sessionStorage.setItem('cached_wallet', wallet);
          } catch (e) {
              console.warn("Wallet request failed/rejected:", e);
          }
      }
    }

    // 3. If we have a wallet, initialize app
    if (wallet) {
      console.log("[Index] Wallet connected:", wallet);
      const span = document.getElementById("wallet-address");
      if (span) span.style.display = 'none'; // Featured: Hide address

      // A) Backend Init & Welcome Modal
      const isNewUser = await initUserOnBackend(wallet);
      if (isNewUser) {
          showWelcomeModal();
      }

      // B) Cache Data (Common.js)
      if (window.BaseCampTheme && window.BaseCampTheme.initUserData) {
          window.BaseCampTheme.initUserData(wallet);
      }
    } else {
      showCompatibilityWarning("wallet");
    }

    // 4. Load Farcaster Context (User Profile)
    const context = await sdk.context;
    if (context && context.user) {
        const user = context.user;
        const nameEl = document.getElementById("user-name");
        const fidEl = document.getElementById("user-fid");
        const placeholder = document.getElementById("user-avatar-placeholder");
        const initialsEl = document.getElementById("user-initials");

        let displayName = user.displayName || user.username || `FID ${user.fid}`;
        let fidDisplay = user.username ? `@${user.username}` : `FID ${user.fid}`;

        if (nameEl) nameEl.textContent = displayName;
        if (fidEl) fidEl.textContent = fidDisplay;

        if (user.pfpUrl && placeholder) {
            placeholder.style.backgroundImage = `url(${user.pfpUrl})`;
            placeholder.style.backgroundSize = "cover";
            if (initialsEl) initialsEl.textContent = "";
        }
    }

    // 5. Setup Theme Toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.BaseCampTheme) window.BaseCampTheme.toggleTheme();
        });
    }

    // 6. Setup Footer Link
    const footerLink = document.getElementById('farcaster-link');
    if (footerLink) {
      footerLink.addEventListener('click', (e) => {
        e.preventDefault();
        sdk.actions.openUrl('https://farcaster.xyz/satoshivv');
      });
    }

  } catch (error) {
    console.error("[Index] Init error:", error);
  } finally {
    // 7. ALWAYS HIDE LOADER (To je to klíčové!)
    hideLoader();
  }
});