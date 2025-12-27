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

function showWelcomeModal() {
  // Check if already exists
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
    max-width: 420px; width: 90%; background: linear-gradient(145deg,#0f172a,#020617);
    border: 1px solid rgba(148,163,184,0.2); border-radius: 24px; padding: 32px 24px;
    text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    animation: slideUp 0.4s ease;
  `;

  modal.innerHTML = `
    <h2 style="color:white; margin:0 0 12px 0; font-size: 24px;">Welcome to BaseCamp!</h2>
    <p style="color:#94a3b8; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Start your journey into the Base ecosystem. Learn basics, check out common scams, earn an NFT badge!
    </p>
    <button id="closeWelcome" style="
      background: #0052FF; color: white; border: none; padding: 14px 32px;
      border-radius: 12px; font-weight: 600; font-size: 16px; cursor: pointer;
      width: 100%; transition: background 0.2s;
    ">Let's go!</button>
    <style>
      @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      @keyframes slideUp { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }
    </style>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById('closeWelcome').onclick = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  };
}

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

// === MAIN LOGIC ===
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await sdk.actions.ready();

    let wallet = sessionStorage.getItem('cached_wallet');

    if (!wallet) {
      const ethProvider = sdk.wallet.ethProvider;
      if (ethProvider) {
          const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
          wallet = accounts && accounts[0] ? accounts[0] : null;

          if (wallet) {
              sessionStorage.setItem('cached_wallet', wallet);
          }
      }
    }

    if (wallet) {
      console.log("[Index] Wallet connected:", wallet);
      const span = document.getElementById("wallet-address");
      if (span) span.textContent = wallet;

      const isNewUser = await initUserOnBackend(wallet);

      if (isNewUser) {
          showWelcomeModal();
      }

      if (window.BaseCampTheme && window.BaseCampTheme.initUserData) {
          window.BaseCampTheme.initUserData(wallet);
      }

    } else {
      showCompatibilityWarning("wallet");
    }

    // Load Farcaster Context
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

    // --- ZMĚNA: Přidána obsluha pro Theme Toggle ---
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Voláme funkci z common.js
            if (window.BaseCampTheme) {
                window.BaseCampTheme.toggleTheme();
            }
        });
    }
    // ----------------------------------------------

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
    hideLoader();
  }
});