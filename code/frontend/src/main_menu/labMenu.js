import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';
const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // 84532 hex

window.addEventListener('load', async () => {
  let loadingOverlay = null;

  try {
    await sdk.actions.ready();
    loadingOverlay = showLoadingOverlay();

    // 1. Získej wallet
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

    const wallet = accounts?.[0];
    if (!wallet) {
      hideLoadingOverlay(loadingOverlay);
      showCompatibilityWarning('wallet');
      return;
    }

    // Update UI
    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet.slice(0,6)+'...'+wallet.slice(-4);

    // 2. 🔍 JEDNODUCHÝ SEPOLIA CHECK - wallet_switchEthereumChain
    const supportsSepolia = await detectSepoliaSupportSimple(ethProvider, wallet);

    if (supportsSepolia) {
      localStorage.setItem('sepolia_status', 'ok');
    } else {
      await grantFullPracticeProgress(wallet);
      localStorage.setItem('sepolia_status', 'warning');
      showCompatibilityWarning('chain');
    }

    // 3. Načti progress
    hideLoadingOverlay(loadingOverlay);
    await getProgress(wallet);

  } catch (error) {
    hideLoadingOverlay(loadingOverlay);
    showCompatibilityWarning('error');
  }
});

// 🔍 NAJLEPŠÍ SEPOLIA CHECK - testuje wallet_switchEthereumChain
async function detectSepoliaSupportSimple(ethProvider, wallet) {
  try {
    await ethProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }]  // 84532 hex
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
          wallet, tablename: 'USER_PROGRESS', field_name: field, value: true
        })
      });
    }
  } catch (error) {
      }
}

function showLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(2,6,23,0.95);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    z-index: 9999; backdrop-filter: blur(8px);
  `;
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 48px; height: 48px; border: 4px solid rgba(96,165,250,0.2);
    border-top-color: #60a5fa; border-radius: 50%; animation: spin 0.8s linear infinite;
  `;
  const text = document.createElement('div');
  text.style.cssText = `
    margin-top: 20px; color: #e5e7eb; font-size: 15px; font-weight: 600;
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
    position: fixed; top: 0; left: 0; right: 0;
    background: linear-gradient(135deg, ${color}00, ${color}cc); color: white;
    padding: 14px 18px; text-align: center; z-index: 10000;
    font-family: system-ui, -apple-system; font-size: 14px;
  `;

  banner.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto;">
      <button id="dismiss" style="
        position: absolute; top: 8px; right: 16px; width: 28px; height: 28px;
        background: rgba(255,255,255,0.25); border: none; border-radius: 50%;
        font-size: 18px; color: white; cursor: pointer;
      ">×</button>
      <div style="font-weight: 700;">${title}</div>
      <div style="opacity: 0.95; font-size: 13px;">${msg}</div>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);

  banner.querySelector('#dismiss').onclick = () => {
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  };
}

async function getProgress(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet })
    });

    if (!res.ok) {
      return;
    }

    const { progress } = await res.json();
    const parts = [progress?.faucet, progress?.send, progress?.receive, progress?.mint, progress?.launch];
    const percent = Math.round(parts.filter(Boolean).length / 5 * 100);

    // Update UI
    document.getElementById('progress-percent')?.setAttribute('textContent', percent + '%');
    document.getElementById('progress-bar-fill')?.style.setProperty('width', percent + '%');

    ['faucet', 'send', 'receive', 'mint', 'launch'].forEach(id => {
      if (progress[id]) document.getElementById(`item-${id}`)?.classList.add('completed');
    });

  } catch (err) {
      }
}
