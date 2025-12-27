import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

// === DEBUG LOGGER START ===
// Přepíšeme console.log a console.error, aby psaly i na obrazovku
(function initDebug() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const outputDiv = document.getElementById('debug-output');

    function logToScreen(type, args) {
        if (!outputDiv) return; // Pokud HTML ještě není ready

        const line = document.createElement('div');
        line.style.borderBottom = '1px solid #333';
        line.style.padding = '2px 0';

        if (type === 'error') line.style.color = '#ff4444';
        if (type === 'warn') line.style.color = '#ffbb33';

        // Převedeme argumenty na string
        const msg = args.map(arg => {
            if (typeof arg === 'object') {
                try { return JSON.stringify(arg); } catch(e) { return '[Object]'; }
            }
            return String(arg);
        }).join(' ');

        const time = new Date().toLocaleTimeString().split(' ')[0];
        line.textContent = `[${time}] ${msg}`;

        outputDiv.appendChild(line);
        // Auto-scroll dolů
        const overlay = document.getElementById('debug-overlay');
        if(overlay) overlay.scrollTop = overlay.scrollHeight;
    }

    console.log = function(...args) {
        originalLog.apply(console, args);
        logToScreen('log', args);
    };

    console.error = function(...args) {
        originalError.apply(console, args);
        logToScreen('error', args);
    };

    console.warn = function(...args) {
        originalWarn.apply(console, args);
        logToScreen('warn', args);
    };

    // Odchytávání globálních chyb (např. syntax error)
    window.addEventListener('error', (event) => {
        logToScreen('error', [`UNCIPHERED ERROR: ${event.message}`]);
    });

    // Odchytávání Promise chyb (např. fetch fail)
    window.addEventListener('unhandledrejection', (event) => {
        logToScreen('error', [`UNHANDLED PROMISE: ${event.reason}`]);
    });

})();
// === DEBUG LOGGER END ===

const API_BASE = "https://learn-base-backend.vercel.app";
// ... zbytek tvého kódu ...
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