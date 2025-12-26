import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';
const APIBASE = 'https://learn-base-backend.vercel.app';

const DEBUG = true;

function debugLog(...args) {
  if (DEBUG) console.log('%c[FAUCET]', 'color: #10b981; font-weight: bold;', ...args);
}

function debugError(...args) {
  console.error('%c[FAUCET ERROR]', 'color: #ef4444; font-weight: bold;', ...args);
}

let currentWallet = null;
let addedProgress = false;
let faucetVisited = false;

async function getWalletFromCache() {
  debugLog('1. getWalletFromCache()');
  const cachedWallet = localStorage.getItem('cachedwallet');

  if (cachedWallet) {
    debugLog('✅ CACHE HIT:', cachedWallet.slice(0,6)+'...'+cachedWallet.slice(-4));
    return cachedWallet;
  }

  debugLog('❌ CACHE MISS → SDK');
  await sdk.actions.ready();
  const ethProvider = await sdk.wallet.ethProvider;

  const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
  const wallet = accounts?.[0];
  debugLog('✅ SDK wallet:', wallet);
  return wallet;
}

async function addProgress() {
  debugLog('🔄 addProgress() - wallet:', !!currentWallet, 'added:', addedProgress);

  if (addedProgress || !currentWallet) {
    debugLog('⏭️ SKIPPED (already done/no wallet)');
    return false;
  }

  try {
    const res = await fetch(`${APIBASE}/api/database/updatefield`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: currentWallet,
        tablename: 'USERPROGRESS',
        fieldname: 'faucet',
        value: true
      })
    });

    debugLog('API response:', res.status, res.ok);

    if (!res.ok) {
      debugError('API failed:', await res.text());
      return false;
    }

    addedProgress = true;
    debugLog('✅ FAUCET PROGRESS ADDED!');
    return true;
  } catch (e) {
    debugError('addProgress error:', e);
    return false;
  }
}

function toggleAccordion(id) {
  const content = document.getElementById(`content-${id}`);
  const icon = document.getElementById(`icon-${id}`);
  content.style.maxHeight = content.style.maxHeight ? '0px' : content.scrollHeight + 'px';
  icon.textContent = content.style.maxHeight ? '+' : '−';
}

async function initWallet() {
  debugLog('🚀 initWallet START');
  try {
    currentWallet = await getWalletFromCache();

    const span = document.getElementById('wallet-address');
    if (span) {
      span.textContent = `${currentWallet.slice(0,6)}...${currentWallet.slice(-4)}`;
      debugLog('✅ Wallet UI:', span.textContent);
    }

    const sepoliaStatus = localStorage.getItem('sepoliastatus');
    if (sepoliaStatus === 'ok') {
      debugLog('🌐 Sepolia OK → auto progress');
      await addProgress();
    }

    debugLog('✅ initWallet COMPLETE');
  } catch (e) {
    debugError('initWallet FAILED:', e);
  }
}

function openEthFaucet() {
  debugLog('🔗 ETH faucet clicked');
  faucetVisited = true;
  sdk.actions.openUrl('https://www.alchemy.com/faucets/base-sepolia');
}

function openUsdcFaucet() {
  debugLog('🔗 USDC faucet clicked');
  faucetVisited = true;
  sdk.actions.openUrl('https://faucet.circle.com');
}

// VISIBILITY TRACKING - progress po návratu
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && faucetVisited && currentWallet && !addedProgress) {
    debugLog('🔄 BACK FROM FAUCET → addProgress()');
    await addProgress();
    faucetVisited = false;
  }
});

// GLOBÁLNÍ FUNKCE
window.toggleAccordion = toggleAccordion;
window.addProgress = addProgress;
window.openEthFaucet = openEthFaucet;
window.openUsdcFaucet = openUsdcFaucet;

window.addEventListener('load', initWallet);

debugLog('=== FAUCET.JS LOADED ===');
