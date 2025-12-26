    import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';
const APIBASE = 'https://learn-base-backend.vercel.app';
const BASESEPOLIACHAINIDDEC = 84532;

// DEBUG systém
const DEBUG = true;

function debugLog(...args) {
  if (DEBUG) {
    console.log('%c[DEBUG]', 'color: #60a5fa; font-weight: bold;', ...args);
  }
}

function debugError(...args) {
  console.error('%c[ERROR]', 'color: #ef4444; font-weight: bold;', ...args);
}

function debugWarn(...args) {
  console.warn('%c[WARN]', 'color: #f59e0b; font-weight: bold;', ...args);
}

window.addEventListener('load', async () => {
  debugLog('Lab menu loaded, calling sdk.actions.ready...');

  let loadingOverlay = null;

  try {
    await sdk.actions.ready();
    debugLog('BaseCamp mini app is ready!');

    // START loading overlay
    loadingOverlay = showLoadingOverlay();

    const walletErrorSeen = localStorage.getItem('walleterrorseen') === 'true';
    let sepoliaStatus = localStorage.getItem('sepoliastatus');

    debugLog('walletErrorSeen:', walletErrorSeen);
    debugLog('Initial sepoliaStatus:', sepoliaStatus);

    // Získání wallet
    const ethProvider = await sdk.wallet.ethProvider;
    debugLog('ethProvider available:', !!ethProvider);

    if (!ethProvider) {
      if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
      localStorage.setItem('sepoliastatus', 'error');
      if (!walletErrorSeen) {
        showCompatibilityWarning('wallet');
        localStorage.setItem('walleterrorseen', 'true');
      }
      return;
    }

    let accounts;
    try {
      accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
      debugLog('eth_requestAccounts success, accounts count:', accounts?.length);
    } catch (e) {
      debugError('eth_requestAccounts failed:', e);
      if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
      localStorage.setItem('sepoliastatus', 'error');
      if (!walletErrorSeen) {
        showCompatibilityWarning('wallet');
        localStorage.setItem('walleterrorseen', 'true');
      }
      return;
    }

    const wallet = accounts?.length > 0 ? accounts[0] : null;
    debugLog('Final wallet address:', wallet);

    if (!wallet) {
      debugWarn('Wallet address not found from ethProvider.request');
      if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
      localStorage.setItem('sepoliastatus', 'error');
      if (!walletErrorSeen) {
        showCompatibilityWarning('wallet');
        localStorage.setItem('walleterrorseen', 'true');
      }
      return;
    }

    // Update wallet address v UI
    const span = document.getElementById('wallet-address');
    if (span) {
      span.textContent = wallet.slice(0, 2) + wallet.slice(-4);
    }

    // 2. Network check + progress jen při prvním zjištění nekompatibility
    sepoliaStatus = localStorage.getItem('sepoliastatus');
    debugLog('Network check - cached sepoliaStatus:', sepoliaStatus);

    if (!sepoliaStatus) {  // Ještě jsme nikdy netestovali
      debugLog('First time Sepolia compatibility check');
      const supportsSepolia = await detectBaseSepoliaSupport(ethProvider);
      debugLog('Base Sepolia support result:', supportsSepolia);

      if (supportsSepolia) {
        localStorage.setItem('sepoliastatus', 'ok');
        debugLog('Set sepoliaStatus: ok');
      } else {
        // PRVNÍ zjištění nekompatibility -> uděl progress
        debugLog('Sepolia NOT supported -> granting full practice progress');
        await grantFullPracticeProgress(wallet);
        localStorage.setItem('sepoliastatus', 'warning');
        debugLog('Set sepoliaStatus: warning');
        showCompatibilityWarning('chain');
      }
    } else {
      debugLog('Using cached sepoliaStatus:', sepoliaStatus);
      if (sepoliaStatus === 'warning') {
        // Už víme, že je nekompatibilní -> jen banner
        showCompatibilityWarning('chain');
      } else if (sepoliaStatus === 'error' && !walletErrorSeen) {
        showCompatibilityWarning('error');
        localStorage.setItem('walleterrorseen', 'true');
      }
      // sepoliastatus === 'ok' -> nic navíc
    }

    // Wallet + Sepolia hotovo -> skryj loading a načti progress
    if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
    debugLog('Loading overlay hidden, fetching progress...');
    await getProgress(wallet);

  } catch (error) {
    debugError('Error during MiniApp wallet init (labMenu):', error);
    if (loadingOverlay) hideLoadingOverlay(loadingOverlay);
    localStorage.setItem('sepoliastatus', 'error');
    if (!localStorage.getItem('walleterrorseen')) {
      showCompatibilityWarning('error');
      localStorage.setItem('walleterrorseen', 'true');
    }
  }

  debugLog('=== MiniApp wallet init COMPLETE ===');
  debugLog('Final sepoliaStatus:', localStorage.getItem('sepoliastatus'));
  debugLog('Final walletErrorSeen:', localStorage.getItem('walleterrorseen'));
});

function showLoadingOverlay() {
  debugLog('Showing loading overlay');
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(2, 6, 23, 0.95);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 9999; backdrop-filter: blur(8px);
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 48px; height: 48px;
    border: 4px solid rgba(96, 165, 250, 0.2);
    border-top-color: #60a5fa;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;

  const text = document.createElement('div');
  text.style.cssText = `
    margin-top: 20px; color: #e5e7eb;
    font-size: 15px; font-weight: 600;
    font-family: system-ui, -apple-system, Inter;
  `;
  text.textContent = 'Checking wallet and network compatibility...';

  overlay.appendChild(spinner);
  overlay.appendChild(text);

  const style = document.createElement('style');
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  return overlay;
}

function hideLoadingOverlay(overlay) {
  debugLog('Hiding loading overlay');
  if (overlay && overlay.parentNode) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 300);
  }
}

async function detectBaseSepoliaSupport(ethProvider) {
  debugLog('detectBaseSepoliaSupport started');
  try {
    const { JsonRpcProvider } = await import('https://esm.sh/ethers@6.9.0');

    let chainIdDec = null;
    try {
      const chainIdHex = await ethProvider.request({ method: 'eth_chainId' });
      chainIdDec = parseInt(chainIdHex, 16);
      debugLog('Current chain from ethProvider:', chainIdDec);
    } catch (e) {
      debugError('eth_chainId failed:', e);
    }

    // Kompatibilní považujeme jen pokud je uživatel přímo na Base Sepolia
    try {
      const readProvider = new JsonRpcProvider('https://sepolia.base.org');
      await readProvider.getBlockNumber();
      debugLog('Base Sepolia RPC check: OK');
      const result = chainIdDec === BASESEPOLIACHAINIDDEC;
      debugLog('Final Sepolia support (chain match):', result);
      return result;
    } catch (e) {
      debugError('Base Sepolia RPC check failed:', e);
      return false;
    }
  } catch (e) {
    debugError('detectBaseSepoliaSupport fatal:', e);
    return false;
  }
}

async function grantFullPracticeProgress(wallet) {
  if (!wallet) {
    debugWarn('grantFullPracticeProgress: no wallet provided');
    return;
  }

  debugLog('Granting full practice progress for wallet:', wallet);
  const practiceFields = ['send', 'receive', 'mint', 'launch'];

  try {
    for (const field of practiceFields) {
      debugLog(`Updating progress field: ${field}`);
      const res = await fetch(`${APIBASE}/api/database/updatefield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          tablename: 'USERPROGRESS',
          fieldname: field,
          value: true
        })
      });

      const status = res.ok ? 'OK' : 'FAILED';
      debugLog(`updatefield ${field}: ${status} (${res.status})`);

      if (!res.ok) {
        try {
          const errorText = await res.text();
          debugError(`updatefield ${field} response:`, errorText);
        } catch {
          debugError(`updatefield ${field} failed to read error`);
        }
      }
    }
    debugLog('Full practice progress granted successfully (lab menu)');
  } catch (error) {
    debugError('Error granting practice progress (lab menu):', error);
  }
}

function showCompatibilityWarning(type) {
  debugLog('showCompatibilityWarning called with type:', type);

  let title = 'Compatibility Issue';
  let message, suggestion;

  if (type === 'wallet') {
    title = 'Wallet Required';
    message = 'This practice lab requires wallet access for Base transactions.';
    suggestion = 'Open BaseCamp in Coinbase Wallet or Base App for full functionality.';
  } else if (type === 'chain') {
    title = 'Limited Network Support';
    message = 'Your environment does not support Base Sepolia testnet.';
    suggestion = 'Practice transactions may fail. You have been automatically granted practice progress and can still mint your completion badge.';
  } else {
    title = 'Initialization Error';
    message = 'Failed to initialize the practice lab.';
    suggestion = 'Try opening in Coinbase Wallet or refresh the page.';
  }

  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0;
    background: ${type === 'chain' ?
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
      'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'};
    color: white; padding: 14px 18px; text-align: center;
    z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
  `;

  banner.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto; position: relative;">
      <button id="dismiss-warning" style="
        position: absolute; top: -6px; right: 0;
        width: 28px; height: 28px; background: rgba(255,255,255,0.25);
        border: none; border-radius: 50%; font-size: 18px; font-weight: 700;
        color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease;
        &:hover { background: rgba(255,255,255,0.35); }
      ">×</button>
      <div style="font-weight: 700; margin-bottom: 4px;">${title}</div>
      <div style="opacity: 0.95; margin-bottom: 4px;">${message}</div>
      <div style="opacity: 0.9; font-size: 13px;">${suggestion}</div>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);

  const dismissBtn = banner.querySelector('#dismiss-warning');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      banner.style.opacity = '0';
      banner.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        if (banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
      }, 300);
    });
  }

  debugLog('Compatibility warning banner shown');
}

async function getProgress(wallet) {
  if (!wallet) {
    debugWarn('getProgress: no wallet provided');
    return;
  }

  debugLog('Fetching progress for wallet:', wallet);

  try {
    const res = await fetch(`${APIBASE}/api/database/get-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet })
    });

    if (!res.ok) {
      let msg = 'Unknown backend error';
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch {
        // ignore
      }
      debugError('get-user API failed:', res.status, msg);
      return;
    }

    const data = await res.json();
    const progress = data.progress;
    debugLog('Backend progress data:', progress);

    if (!progress) {
      debugError('No progress object in response');
      return;
    }

    const parts = [progress.faucet, progress.send, progress.receive, progress.mint, progress.launch];
    let completed = 0;
    for (const part of parts) {
      if (part === true) completed++;
    }
    const percent = Math.round((completed / parts.length) * 100);
    debugLog('Calculated progress percent:', percent, 'completed:', completed, 'total:', parts.length);

    // Update progress UI
    const label = document.getElementById('progress-percent');
    if (label) label.textContent = `${percent}%`;

    const bar = document.getElementById('progress-bar-fill');
    if (bar) bar.style.width = `${percent}%`;

    // Update menu items
    if (progress.faucet === true) {
      const el = document.getElementById('item-faucet');
      if (el) el.classList.add('completed');
    }
    if (progress.send === true) {
      const el = document.getElementById('item-send');
      if (el) el.classList.add('completed');
    }
    if (progress.receive === true) {
      const el = document.getElementById('item-receive');
      if (el) el.classList.add('completed');
    }
    if (progress.mint === true) {
      const el = document.getElementById('item-mint');
      if (el) el.classList.add('completed');
    }
    if (progress.launch === true) {
      const el = document.getElementById('item-launch');
      if (el) el.classList.add('completed');
    }

    debugLog('Progress UI updated successfully');

  } catch (err) {
    debugError('getProgress error:', err);
  }
}
