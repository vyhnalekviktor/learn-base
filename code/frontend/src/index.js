import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

// === LOADER FUNCTION ===
function hideLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.visibility = 'hidden';
    // Remove from DOM to free up memory
    setTimeout(() => {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 550);
  }
}

function showCompatibilityWarning(reason) {
  console.warn(`[Index] MiniApp needs ${reason}: wallet for full functionality`);
}

async function initUserOnBackend(wallet) {
  try {
    await fetch(`${API_BASE}/api/database/init-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
  } catch (e) {
    console.warn("Backend init failed", e);
  }
}

// === MAIN LOGIC (DOMContentLoaded = Faster Start) ===
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
          const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
          wallet = accounts && accounts[0] ? accounts[0] : null;

          if (wallet) {
              sessionStorage.setItem('cached_wallet', wallet);
          }
      }
    }

    // 3. If we have a wallet, initialize app & PRELOAD DATA
    if (wallet) {
      console.log("[Index] Wallet connected:", wallet);
      const span = document.getElementById("wallet-address");
      if (span) span.textContent = wallet;

      // --- TOTO JE NOVÁ ČÁST PRO CACHING ---
      // A) Inicializace uživatele na backendu (aby existoval v DB)
      initUserOnBackend(wallet);

      // B) Stáhnutí dat do cache prohlížeče (aby podstránky byly rychlé)
      if (window.BaseCampTheme && window.BaseCampTheme.initUserData) {
          window.BaseCampTheme.initUserData(wallet);
      }
      // -------------------------------------
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

    // 5. Setup Footer Link
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
    // Always hide loader
    hideLoader();
  }
});