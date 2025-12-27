// src/common.js - FIXED WITH FARCASTER DETECTION

(function() {
'use strict';

const BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34'; // 84532

// === 1. SET THEME IMMEDIATELY (no flash) ===
(function setThemeImmediately() {
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = savedTheme || (prefersLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);
  if (document.body) {
    document.body.classList.add(theme);
  }
})();

// ✅ DETECT FARCASTER ENVIRONMENT
function isFarcasterMiniApp() {
  // Check for Farcaster-specific indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const isFarcaster = userAgent.includes('farcaster') ||
                      userAgent.includes('warpcast') ||
                      window.location.hostname.includes('farcaster') ||
                      window.location.hostname.includes('warpcast');

  console.log('🔍 Farcaster detection:', isFarcaster, '| UA:', userAgent);
  return isFarcaster;
}

// === 2. WALLET CACHE - FIXED VERSION WITH FARCASTER DETECTION ===
async function initWalletCache() {
  const cachedWallet = localStorage.getItem('cached_wallet');
  const sepoliaStatus = localStorage.getItem('sepolia_status');

  if (cachedWallet && sepoliaStatus) {
    console.log('✅ Full cache hit:', cachedWallet, sepoliaStatus);
    return;
  }

  try {
    const { sdk } = await import("https://esm.sh/@farcaster/miniapp-sdk");
    await sdk.actions.ready();

    const ethProvider = await sdk.wallet.ethProvider;
    if (!ethProvider) {
      console.log('⚠️ No ethProvider available');
      localStorage.setItem('sepolia_status', 'error');
      localStorage.setItem('cached_wallet', '');
      return;
    }

    let accounts;
    try {
      accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    } catch (e) {
      console.log('⚠️ eth_requestAccounts failed:', e.message);
      localStorage.setItem('sepolia_status', 'error');
      localStorage.setItem('cached_wallet', '');
      return;
    }

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      console.log('⚠️ No wallet in accounts');
      localStorage.setItem('sepolia_status', 'error');
      localStorage.setItem('cached_wallet', '');
      return;
    }

    // ✅ Cache wallet FIRST
    localStorage.setItem('cached_wallet', wallet);
    console.log('✅ Wallet cached:', wallet);

    // ✅ CHECK IF FARCASTER MINIAPP
    const isFarcaster = isFarcasterMiniApp();

    if (isFarcaster) {
      // ✅ FORCE WARNING for Farcaster - no Sepolia support
      localStorage.setItem('sepolia_status', 'warning');
      console.log('⚠️ Farcaster detected: Forcing sepolia_status=warning (no testnet support)');
      return;
    }

    // ✅ PROPER SEPOLIA TEST for non-Farcaster wallets
    let supportsSepolia = false;
    try {
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }]
      });
      supportsSepolia = true;
      console.log('✅ Sepolia switch: SUCCESS');
    } catch (e) {
      if (e.code === 4001) {
        supportsSepolia = true;
        console.log('✅ Sepolia switch: User rejected (but supported)');
      } else if (e.code === 4902) {
        supportsSepolia = false;
        console.log('❌ Sepolia switch: Chain not configured (not supported)');
      } else {
        supportsSepolia = false;
        console.log('❌ Sepolia switch: Error', e.code, e.message);
      }
    }

    const status = supportsSepolia ? 'ok' : 'warning';
    localStorage.setItem('sepolia_status', status);
    console.log(`✅ Cache complete: wallet=${wallet.slice(0,6)}... sepolia=${status}`);

  } catch (error) {
    console.log('❌ Wallet cache init failed:', error.message);
    localStorage.setItem('sepolia_status', 'error');
    localStorage.setItem('cached_wallet', '');
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
    wallet: localStorage.getItem('cached_wallet') || null,
    sepolia_status: localStorage.getItem('sepolia_status') || null
  }),

  waitForWallet: () => {
    return new Promise((resolve, reject) => {
      const maxAttempts = 60; // 3s timeout
      let attempts = 0;

      const check = () => {
        const wallet = localStorage.getItem('cached_wallet');
        const sepolia = localStorage.getItem('sepolia_status');

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
    localStorage.removeItem('cached_wallet');
    localStorage.removeItem('sepolia_status');
    console.log('🗑️ Wallet cache cleared');
  },

  // ✅ NEW: Check if running in Farcaster
  isFarcaster: isFarcasterMiniApp
};

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.BaseCampTheme.init);
} else {
  window.BaseCampTheme.init();
}

})();