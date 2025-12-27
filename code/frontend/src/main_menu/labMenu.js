import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

// === HELPER: Show/Hide Loading Overlay ===
function showLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'lab-loader';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(5px);
    transition: opacity 0.3s ease;
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255,255,255,0.1);
    border-top-color: #0052ff;
    border-radius: 50%;
    animation: labSpin 0.8s linear infinite;
  `;

  const text = document.createElement('div');
  text.style.cssText = `
    margin-top: 20px;
    color: #e5e7eb;
    font-size: 15px;
    font-weight: 500;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  text.textContent = 'Verifying progress...';

  overlay.append(spinner, text);

  // Add keyframes if not exists
  if (!document.getElementById('lab-spin-style')) {
    const style = document.createElement('style');
    style.id = 'lab-spin-style';
    style.textContent = '@keyframes labSpin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);
  return overlay;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('lab-loader');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
  }
}

// === MAIN LOGIC ===
window.addEventListener('load', async () => {
  showLoadingOverlay();

  try {
    await sdk.actions.ready();

    // 1. GET WALLET (Wait for common.js logic)
    let wallet = null;
    let sepoliaStatus = null;

    try {
      if (window.BaseCampTheme?.waitForWallet) {
        const cache = await window.BaseCampTheme.waitForWallet();
        wallet = cache.wallet;
        sepoliaStatus = cache.sepolia_status;
        console.log('[LabMenu] Wallet loaded from cache:', wallet);
      }
    } catch (err) {
      console.log('[LabMenu] Cache timeout, trying session fallback:', err);
      // Fallback to sessionStorage
      wallet = sessionStorage.getItem('cached_wallet');
      sepoliaStatus = sessionStorage.getItem('sepolia_status');
    }

    // 2. CHECK IF WALLET EXISTS
    if (!wallet) {
      hideLoadingOverlay();
      showCompatibilityWarning('wallet');
      console.error('[LabMenu] No wallet available');
      return;
    }

    // 3. UPDATE UI
    const span = document.getElementById('wallet-address');
    if (span) span.textContent = `${wallet.slice(0,6)}...${wallet.slice(-4)}`;

    // 4. CHECK NETWORK SUPPORT (Auto-grant logic)
    // If status is 'warning' (Farcaster) or 'error', we grant progress for transaction labs
    // because the user cannot perform them easily in this environment.
    if (sepoliaStatus === 'warning' || sepoliaStatus === 'error') {
      console.log('[LabMenu] Network limited. Auto-granting 80% progress...');
      await grantFullPracticeProgress(wallet);
      showCompatibilityWarning('chain');
    }

    // 5. FETCH & RENDER PROGRESS
    await getProgress(wallet);

  } catch (error) {
    console.error('[LabMenu] Init error:', error);
    showCompatibilityWarning('error');
  } finally {
    hideLoadingOverlay();
  }
});

// === API FUNCTIONS ===

// Grant progress for all practice labs (skip logic)
async function grantFullPracticeProgress(wallet) {
  if (!wallet) return;

  // We grant 4 out of 5 labs (Faucet is excluded)
  const fields = ['send', 'receive', 'mint', 'launch'];

  for (const field of fields) {
    try {
      await fetch(`${API_BASE}/api/database/update_field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet,
          table_name: 'USER_PROGRESS',
          field_name: field,
          value: true
        })
      });
    } catch (error) {
      console.warn(`[LabMenu] Failed to auto-grant ${field}`);
    }
  }
  console.log('[LabMenu] Auto-grant complete');
}

// Fetch progress from DB and update UI
async function getProgress(wallet) {
  if (!wallet) return;

  try {
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet })
    });

    if (!res.ok) {
      console.error('[LabMenu] Failed to fetch progress:', res.status);
      return;
    }

    const data = await res.json();
    const progress = data.progress || {};

    // Total practice labs = 5
    const labs = ['faucet', 'send', 'receive', 'mint', 'launch'];
    let completedCount = 0;

    labs.forEach(lab => {
      if (progress[lab]) {
        completedCount++;
        const item = document.getElementById(`item-${lab}`);
        if (item) item.classList.add('completed');
      }
    });

    // Update Progress Bar
    const total = labs.length;
    const percent = Math.round((completedCount / total) * 100);

    const percentEl = document.getElementById('progress-percent');
    const barEl = document.getElementById('progress-bar-fill');

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (barEl) barEl.style.width = `${percent}%`;

    console.log(`[LabMenu] Progress loaded: ${percent}%`);

  } catch (error) {
    console.error('[LabMenu] getProgress error:', error);
  }
}

// === MODERN TOAST NOTIFICATION (NO EMOJIS, BETTER TEXT) ===
function showCompatibilityWarning(type) {
  // SVG Icons definitions (clean, outline style)
  const icons = {
    wallet: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,

    chain: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,

    error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`
  };

  const messages = {
    wallet: {
      title: 'Wallet Required',
      msg: 'Please connect a wallet to track your progress and earn the badge.',
      icon: icons.wallet,
      color: '#ef4444' // Red
    },
    chain: {
      // UPDATED TEXT: Explains WHY labs won't work and WHAT happens (80% progress)
      title: 'Limited Functionality',
      msg: 'Base Sepolia testnet is not detected. Practice labs may not work reliably, so we have auto-granted you 80% progress!',
      icon: icons.chain,
      color: '#f59e0b' // Amber/Orange
    },
    error: {
      title: 'Error',
      msg: 'Something went wrong while loading data. Please refresh the page.',
      icon: icons.error,
      color: '#ef4444'
    }
  };

  const config = messages[type] || messages.error;

  // Container creation
  const toast = document.createElement('div');

  // Styling matching the modern app feel (Glassmorphism)
  toast.style.cssText = `
    position: fixed;
    top: 20px; /* Safe area from top */
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    width: 90%;
    max-width: 400px;
    background: rgba(23, 23, 23, 0.95);
    backdrop-filter: blur(10px);
    color: white;
    padding: 16px;
    border-radius: 16px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    border-left: 6px solid ${config.color};
    border-top: 1px solid rgba(255,255,255,0.1);
    border-right: 1px solid rgba(255,255,255,0.1);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex;
    align-items: flex-start;
    gap: 14px;
  `;

  // Inject content with SVG icon
  toast.innerHTML = `
    <div style="color: ${config.color}; flex-shrink: 0; margin-top: 2px;">
      ${config.icon}
    </div>
    <div style="display: flex; flex-direction: column;">
        <strong style="font-size: 15px; margin-bottom: 4px; letter-spacing: 0.3px;">${config.title}</strong>
        <span style="opacity: 0.9; line-height: 1.4; color: #cbd5e1;">${config.msg}</span>
    </div>
  `;

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Auto-hide after 8 seconds (gave more time to read the longer message)
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';

    // Remove from DOM
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }, 8000);
}