(function() {
'use strict';

const BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34'; // 84532
const API_URL = 'https://learn-base-backend.vercel.app'; // Backend URL for caching

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

  // If we are in Farcaster context, we might want to wait or check SDK
  // But common.js is synchronous, so we just provide helper methods below.
}

// Initialize cache check
initWalletCache();

// === 3. GLOBAL EXPORTS (BaseCampTheme) ===
window.BaseCampTheme = {

  toggleTheme: () => {
    const current = document.documentElement.getAttribute('data-theme');
    const theme = current === 'dark' ? 'light' : 'dark';
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
    sessionStorage.removeItem('user_data_cache'); // Clear user data too
    console.log('[Common] Wallet session cache cleared');
  },

  // === USER DATA CACHING (Frontend) ===

  // 1. Fetch data from DB and save to session (call this on app init)
  initUserData: async (wallet) => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API_URL}/api/database/get-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet })
      });
      const data = await res.json();

      if (data.success) {
        // Save the whole object (info + progress) to sessionStorage
        const cacheObj = {
          info: data.info,
          progress: data.progress,
          timestamp: Date.now()
        };
        sessionStorage.setItem('user_data_cache', JSON.stringify(cacheObj));
        console.log('[Common] User data downloaded & cached');
      }
    } catch (e) {
      console.error('[Common] Failed to cache user data:', e);
    }
  },

  // 2. Return data from cache (instant). Returns null if missing.
  getUserData: () => {
    const raw = sessionStorage.getItem('user_data_cache');
    if (!raw) return null;
    return JSON.parse(raw);
  },

  // 3. Update cache locally (Optimistic UI)
  updateLocalProgress: (field, value) => {
    const raw = sessionStorage.getItem('user_data_cache');
    if (!raw) return;

    let data = JSON.parse(raw);

    // Check if it belongs to 'progress' or 'info' object
    if (data.progress && data.progress.hasOwnProperty(field)) {
      data.progress[field] = value;
    } else if (data.info && data.info.hasOwnProperty(field)) {
      data.info[field] = value;
    }

    // Save updated version back to storage
    sessionStorage.setItem('user_data_cache', JSON.stringify(data));
    console.log(`[Common] Cache updated locally: ${field} = ${value}`);
  },

  isFarcaster: isFarcasterMiniApp
};

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // console.log('[Common] DOM Loaded');
  });
} else {
  // console.log('[Common] DOM already loaded');
}

})();