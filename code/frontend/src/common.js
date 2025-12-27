(function() {
'use strict';

const API_URL = 'https://learn-base-backend.vercel.app';

// === 1. OKAMŽITÉ NASTAVENÍ THEME ===
(function setThemeImmediately() {
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = savedTheme || (prefersLight ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);
})();

// === 2. DETEKCE FARCASTERU ===
function isFarcasterMiniApp() {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('warpcast') || ua.includes('farcaster');
}

// === 3. HLAVNÍ LOGIKA (BaseCampTheme) ===
window.BaseCampTheme = {

  // A) Toggle Theme
  toggleTheme: () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  },

  isFarcaster: isFarcasterMiniApp,

  // B) Init User Data (Stáhnout z backendu)
  initUserData: async (wallet) => {
    if (!wallet) return;
    try {
      console.log(`[Common] Fetching data for ${wallet}...`);
      const res = await fetch(`${API_URL}/api/database/get-user-data?wallet_address=${wallet}`);
      if (res.ok) {
        const data = await res.json();
        const cacheObj = {
          info: data.info || {},
          progress: data.progress || {},
          timestamp: Date.now()
        };
        sessionStorage.setItem('user_data_cache', JSON.stringify(cacheObj));
        console.log('[Common] Data cached:', cacheObj);

        // Pokud jsme na podstránce, hned překresli UI
        window.BaseCampTheme.refreshUI();
      }
    } catch (e) {
      console.error('[Common] Failed to fetch user data:', e);
    }
  },

  // C) Get User Data (Bezpečné čtení)
  // OPRAVA: Nikdy nevrací null, vrací prázdný objekt, aby UI nezamrzlo
  getUserData: () => {
    const raw = sessionStorage.getItem('user_data_cache');
    if (!raw) {
        // Fallback: vrátíme prázdné progressy, dokud se data nenačtou
        return { progress: {}, info: {} };
    }
    return JSON.parse(raw);
  },

  // D) Update Local Progress (Optimistic UI)
  updateLocalProgress: (field, value) => {
    const raw = sessionStorage.getItem('user_data_cache');
    let data = raw ? JSON.parse(raw) : { progress: {}, info: {} };

    if (!data.progress) data.progress = {};
    data.progress[field] = value;

    sessionStorage.setItem('user_data_cache', JSON.stringify(data));
    console.log(`[Common] Local update: ${field} = ${value}`);

    // Hned aktualizuj UI na stránce
    window.BaseCampTheme.refreshUI();
  },

  // E) Refresh UI (Najde elementy a aktualizuje je)
  refreshUI: () => {
    const data = window.BaseCampTheme.getUserData();
    const progress = data.progress || {};

    console.log("[Common] Refreshing UI with progress:", progress);

    // 1. Najdi všechny elementy s atributem data-lab-progress (např. progress bary)
    // Hledá elementy jako: <div class="progress-fill" data-lab-progress="lab1">
    document.querySelectorAll('[data-lab-progress]').forEach(el => {
        const labKey = el.getAttribute('data-lab-progress');
        const isDone = progress[labKey] === true;

        if (el.classList.contains('progress-fill')) {
             el.style.width = isDone ? '100%' : '0%';
        }
    });

    // 2. Najdi status texty (Pending/Completed)
    // Hledá elementy jako: <span class="status-text" data-lab-status="lab1">
    document.querySelectorAll('[data-lab-status]').forEach(el => {
        const labKey = el.getAttribute('data-lab-status');
        const isDone = progress[labKey] === true;

        el.textContent = isDone ? 'Completed' : 'Pending';
        el.style.color = isDone ? '#22c55e' : '#94a3b8';
    });

    // 3. Reset Loading indikátorů
    // Pokud někde svítí "Loading...", změň to na "-" nebo skryj
    document.querySelectorAll('.loading-indicator').forEach(el => {
        el.style.display = 'none';
    });
  },

  // F) Záchranná funkce pro podstránky
  ensureDataLoaded: async () => {
      // Pokud nemáme data, ale máme peněženku v cache, zkusíme je stáhnout znovu
      const rawData = sessionStorage.getItem('user_data_cache');
      const wallet = sessionStorage.getItem('cached_wallet');

      // Pokud nemáme data, ale víme kdo je uživatel -> stáhneme je
      if (!rawData && wallet) {
          console.log("[Common] Missing data on subpage, fetching...");
          await window.BaseCampTheme.initUserData(wallet);
      } else {
          // Data buď máme, nebo nemáme ani peněženku -> jen překreslíme UI (aby zmizelo Loading)
          window.BaseCampTheme.refreshUI();
      }
  },

  // G) Reset UI (pro Guest Mode v index.js)
  resetProgressUI: () => {
      document.querySelectorAll('.loading-indicator').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.progress-fill').forEach(bar => bar.style.width = '0%');
  },

  // H) Helper pro Labs (čekání na peněženku)
  waitForWallet: async () => {
      let attempts = 0;
      while (attempts < 20) { // 4 sekundy timeout
          const w = sessionStorage.getItem('cached_wallet');
          if (w) return { wallet: w };
          await new Promise(r => setTimeout(r, 200));
          attempts++;
      }
      return { wallet: null };
  }
};

// === 4. AUTO-START NA PODSTRÁNKÁCH ===
// Jakmile se načte DOM, zkontroluj data
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.BaseCampTheme.ensureDataLoaded());
} else {
    window.BaseCampTheme.ensureDataLoaded();
}

})();