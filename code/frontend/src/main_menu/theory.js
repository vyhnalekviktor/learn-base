import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
let currentWallet = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await sdk.actions.ready();

    if (window.BaseCampTheme?.waitForWallet) {
      try {
        const cache = await window.BaseCampTheme.waitForWallet();
        currentWallet = cache.wallet;
      } catch (err) {}
    }

    if (!currentWallet) return;

    const span = document.getElementById('wallet-address');
    if (span) span.textContent = currentWallet.slice(0,6)+'...'+currentWallet.slice(-4);

    renderTheoryProgress(currentWallet);
  } catch (error) {
    console.error('Init error:', error);
  }
});

async function renderTheoryProgress(wallet) {
    let data = window.BaseCampTheme?.getUserData();
    if (!data) {
        await window.BaseCampTheme.initUserData(wallet);
        data = window.BaseCampTheme.getUserData();
    }

    if (!data || !data.progress) return;
    const progress = data.progress;

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

  const header = document.querySelector(`[onclick="toggleAccordion('${sectionId}')"]`);
  if (header) header.classList.add('completed');
}

function updateProgressBar(percent) {
  const percentEl = document.getElementById('theory-progress-percent');
  const barEl = document.getElementById('theory-progress-bar-fill');
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (barEl) barEl.style.width = `${percent}%`;
}

// Při otevření akordeonu uložíme progress
function toggleAccordion(sectionId) {
  const content = document.getElementById('content-' + sectionId);
  const icon = document.getElementById('icon-' + sectionId);
  if (!content || !icon) return;

  const isOpen = content.classList.contains('active');

  // Reset ostatních
  document.querySelectorAll('.accordion-content').forEach(c => {
    c.classList.remove('active');
    c.style.maxHeight = null;
  });
  document.querySelectorAll('.accordion-icon').forEach(i => {
    i.textContent = '▼';
    i.classList.remove('active');
  });

  if (!isOpen) {
    content.classList.add('active');
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.textContent = '▲';
    icon.classList.add('active');

    // Save Progress
    const sectionMap = {
      'core-blockchain': 1,
      'wallet-security': 2,
      'tokens-standards': 3,
      'base-network': 4,
      'smart-contracts': 5
    };
    const num = sectionMap[sectionId];
    if (num && currentWallet) {
        saveTheoryProgress(num);
    }
  }
}

async function saveTheoryProgress(num) {
    // 1. Optimistic Cache Update
    if (window.BaseCampTheme) {
        window.BaseCampTheme.updateLocalProgress(`theory${num}`, true);
        // Hned překreslíme progress bar, ať uživatel vidí posun
        renderTheoryProgress(currentWallet);
    }

    // 2. DB Update
    try {
        await fetch(`${API_BASE}/api/database/update_field`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet: currentWallet,
                table_name: 'USER_PROGRESS',
                field_name: `theory${num}`,
                value: true
            })
        });
    } catch (e) {
        console.error('Save theory error', e);
    }
}

window.toggleAccordion = toggleAccordion;