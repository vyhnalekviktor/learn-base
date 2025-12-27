(function() {
'use strict';

const BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34'; // 84532

// === 1. SET THEME IMMEDIATELY (no flash) ===
// Uses localStorage to persist theme across sessions
(function setThemeImmediately() {
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = savedTheme || (prefersLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);
  if (document.body) {
    document.body.classList.add(theme);
  }
})();

// Detect Farcaster Environment
function isFarcasterMiniApp() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isFarcaster = userAgent.includes('farcaster') ||
                      userAgent.includes('warpcast') ||
                      window.location.hostname.includes('farcaster') ||
                      window.location.hostname.includes('warpcast');

  console.log('[Common] Farcaster detection:', isFarcaster, '| UA:', userAgent);
  return isFarcaster;
}

// === 2. WALLET CACHE ===
// Uses sessionStorage so wallet resets when app/tab is closed
async function initWalletCache() {
  const cachedWallet = sessionStorage.getItem('cached_wallet');
  const sepoliaStatus = sessionStorage.getItem('sepolia_status');

  if (cachedWallet && sepoliaStatus) {
    console.log('[Common] Session cache hit:', cachedWallet, sepoliaStatus);
    return;
  }

  try {
    const { sdk } = await import("https://esm.sh/@farcaster/miniapp-sdk");
    await sdk.actions.ready();

    const ethProvider = await sdk.wallet.ethProvider;
    if (!ethProvider) {
      console.log('[Common] Warning: No ethProvider available');
      sessionStorage.setItem('sepolia_status', 'error');
      sessionStorage.setItem('cached_wallet', '');
      return;
    }

    let accounts;
    try {
      accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    } catch (e) {
      console.log('[Common] Warning: eth_requestAccounts failed:', e.message);
      sessionStorage.setItem('sepolia_status', 'error');
      sessionStorage.setItem('cached_wallet', '');
      return;
    }

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      console.log('[Common] Warning: No wallet in accounts');
      sessionStorage.setItem('sepolia_status', 'error');
      sessionStorage.setItem('cached_wallet', '');
      return;
    }

    // Cache wallet to session storage
    sessionStorage.setItem('cached_wallet', wallet);
    console.log('[Common] Wallet cached to session:', wallet);

    const isFarcaster = isFarcasterMiniApp();

    if (isFarcaster) {
      // Force warning for Farcaster - no Sepolia support in webview usually
      sessionStorage.setItem('sepolia_status', 'warning');
      console.log('[Common] Farcaster detected: Forcing sepolia_status=warning');
      return;
    }

    // Check for Sepolia support (non-Farcaster wallets)
    let supportsSepolia = false;
    try {
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }]
      });
      supportsSepolia = true;
    } catch (e) {
      if (e.code === 4001) supportsSepolia = true; // User rejected request, but chain is supported
      else if (e.code === 4902) supportsSepolia = false; // Chain not added
      else supportsSepolia = false;
    }

    const status = supportsSepolia ? 'ok' : 'warning';
    sessionStorage.setItem('sepolia_status', status);
    console.log(`[Common] Cache complete: wallet=${wallet.slice(0,6)}... sepolia=${status}`);

  } catch (error) {
    console.error('[Common] Error: Wallet cache init failed:', error.message);
    sessionStorage.setItem('sepolia_status', 'error');
    sessionStorage.setItem('cached_wallet', '');
  }
}

// === 3. THEME FUNCTIONS ===
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const defaultTheme = savedTheme || (prefersLight ? 'light' : 'dark');

  document.documentElement.setAttribute('data-theme', defaultTheme);
  if (document.body) {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(defaultTheme);
  }

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    const isDark = defaultTheme === 'dark';
    toggle.classList.toggle('on', isDark);
  }
}

function setupToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', next);
    if (document.body) {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(next);
    }

    localStorage.setItem('theme', next);
    const isDark = next === 'dark';
    toggle.classList.toggle('on', isDark);

    document.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme: next }
    }));
  });

  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle.click();
    }
  });
}

function setupSystemPreferenceListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  mediaQuery.addEventListener('change', (e) => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      const newTheme = e.matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      if (document.body) {
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(newTheme);
      }
      const toggle = document.getElementById('themeToggle');
      if (toggle) {
        toggle.classList.toggle('on', newTheme === 'dark');
      }
    }
  });
}

// === 4. PUBLIC API ===
window.BaseCampTheme = {
  init: () => {
    initTheme();
    setupToggle();
    setupSystemPreferenceListener();
    initWalletCache().catch(console.error);
  },

  getCurrentTheme: () => document.documentElement.getAttribute('data-theme'),

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  },

  getWalletCache: () => ({
    // Reading from sessionStorage
    wallet: sessionStorage.getItem('cached_wallet') || null,
    sepolia_status: sessionStorage.getItem('sepolia_status') || null
  }),

  waitForWallet: () => {
    return new Promise((resolve, reject) => {
      const maxAttempts = 60; // 3s timeout (60 * 50ms)
      let attempts = 0;

      const check = () => {
        const wallet = sessionStorage.getItem('cached_wallet');
        const sepolia = sessionStorage.getItem('sepolia_status');

        if (wallet !== null && sepolia !== null) {
          resolve({
            wallet: wallet || null,
            sepolia_status: sepolia
          });
        } else if (attempts >= maxAttempts) {
          reject(new Error('Wallet cache timeout after 3s'));
        } else {
          attempts++;
          setTimeout(check, 50);
        }
      };

      check();
    });
  },

  clearCache: () => {
    sessionStorage.removeItem('cached_wallet');
    sessionStorage.removeItem('sepolia_status');
    console.log('[Common] Wallet session cache cleared');
  },

  isFarcaster: isFarcasterMiniApp
};

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.BaseCampTheme.init);
} else {
  window.BaseCampTheme.init();
}

})();