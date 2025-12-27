import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // 84532 hex

// ====== DEBUG OVERLAY ======
function showDebugInfo(data) {
  const debug = document.createElement('div');
  debug.id = 'debug-overlay';
  debug.style.cssText = `
    position: fixed;
    bottom: 70px;
    left: 10px;
    right: 10px;
    background: rgba(0,0,0,0.95);
    color: #00ff00;
    padding: 14px;
    border-radius: 12px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    z-index: 9998;
    line-height: 1.6;
    border: 2px solid #00ff00;
    max-height: 200px;
    overflow-y: auto;
  `;

  const walletShort = data.wallet ? `${data.wallet.slice(0,6)}...${data.wallet.slice(-4)}` : 'NULL';

  debug.innerHTML = `
    <strong style="color: #0ff;">🐛 DEBUG INFO</strong><br>
    <span style="color: #fff;">wallet:</span> ${walletShort}<br>
    <span style="color: #fff;">sepolia_status:</span> ${data.sepolia_status || 'NULL'}<br>
    <span style="color: #fff;">cacheLoaded:</span> ${data.cacheLoaded}<br>
    <span style="color: #fff;">localStorage.wallet:</span> ${localStorage.getItem('cached_wallet')?.slice(0,10) || 'NULL'}...<br>
    <span style="color: #fff;">localStorage.sepolia:</span> ${localStorage.getItem('sepolia_status') || 'NULL'}<br>
    <span style="color: #fff;">progressGranted:</span> ${data.progressGranted || 'NO'}<br>
    <span style="color: #fff;">warningShown:</span> ${data.warningShown || 'NO'}<br>
    <button onclick="this.parentElement.remove()" style="margin-top:8px;padding:6px 12px;background:#ff0000;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Close</button>
  `;

  // Remove old debug if exists
  const old = document.getElementById('debug-overlay');
  if (old) old.remove();

  document.body.appendChild(debug);

  // Auto-hide after 15s
  setTimeout(() => {
    if (debug.parentElement) debug.remove();
  }, 15000);
}

window.addEventListener('load', async () => {
  let loadingOverlay = null;
  const debugData = { cacheLoaded: false, progressGranted: false, warningShown: false };

  try {
    await sdk.actions.ready();
    loadingOverlay = showLoadingOverlay();

    // ====== 1. GET WALLET FROM CACHE ======
    let wallet = null;
    let sepolia_status = null;
    let cacheLoaded = false;

    // Try cache from common.js (max 3s wait)
    if (window.BaseCampTheme?.waitForWallet) {
      try {
        const cache = await window.BaseCampTheme.waitForWallet();
        cacheLoaded = true;
        wallet = cache.wallet;
        sepolia_status = cache.sepolia_status;
        console.log('✅ labMenu: Cache loaded:', { wallet, sepolia_status });
      } catch (err) {
        console.log('⏱️ labMenu: Cache timeout:', err);
      }
    }

    // Fallback: Direct localStorage check
    if (!cacheLoaded) {
      wallet = localStorage.getItem('cached_wallet');
      sepolia_status = localStorage.getItem('sepolia_status');
      console.log('📦 labMenu: Direct localStorage:', { wallet, sepolia_status });
    }

    debugData.wallet = wallet;
    debugData.sepolia_status = sepolia_status;
    debugData.cacheLoaded = cacheLoaded;

    // ====== 2. CHECK IF WALLET EXISTS ======
    if (!wallet || wallet === '') {
      hideLoadingOverlay(loadingOverlay);
      showCompatibilityWarning('wallet');
      console.error('❌ No wallet available - please open in Coinbase Wallet/Base App');
      showDebugInfo(debugData); // Show debug before return
      return; // ✅ Stop here - no wallet = no progress
    }

    // ====== 3. UPDATE UI WITH WALLET ======
    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet.slice(0,6)+'...'+wallet.slice(-4);

    // ====== 4. CHECK SEPOLIA SUPPORT ======
    if (!sepolia_status || sepolia_status === 'error') {
      const ethProvider = await sdk.wallet.ethProvider;
      const supportsSepolia = await detectSepoliaSupportSimple(ethProvider);

      if (supportsSepolia) {
        localStorage.setItem('sepolia_status', 'ok');
        sepolia_status = 'ok';
        console.log('✅ Sepolia support: OK');
      } else {
        localStorage.setItem('sepolia_status', 'warning');
        sepolia_status = 'warning';
        console.log('⚠️ Sepolia support: NOT AVAILABLE');
        await grantFullPracticeProgress(wallet);
        debugData.progressGranted = true;
        showCompatibilityWarning('chain');
        debugData.warningShown = true;
      }
    } else if (sepolia_status === 'warning') {
      // ✅ FIXED: Grant progress when cached as warning
      console.log('⚠️ Sepolia support: cached as warning - granting progress');
      await grantFullPracticeProgress(wallet);
      debugData.progressGranted = true;
      showCompatibilityWarning('chain');
      debugData.warningShown = true;
    }

    // Update debug data
    debugData.sepolia_status = sepolia_status;

    // ====== 5. ALWAYS LOAD PROGRESS ======
    hideLoadingOverlay(loadingOverlay);
    await getProgress(wallet);

    // ====== SHOW DEBUG OVERLAY ======
    showDebugInfo(debugData);

  } catch (error) {
    console.error('❌ labMenu init error:', error);
    hideLoadingOverlay(loadingOverlay);
    showCompatibilityWarning('error');
    debugData.error = error.message;
    showDebugInfo(debugData);
  }
});

// 🔍 SEPOLIA CHECK - tests wallet_switchEthereumChain
async function detectSepoliaSupportSimple(ethProvider) {
  if (!ethProvider) return false;

  try {
    await ethProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }]
    });
    return true;
  } catch (error) {
    // 4001 = User rejected → wallet SUPPORTS it
    if (error.code === 4001) return true;
    // 4902 = Chain not configured → wallet DOESN'T SUPPORT
    if (error.code === 4902) return false;
    // Other errors
    return false;
  }
}

// Grant progress for all practice labs when Sepolia not supported
async function grantFullPracticeProgress(wallet) {
  if (!wallet) return;

  const fields = ['send', 'receive', 'mint', 'launch']; // Faucet excluded - works without Sepolia
  console.log('🎁 Granting full practice progress...');

  try {
    for (const field of fields) {
      const res = await fetch(`${API_BASE}/api/database/update_field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          table_name: 'USER_PROGRESS',
          field_name: field,
          value: true
        })
      });

      if (!res.ok) {
        console.warn(`⚠️ Failed to grant ${field} progress`);
      } else {
        console.log(`✅ Granted: ${field}`);
      }
    }
    console.log('✅ Full practice progress granted (no Sepolia support)');
  } catch (error) {
    console.error('❌ grantFullPracticeProgress error:', error);
  }
}

// ====== PROGRESS TRACKING ======
async function getProgress(wallet) {
  if (!wallet) {
    console.warn('⚠️ getProgress: No wallet provided');
    return;
  }

  try {
    // ✅ FIXED: Use POST with JSON body (backend expects POST, not GET)
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet })
    });

    if (!res.ok) {
      console.error('❌ Failed to fetch progress:', res.status);
      return;
    }

    const data = await res.json();
    console.log('📊 User progress:', data);

    const progress = data.progress || {};
    const total = 5;
    let completed = 0;

    // Update each lab item
    ['faucet', 'send', 'receive', 'mint', 'launch'].forEach(lab => {
      if (progress[lab]) {
        completed++;
        const item = document.getElementById(`item-${lab}`);
        if (item) item.classList.add('completed');
      }
    });

    // Update progress bar
    const percent = Math.round((completed / total) * 100);
    const percentEl = document.getElementById('progress-percent');
    const barEl = document.getElementById('progress-bar-fill');

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (barEl) barEl.style.width = `${percent}%`;

    console.log(`✅ Progress loaded: ${completed}/${total} (${percent}%)`);

  } catch (error) {
    console.error('❌ getProgress error:', error);
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
    wallet: {
      title: 'Wallet Required',
      msg: 'Please open in Coinbase Wallet or Base App to connect your wallet',
      color: '#ff6b6b'
    },
    chain: {
      title: 'Limited Network Support',
      msg: 'Your wallet doesn\'t support Base Sepolia testnet. Progress auto-granted - you can still earn the NFT badge!',
      color: '#f59e0b'
    },
    error: {
      title: 'Initialization Error',
      msg: 'Please try opening in Coinbase Wallet or refresh the page',
      color: '#ef4444'
    }
  };

  const { title, msg, color } = messages[type] || messages.error;

  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, ${color}22, ${color}dd);
    color: white;
    padding: 16px 20px;
    text-align: center;
    z-index: 10000;
    font-family: system-ui, -apple-system;
    font-size: 14px;
    line-height: 1.5;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border-bottom: 2px solid ${color};
  `;

  banner.innerHTML = `
    <strong style="font-size: 15px;">${title}</strong><br>
    <span style="font-size: 13px; opacity: 0.95;">${msg}</span>
  `;

  document.body.appendChild(banner);

  // Auto-hide after 7s (longer for important messages)
  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transition = 'opacity 0.5s ease';
    setTimeout(() => banner.parentNode?.removeChild(banner), 500);
  }, 7000);
}