import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

// === 1. DEBUG LOGGER (Pro jistotu na mobilu) ===
(function initDebug() {
    const outputDiv = document.getElementById('debug-output');
    if (!outputDiv) return;

    const originalLog = console.log;
    const originalError = console.error;

    function logToScreen(type, args) {
        if (!document.getElementById('debug-overlay')) return;
        const line = document.createElement('div');
        line.style.borderBottom = '1px solid #333';
        line.style.color = type === 'error' ? '#ff4444' : '#00ff00';

        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        document.getElementById('debug-output').appendChild(line);
    }

    console.log = function(...args) { originalLog.apply(console, args); logToScreen('log', args); };
    console.error = function(...args) { originalError.apply(console, args); logToScreen('error', args); };
})();

// === 2. LOADER ===
function hideLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 500);
  }
}

// === 3. GUEST MODE (Odemkne UI, když není peněženka) ===
function setGuestMode() {
    console.log("[Index] Activating Guest Mode");
    const nameEl = document.getElementById("user-name");
    const fidEl = document.getElementById("user-fid");

    if (nameEl && (nameEl.textContent === "Načítání..." || nameEl.textContent === "")) {
        nameEl.textContent = "Guest User";
    }
    if (fidEl && fidEl.textContent === "") fidEl.textContent = "Not connected";

    // Řekneme common.js, ať vypne loading bary
    if (window.BaseCampTheme && window.BaseCampTheme.resetProgressUI) {
        window.BaseCampTheme.resetProgressUI();
    }
}

// === 4. BACKEND INIT ===
async function initUserOnBackend(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/init-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    // Vrátí true, pokud byl uživatel právě vytvořen (pro Welcome Modal)
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

// === 5. WELCOME MODAL ===
function showWelcomeModal() {
  if (document.getElementById('welcome-modal-overlay')) return;
  const overlay = document.createElement("div");
  overlay.id = 'welcome-modal-overlay';
  overlay.style.cssText = `position: fixed; inset: 0; background: rgba(15,23,42,0.85); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.3s ease;`;
  const modal = document.createElement("div");
  modal.style.cssText = `max-width: 420px; width: 90%; background: #0f172a; border: 1px solid #334155; border-radius: 24px; padding: 32px 24px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);`;
  modal.innerHTML = `<div style="font-size: 48px; margin-bottom: 20px;">🏕️</div><h2 style="color:white; margin:0 0 12px 0;">Welcome to BaseCamp!</h2><p style="color:#94a3b8; font-size: 16px; margin-bottom: 24px;">Start your journey into the Base ecosystem.</p><button id="closeWelcome" style="background: #0052FF; color: white; border: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; width: 100%;">Let's go!</button>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.getElementById('closeWelcome').onclick = () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 300); };
}

// === MAIN LOGIC ===
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // A. Init SDK
    await sdk.actions.ready();

    // B. Načtení profilu (Hned, nečekáme na wallet)
    try {
        const context = await sdk.context;
        if (context && context.user) {
            const user = context.user;
            const nameEl = document.getElementById("user-name");
            const fidEl = document.getElementById("user-fid");
            const placeholder = document.getElementById("user-avatar-placeholder");

            let displayName = user.displayName || user.username || `FID ${user.fid}`;
            if (nameEl) nameEl.textContent = displayName;
            if (fidEl) fidEl.textContent = `@${user.username}`;
            if (user.pfpUrl && placeholder) {
                placeholder.style.backgroundImage = `url(${user.pfpUrl})`;
                placeholder.style.backgroundSize = "cover";
                placeholder.innerHTML = "";
            }
        }
    } catch (err) {
        console.warn("Failed to load context:", err);
    }

    // C. Získání Peněženky
    let wallet = sessionStorage.getItem('cached_wallet');

    if (!wallet) {
      try {
          const ethProvider = sdk.wallet.ethProvider;
          if (ethProvider) {
             const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
             wallet = accounts && accounts[0] ? accounts[0] : null;

             // DŮLEŽITÉ: Uložit OKAMŽITĚ do cache, aby to common.js viděl na podstránkách
             if (wallet) {
                 sessionStorage.setItem('cached_wallet', wallet);
                 console.log("[Index] Wallet cached immediately:", wallet);
             }
          }
      } catch (err) {
          console.warn("Wallet connection failed:", err);
      }
    }

    // D. Rozhodování (Wallet vs Guest)
    if (wallet) {
      console.log("[Index] Wallet connected:", wallet);

      // Skrytí adresy (pro Featured status)
      const span = document.getElementById("wallet-address");
      if (span) span.style.display = 'none';

      // 1. Init User na Backendu
      const isNewUser = await initUserOnBackend(wallet);
      if (isNewUser) showWelcomeModal();

      // 2. Stáhnout data do cache (Common.js)
      if (window.BaseCampTheme && window.BaseCampTheme.initUserData) {
          window.BaseCampTheme.initUserData(wallet);
      }

    } else {
      // Žádná peněženka -> Guest Mode (vypne loading)
      setGuestMode();
    }

    // E. Footer Link
    const footerLink = document.getElementById('farcaster-link');
    if (footerLink) {
      footerLink.addEventListener('click', (e) => {
        e.preventDefault();
        sdk.actions.openUrl('https://farcaster.xyz/satoshivv');
      });
    }

    //// ... předchozí kód (Theme Toggle atd.) ...

    // F. Theme Toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.BaseCampTheme) window.BaseCampTheme.toggleTheme();
        });
    }

    // === H. DEBUG SESSION STORAGE (NOVÉ) ===
    setTimeout(() => {
        console.log("🔍 --- STORAGE DEBUG (po 2s) ---");

        // 1. Zkontrolovat Wallet
        const w = sessionStorage.getItem('cached_wallet');
        if (w) {
            console.log("✅ Wallet v Cache:", w);
        } else {
            console.error("❌ Wallet v Cache CHYBÍ!");
        }

        // 2. Zkontrolovat Data
        const rawData = sessionStorage.getItem('user_data_cache');
        if (rawData) {
            console.log("✅ Data Cache EXISTUJE");
            try {
                const parsed = JSON.parse(rawData);
                console.log("📊 Progress Keys:", Object.keys(parsed.progress || {}));
                console.log("📊 Progress Values:", parsed.progress);

                // Rychlý test, jestli je tam 'true' nebo '1'
                const sampleKey = Object.keys(parsed.progress)[0];
                if (sampleKey) {
                    const val = parsed.progress[sampleKey];
                    console.log(`🧐 Typ hodnoty pro '${sampleKey}':`, typeof val, val);
                }
            } catch (e) {
                console.error("❌ Data Cache je poškozený JSON");
            }
        } else {
            console.error("❌ Data Cache je PRÁZDNÁ (Backend nestihl odpovědět nebo selhal)");
        }
        console.log("-----------------------------");
    }, 2000); // Čekáme 2s, než doběhne fetch

  } catch (error) {
    console.error("[Index] Critical Error:", error);
    setGuestMode(); // Fallback
  } finally {
    // G. VŽDY SCHOVAT LOADER
    hideLoader();
  }
});