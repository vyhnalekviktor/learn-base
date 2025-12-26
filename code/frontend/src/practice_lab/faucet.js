import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

let currentWallet = null;
let addedProgress = false;
let faucetVisited = false;

// ✅ OPRAVENO: Použij waitForWallet z common.js
async function getWalletFromCache() {
  // 1. Zkus počkat na common.js cache (3s timeout)
  if (window.BaseCampTheme?.waitForWallet) {
    try {
      const cache = await window.BaseCampTheme.waitForWallet();
      console.log('✅ Faucet wallet from cache:', cache.wallet);
      return cache.wallet;
    } catch (err) {
      console.log('⏱️ Faucet cache timeout:', err);
    }
  }

  // 2. Fallback: Přímý localStorage
  const cached_wallet = localStorage.getItem('cached_wallet');
  if (cached_wallet) {
    console.log('✅ Faucet wallet from localStorage:', cached_wallet);
    return cached_wallet;
  }

  // 3. Poslední fallback: SDK request
  console.log('🔄 Faucet requesting wallet from SDK...');
  await sdk.actions.ready();
  const ethProvider = await sdk.wallet.ethProvider;
  const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
  return accounts?.[0];
}

async function addProgress() {
  if (addedProgress || !currentWallet) {
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: currentWallet,
        tablename: 'USER_PROGRESS',
        field_name: 'faucet',
        value: true
      })
    });

    if (!res.ok) {
      console.error('❌ Faucet progress update failed:', res.status);
      return false;
    }

    addedProgress = true;
    console.log('✅ Faucet progress saved!');
    return true;
  } catch (e) {
    console.error('❌ Faucet progress error:', e);
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
  try {
    currentWallet = await getWalletFromCache();

    const span = document.getElementById('wallet-address');
    if (span && currentWallet) {
      span.textContent = `${currentWallet.slice(0,6)}...${currentWallet.slice(-4)}`;
    }

    // Auto-progress pokud je Sepolia OK
    const sepolia_status = localStorage.getItem('sepolia_status');
    if (sepolia_status === 'ok') {
      await addProgress();
    }

  } catch (e) {
    console.error('❌ Faucet initWallet failed:', e);
  }
}

// ✅ OPRAVENO: Async handlers s await
async function openEthFaucet() {
  await addProgress();  // ← ČEKÁ na dokončení!
  sdk.actions.openUrl('https://www.alchemy.com/faucets/base-sepolia');
}

async function openUsdcFaucet() {
  await addProgress();  // ← ČEKÁ na dokončení!
  sdk.actions.openUrl('https://faucet.circle.com');
}

// GLOBÁLNÍ FUNKCE
window.toggleAccordion = toggleAccordion;
window.addProgress = addProgress;
window.openEthFaucet = openEthFaucet;
window.openUsdcFaucet = openUsdcFaucet;

window.addEventListener('load', initWallet);
