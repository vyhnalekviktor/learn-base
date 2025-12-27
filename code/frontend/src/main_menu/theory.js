import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

let currentWallet = null;

async function initWallet() {
  try {
    console.log('Theory page loaded, calling sdk.actions.ready...');
    await sdk.actions.ready();

    let wallet = null;
    let cacheLoaded = false;

    // Try cache from common.js
    if (window.BaseCampTheme?.waitForWallet) {
      try {
        const cache = await window.BaseCampTheme.waitForWallet();
        cacheLoaded = true;
        wallet = cache.wallet;
        console.log('✅ theory: Wallet from cache:', wallet);
      } catch (err) {
        console.log('⏱️ theory: Cache timeout:', err);
      }
    }

    // Fallback: Direct sessionStorage check (ZMĚNA Z LOCALSTORAGE)
    if (!cacheLoaded) {
      wallet = sessionStorage.getItem('cached_wallet');
      console.log('📦 theory: Direct sessionStorage:', wallet);
    }

    if (!wallet || wallet === '') {
      console.warn('⚠️ No wallet available');
      return;
    }

    console.log('✅ Connected wallet:', wallet);
    currentWallet = wallet;

    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet.slice(0,6)+'...'+wallet.slice(-4);

    await ensureUserExists();
    await getTheoryProgress();
  } catch (error) {
    console.error('❌ theory wallet init error:', error);
  }
}
// ... zbytek souboru theory.js je stejný ...
// (kopíruj zbytek svého původního souboru od funkce ensureUserExists dolů)
async function ensureUserExists() {
  if (!currentWallet) return;

  try {
    const res = await fetch(`${API_BASE}/api/database/init-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: currentWallet })
    });

    if (!res.ok) {
      console.error('Failed to init user:', res.status);
      return;
    }

    const data = await res.json();
    console.log('User init:', data.created ? 'created' : 'exists');
  } catch (error) {
    console.error('ensureUserExists error:', error);
  }
}

async function getTheoryProgress() {
  if (!currentWallet) {
    console.warn('Wallet not available');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: currentWallet })
    });

    if (!res.ok) {
      console.error('Failed to load progress:', res.status);
      return;
    }

    const data = await res.json();
    if (!data.success) {
      console.error('API returned success=false');
      return;
    }

    const progress = data.progress;
    if (!progress) {
      console.error('No progress object');
      return;
    }

    const theoryFields = ['theory1', 'theory2', 'theory3', 'theory4', 'theory5'];
    let completed = 0;

    theoryFields.forEach((field, index) => {
      if (progress[field] === true) {
        completed++;
        markSectionCompleted(index + 1);
      }
    });

    const percent = Math.round((completed / theoryFields.length) * 100);
    updateProgressBar(percent);
    console.log(`Theory progress: ${percent}% (${completed}/5)`);
  } catch (error) {
    console.error('getTheoryProgress error:', error);
  }
}

function markSectionCompleted(sectionNumber) {
  const sectionMap = {
    1: 'core-blockchain',
    2: 'wallet-security',
    3: 'tokens-standards',
    4: 'base-network',
    5: 'smart-contracts'
  };

  const sectionId = sectionMap[sectionNumber];
  if (!sectionId) return;

  const header = document.querySelector(
    `[onclick="toggleAccordion('${sectionId}')"]`
  );

  if (header) {
    header.classList.add('completed');
    console.log(`Section ${sectionId} marked as completed`);
  }
}

function updateProgressBar(percent) {
  const percentEl = document.getElementById('theory-progress-percent');
  const barEl = document.getElementById('theory-progress-bar-fill');

  if (percentEl) {
    percentEl.textContent = `${percent}%`;
  }

  if (barEl) {
    barEl.style.width = `${percent}%`;
  }
}

async function updateTheoryProgress(sectionNumber) {
  if (!currentWallet) {
    console.warn('Wallet not available');
    return false;
  }

  try {
    console.log(`Updating theory${sectionNumber}...`);
    const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: currentWallet,
        table_name: 'USER_PROGRESS',
        field_name: `theory${sectionNumber}`,
        value: true
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Update failed (${res.status}):`, errorText);
      return false;
    }

    console.log(`Theory${sectionNumber} saved`);
    await getTheoryProgress();
    return true;
  } catch (error) {
    console.error('updateTheoryProgress error:', error);
    return false;
  }
}

function toggleAccordion(sectionId) {
  const content = document.getElementById('content-' + sectionId);
  const icon = document.getElementById('icon-' + sectionId);

  if (!content || !icon) {
    console.error('Accordion elements not found:', sectionId);
    return;
  }

  const header = icon.parentElement;
  const isOpen = content.classList.contains('active');

  document.querySelectorAll('.accordion-content').forEach(c => {
    c.classList.remove('active');
    c.style.maxHeight = null;
  });

  document.querySelectorAll('.accordion-icon').forEach(i => {
    i.textContent = '▼';
    i.classList.remove('active');
  });

  document.querySelectorAll('.accordion-header').forEach(h => {
    if (!h.classList.contains('completed')) {
      // DARK DEFAULT STATE
      h.style.background = '#0b1120';
      h.style.color = '#e5e7eb';
    }
  });

  if (!isOpen) {
    content.classList.add('active');
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.textContent = '▲';
    icon.classList.add('active');

    if (!header.classList.contains('completed')) {
      header.style.background =
        'linear-gradient(135deg, #0052FF 0%, #0041CC 100%)';
      header.style.color = 'white';
    }

    const sectionMap = {
      'core-blockchain': 1,
      'wallet-security': 2,
      'tokens-standards': 3,
      'base-network': 4,
      'smart-contracts': 5
    };

    const sectionNumber = sectionMap[sectionId];
    if (sectionNumber) {
      console.log(`Opened section ${sectionId} -> theory${sectionNumber}`);
      updateTheoryProgress(sectionNumber);
    }
  }
}

window.addEventListener('load', initWallet);
window.toggleAccordion = toggleAccordion;