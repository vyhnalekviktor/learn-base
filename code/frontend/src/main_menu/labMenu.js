import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // 84532 hex

window.addEventListener('load', async () => {
  let loadingOverlay = null;

  try {
    await sdk.actions.ready();
    loadingOverlay = showLoadingOverlay();

    // ====== 1. POUŽIJ WALLET CACHE Z COMMON.JS ======
    let wallet = null;
    let sepolia_status = null;

    // Zkus cache z common.js (čeká max 3s)
    if (window.BaseCampTheme?.waitForWallet) {
      try {
        const cache = await window.BaseCampTheme.waitForWallet();
        wallet = cache.wallet;
        sepolia_status = cache.sepolia_status;
        console.log('✅ labMenu: Wallet from cache:', wallet, 'Sepolia:', sepolia_status);
      } catch (err) {
        console.log('⏱️ labMenu: Cache timeout, trying SDK...', err);
      }
    }

    // Fallback: SDK request (pouze pokud cache selhala)
    if (!wallet) {
      const ethProvider = await sdk.wallet.ethProvider;
      if (!ethProvider) {
        hideLoadingOverlay(loadingOverlay);
        showCompatibilityWarning('wallet');
        return;
      }

      let accounts;
      try {
        accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
      } catch (e) {
        hideLoadingOverlay(loadingOverlay);
        showCompatibilityWarning('wallet');
        return;
      }

      wallet = accounts?.[0];
      if (!wallet) {
        hideLoadingOverlay(loadingOverlay);
        showCompatibilityWarning('wallet');
        return;
      }

      // Ulož do cache pro ostatní stránky
      localStorage.setItem('cached_wallet', wallet);
    }

    // Update UI
    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet.slice(0,6)+'...'+wallet.slice(-4);

    // ====== 2. SEPOLIA CHECK (pouze pokud není cached) ======
    if (!sepolia_status) {
      const ethProvider = await sdk.wallet.ethProvider;
      const supportsSepolia = await detectSepoliaSupportSimple(ethProvider, wallet);

      if (supportsSepolia) {
        localStorage.setItem('sepolia_status', 'ok');
        sepolia_status = 'ok';
      } else {
        await grantFullPracticeProgress(wallet);
        localStorage.setItem('sepolia_status', 'warning');
        sepolia_status = 'warning';
        showCompatibilityWarning('chain');
      }
    } else if (sepolia_status === 'warning') {
      // Už bylo detekováno dříve
      showCompatibilityWarning('chain');
    }

    // ====== 3. NAČTI PROGRESS ======
    hideLoadingOverlay(loadingOverlay);
    await getProgress(wallet);

  } catch (error) {
    console.error('❌ labMenu init error:', error);
    hideLoadingOverlay(loadingOverlay);
    showCompatibilityWarning('error');
  }
});

// 🔍 NAJLEPŠÍ SEPOLIA CHECK - testuje wallet_switchEthereumChain
async function detectSepoliaSupportSimple(ethProvider, wallet) {
  try {
    await ethProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }] // 84532 hex
    });
    return true;
  } catch (error) {
    // 4001 = User rejected → wallet PODPORUJE
    if (error.code === 4001) {
      return true;
    }
    // 4902 = Chain not configured → wallet NEPODPORUJE
    if (error.code === 4902) {
      return false;
    }
    // Ostatní chyby = neznámé
    return false;
  }
}

async function grantFullPracticeProgress(wallet) {
  if (!wallet) {
    return;
  }

  const fields = ['send', 'receive', 'mint', 'launch'];
  try {
    for (const field of fields) {
      const res = await fetch(`${API_BASE}/api/database/update_field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          tablename: 'USER_PROGRESS',
          field_name: field,
          value: true
        })
      });

      if (!res.ok) {
        console.warn(`⚠️ Failed to grant ${field} progress`);
      }
    }
    console.log('✅ Full practice progress granted (no Sepolia support)');
  } catch (error) {
    console.error('❌ grantFullPracticeProgress error:', error);
  }
}

// ====== PROGRESS TRACKING ======
async function getProgress(wallet) {
  if (!wallet) return;

  try {
    const res = await fetch(`${API_BASE}/api/database/get-user?wallet=${encodeURIComponent(wallet)}`);

    if (!res.ok) {
      console.error('❌ Failed to fetch progress:', res.status);
      return;
    }

    const data = await res.json();
    console.log('📊 User progress:', data);

    // Update progress bars (zkontroluj že elementy existují)
    updateProgressBar('theory', data.theory);
    updateProgressBar('faucet', data.faucet);
    updateProgressBar('send', data.send);
    updateProgressBar('receive', data.receive);
    updateProgressBar('mint', data.mint);
    updateProgressBar('launch', data.launch);
    updateProgressBar('security', data.security);

  } catch (error) {
    console.error('❌ getProgress error:', error);
  }
}

function updateProgressBar(labName, completed) {
  const progressBar = document.getElementById(`progress-${labName}`);
  const statusIcon = document.getElementById(`status-${labName}`);

  if (progressBar) {
    progressBar.style.width = completed ? '100%' : '0%';
    progressBar.style.background = completed ? '#10b981' : '#3b82f6';
  }

  if (statusIcon) {
    if (completed) {
      statusIcon.textContent = '✓';
      statusIcon.style.background = '#10b981';
    } else {
      statusIcon.textContent = '○';
      statusIcon.style.background = 'transparent';
      statusIcon.style.border = '2px solid #64748b';
    }
  }
}

function showLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(2,6,23,0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(8px);
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 48px;
    height: 48px;
    border: 4px solid rgba(96,165,250,0.2);
    border-top-color: #60a5fa;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;

  const text = document.createElement('div');
  text.style.cssText = `
    margin-top: 20px;
    color: #e5e7eb;
    font-size: 15px;
    font-weight: 600;
    font-family: system-ui, -apple-system, Inter;
  `;
  text.textContent = 'Checking wallet & network...';

  overlay.append(spinner, text);

  document.head.appendChild(document.createElement('style')).textContent =
    '@keyframes spin { to { transform: rotate(360deg); } }';

  document.body.appendChild(overlay);
  return overlay;
}

function hideLoadingOverlay(overlay) {
  if (overlay?.parentNode) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => overlay.parentNode?.removeChild(overlay), 300);
  }
}

function showCompatibilityWarning(type) {
  const messages = {
    wallet: { title: 'Wallet Required', msg: 'Open in Coinbase Wallet/Base App', color: '#ff6b6b' },
    chain: { title: 'Limited Network', msg: 'Auto progress granted - you can still mint badge!', color: '#f59e0b' },
    error: { title: 'Init Error', msg: 'Try Coinbase Wallet or refresh', color: '#ef4444' }
  };

  const { title, msg, color } = messages[type] || messages.error;

  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, ${color}00, ${color}cc);
    color: white;
    padding: 14px 18px;
    text-align: center;
    z-index: 10000;
    font-family: system-ui, -apple-system;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  banner.innerHTML = `
    <strong>${title}:</strong> ${msg}
  `;

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transition = 'opacity 0.5s ease';
    setTimeout(() => banner.parentNode?.removeChild(banner), 500);
  }, 5000);
}
