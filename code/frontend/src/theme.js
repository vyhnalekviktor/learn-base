// src/theme.js - FIXED NO FLASH
(function() {
  'use strict';

  // === 1. KRITICKÉ: NASTAV THEME IHNED PŘED PRVNÍM PAINTEM ===
  (function setThemeImmediately() {
    const savedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = savedTheme || (prefersLight ? 'light' : 'dark');

    // NASTAV HNEĎ NA <html> a <body>
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.classList.add(theme);
    }
  })();

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


  // System preference změna listener - UPRAVENÉ
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

  // Public API - UPRAVENÉ
  window.BaseCampTheme = {
    init: () => {
      initTheme();
      setupToggle();
      setupSystemPreferenceListener();
    },
    getCurrentTheme: () => document.documentElement.getAttribute('data-theme'),
    setTheme: (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      if (document.body) {
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(theme);
      }
      localStorage.setItem('theme', theme);
    }
  };

  // Automatická inicializace po načtení DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.BaseCampTheme.init);
  } else {
    window.BaseCampTheme.init();
  }
})();
