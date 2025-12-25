import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
const BASE_SEPOLIA_CHAIN_ID_DEC = 84532;

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
  modal.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Inter', Inter";

  modal.innerHTML = `
BaseCamp is an interactive MiniApp for learning blockchain on Base (Ethereum L2).
Complete hands-on labs to earn an NFT completion badge! Read theory, try your first test operations and then test yourself for scam recognition.
<br>
You can complete all the steps for free!!<br>
<button id="welcome-close-btn" style="
    width: 100%;
    padding: 12px 18px;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg,#60a5fa,#3b82f6);
    color: #fff;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
  ">
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

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const icon = toggle.querySelector('.theme-toggle-icon');

  // Inicializace stavu podle uloženého / systémového theme
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initialTheme = savedTheme || (prefersLight ? 'light' : 'dark');

  document.documentElement.setAttribute('data-theme', initialTheme);
  const isDarkInit = initialTheme === 'dark';
  toggle.classList.toggle('on', isDarkInit);

  // Klikací logika
  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || initialTheme;
    const next = current === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);

    const isDark = next === 'dark';
    toggle.classList.toggle('on', isDark);
  });

  // Klávesnice (Enter/Space)
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle.click();
    }
  });
});


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

    let displayName = "satoshi, is it you? (unknown)";
    let fidDisplay = "";

    if (user) {
      displayName =
        user.displayName ||
        user.username ||
        (user.fid ? `FID ${user.fid}` : "");

      fidDisplay = user.username
        ? `@${user.username}`
        : user.fid
        ? `FID ${user.fid}`
        : "satoshi, is it you? (unknown)";
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

    console.log("User display:", {
      displayName,
      fidDisplay,
      avatarUrl,
      user,
    });

    // ====== WALLET (může selhat, ale theme už funguje) ======
    try {
      const ethProvider = await sdk.wallet.ethProvider;
      if (!ethProvider) {
        showCompatibilityWarning("wallet");
      } else {
        const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
        const wallet = accounts && accounts.length > 0 ? accounts[0] : null;
        if (wallet) {
          const span = document.getElementById("wallet-address");
          if (span) span.textContent = wallet;
          await initUserOnBackend(wallet);
        } else {
          showCompatibilityWarning("wallet");
        }
      }
    } catch (walletError) {
      console.warn("Wallet failed:", walletError);
      showCompatibilityWarning("wallet");
    }

  } catch (error) {
    console.error("Error during MiniApp init:", error);
    showCompatibilityWarning("error");
  }
});
