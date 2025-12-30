(function() {
'use strict';

const API_URL = 'https://learn-base-backend.vercel.app';

// === 1. THEME ===
(function setThemeImmediately() {
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = savedTheme || (prefersLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);
})();

// === 3. HLAVNÍ LOGIKA ===
window.BaseCampTheme = {

  toggleTheme: () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  },

  // --- DATA SYNC ---
  initUserData: async (wallet) => {
    if (!wallet) return;
    try {
      const res = await fetch(`${API_URL}/api/database/get-user-data?wallet_address=${wallet}`);
      if (res.ok) {
        const data = await res.json();
        const cacheObj = {
          info: data.info || {},
          progress: data.progress || {},
          timestamp: Date.now()
        };
        sessionStorage.setItem('user_data_cache', JSON.stringify(cacheObj));
        window.BaseCampTheme.refreshUI();
      }
    } catch (e) {
      console.error('[Common] Failed to fetch user data:', e);
    }
  },

  getUserData: () => {
    const raw = sessionStorage.getItem('user_data_cache');
    return raw ? JSON.parse(raw) : { progress: {}, info: {} };
  },

  updateLocalProgress: (field, value) => {
    const raw = sessionStorage.getItem('user_data_cache');
    let data = raw ? JSON.parse(raw) : { progress: {}, info: {} };
    if (!data.progress) data.progress = {};
    data.progress[field] = value;
    sessionStorage.setItem('user_data_cache', JSON.stringify(data));
    window.BaseCampTheme.refreshUI();
  },

  updateLocalInfo: (field, value) => {
    const raw = sessionStorage.getItem('user_data_cache');
    let data = raw ? JSON.parse(raw) : { progress: {}, info: {} };
    if (!data.info) data.info = {};
    data.info[field] = value;
    sessionStorage.setItem('user_data_cache', JSON.stringify(data));
    window.BaseCampTheme.refreshUI();
  },
  // --- UI REFRESH ---
  refreshUI: () => {
    const data = window.BaseCampTheme.getUserData();
    const progress = data.progress || {};

    // 1. Progress bary
    document.querySelectorAll('[data-lab-progress]').forEach(el => {
        const key = el.getAttribute('data-lab-progress');
        if (el.classList.contains('progress-fill')) {
             el.style.width = (progress[key] === true) ? '100%' : '0%';
        }
    });

    // 2. Status texty
    document.querySelectorAll('[data-lab-status]').forEach(el => {
        const key = el.getAttribute('data-lab-status');
        const isDone = progress[key] === true;
        el.textContent = isDone ? 'Completed' : 'Pending';
        el.style.color = isDone ? '#22c55e' : '#94a3b8';
    });

    // 3. Skrytí loaderů
    document.querySelectorAll('.loading-indicator').forEach(el => el.style.display = 'none');
  },

  ensureDataLoaded: async () => {
      const raw = sessionStorage.getItem('user_data_cache');
      const wallet = sessionStorage.getItem('cached_wallet');
      if (!raw && wallet) {
          await window.BaseCampTheme.initUserData(wallet);
      } else {
          window.BaseCampTheme.refreshUI();
      }
  },

  resetProgressUI: () => {
      document.querySelectorAll('.loading-indicator').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.progress-fill').forEach(bar => bar.style.width = '0%');
  },

  waitForWallet: async () => {
      let i = 0;
      while (i < 20) {
          const w = sessionStorage.getItem('cached_wallet');
          if (w) return { wallet: w };
          await new Promise(r => setTimeout(r, 200));
          i++;
      }
      return { wallet: null };
  },
};

// Auto-start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.BaseCampTheme.ensureDataLoaded());
} else {
    window.BaseCampTheme.ensureDataLoaded();
}

})();