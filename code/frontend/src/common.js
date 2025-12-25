// src/theme.js - FIXED NO FLASH + FULL WALLET CACHE (wallet + sepolia_status)
(function() {
  'use strict';

  const BASE_SEPOLIA_CHAIN_ID_DEC = 84532;

  // === 1. KRITICKÉ: NASTAV THEME IHNED PŘED PRVNÍM PAINTEM ===
  (function setThemeImmediately() {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = savedTheme || (prefersLight ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.classList.add(theme);
    }
  })();

async function initWalletCache() {
  const { sdk } = await import("https://esm.sh/@farcaster/miniapp-sdk");

  const cachedWallet = localStorage.getItem('cached_wallet');
  const sepoliaStatus = localStorage.getItem('sepolia_status');

  if (cachedWallet && sepoliaStatus) {
    console.log('Full cache hit (wallet + sepolia):', cachedWallet, sepoliaStatus);
    return;
  }

  try {
    await sdk.actions.ready();
    const ethProvider = await sdk.wallet.ethProvider;

    if (!ethProvider) {
      localStorage.setItem('sepolia_status', 'error');
      console.log('No ethProvider - cached sepolia_status: error');
      return;
    }

    let accounts;
    try {
      accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    } catch (e) {
      // TADY JISTÍŠ PÁD provideru
      console.log('eth_requestAccounts failed in theme.js:', e);
      localStorage.setItem('sepolia_status', 'error');
      return;
    }

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;
    if (!wallet) {
      localStorage.setItem('sepolia_status', 'error');
      console.log('No wallet - cached sepolia_status: error');
      return;
    }

    localStorage.setItem('cached_wallet', wallet);

    let supportsSepolia = false;
    try {
      const chainIdHex = await ethProvider.request({ method: "eth_chainId" });
      const chainIdDec = parseInt(chainIdHex, 16);
      supportsSepolia = chainIdDec === BASE_SEPOLIA_CHAIN_ID_DEC;
    } catch (e) {
      console.log('Simple Sepolia check failed:', e);
    }

    const status = supportsSepolia ? 'ok' : 'warning';
    localStorage.setItem('sepolia_status', status);
    console.log(`Full cache set: wallet=${wallet}, sepolia_status=${status}`);
  } catch (error) {
    console.log('Wallet/Sepolia caching failed:', error);
    localStorage.setItem('sepolia_status', 'error');
  }
}


  async function detectBaseSepoliaSupport(ethProvider) {
    try {
      const chainIdHex = await ethProvider.request({ method: "eth_chainId" });
      const chainIdDec = parseInt(chainIdHex, 16);
      return chainIdDec === BASE_SEPOLIA_CHAIN_ID_DEC;
    } catch (e) {
      console.log('Simple Sepolia check failed:', e);
      return false;
    }
  }

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
    const icon = toggle ? toggle.querySelector('.theme-toggle-icon') : null;

    if (toggle) {
      const isDark = defaultTheme === 'dark';
      toggle.classList.toggle('on', isDark);
      if (icon) icon.textContent = isDark ? '🌙' : '☀️';
    }
  }

  function setupToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const icon = toggle.querySelector('.theme-toggle-icon');

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
      if (icon) icon.textContent = isDark ? '🌙' : '☀️';

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

  // Public API
  window.BaseCampTheme = {
    init: () => {
      initTheme();
      setupToggle();
      setupSystemPreferenceListener();

      // Full wallet + sepolia cache v backgroundu (neblokuje UI)
      setTimeout(() => initWalletCache().catch(console.error), 100);
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
    // API pro ostatní JS soubory
    getWalletCache: () => ({
      wallet: localStorage.getItem('cached_wallet'),
      sepolia_status: localStorage.getItem('sepolia_status')
    })
  };

  // Automatická inicializace po načtení DOM (SYNCHRONNÍ!)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.BaseCampTheme.init);
  } else {
    window.BaseCampTheme.init();
  }
})();
