import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

// Loader functions (stejné jako předtím)
function showLoadingOverlay() { /* ... tvůj kód ... */ }
function hideLoadingOverlay() { /* ... tvůj kód ... */ }

document.addEventListener('DOMContentLoaded', async () => {
  // Jen pokud chceme zobrazit loader při prvním načítání (volitelné)
  // showLoadingOverlay();

  try {
    await sdk.actions.ready();

    // 1. Wallet z cache
    let wallet = null;
    let sepoliaStatus = null;

    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            wallet = cache.wallet;
            sepoliaStatus = cache.sepolia_status;
        } catch (e) {}
    }

    if (!wallet) {
      // hideLoadingOverlay();
      showCompatibilityWarning('wallet');
      return;
    }

    const span = document.getElementById('wallet-address');
    if (span) span.textContent = `${wallet.slice(0,6)}...${wallet.slice(-4)}`;

    // 2. Auto-grant check
    if (sepoliaStatus === 'warning' || sepoliaStatus === 'error') {
      console.log('Auto-granting progress...');
      await grantFullPracticeProgress(wallet);
      showCompatibilityWarning('chain');
    }

    // 3. Render Progress (z Cache)
    renderProgressFromCache(wallet);

  } catch (error) {
    console.error('[LabMenu] Init error:', error);
  } finally {
    // hideLoadingOverlay();
  }
});

async function renderProgressFromCache(wallet) {
    let data = window.BaseCampTheme?.getUserData();

    if (!data) {
        await window.BaseCampTheme.initUserData(wallet);
        data = window.BaseCampTheme.getUserData();
    }

    if (!data || !data.progress) return;
    const progress = data.progress;

    const labs = ['faucet', 'send', 'receive', 'mint', 'launch'];
    let completedCount = 0;

    labs.forEach(lab => {
      if (progress[lab]) {
        completedCount++;
        const item = document.getElementById(`item-${lab}`);
        if (item) item.classList.add('completed');
      }
    });

    const percent = Math.round((completedCount / labs.length) * 100);
    const percentEl = document.getElementById('progress-percent');
    const barEl = document.getElementById('progress-bar-fill');

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (barEl) barEl.style.width = `${percent}%`;
}

async function grantFullPracticeProgress(wallet) {
  if (!wallet) return;
  const fields = ['send', 'receive', 'mint', 'launch'];

  for (const field of fields) {
      // Optimistic cache update
      if (window.BaseCampTheme) window.BaseCampTheme.updateLocalProgress(field, true);

      // DB update (no await to prevent blocking UI)
      fetch(`${API_BASE}/api/database/update_field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet,
          table_name: 'USER_PROGRESS',
          field_name: field,
          value: true
        })
      }).catch(e => console.warn('Auto-grant failed', field));
  }
}

function showCompatibilityWarning(type) {
    // ... tvůj existující kód pro Toast ...
    // (zkopíruj si funkci showCompatibilityWarning z předchozí verze)
}