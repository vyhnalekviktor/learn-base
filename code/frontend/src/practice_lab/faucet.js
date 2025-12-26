import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';
const API_BASE = 'https://learn-base-backend.vercel.app';

let currentWallet = null;
let addedProgress = false;
let faucetVisited = false;

// Nahraď getWalletFromCache() tímto:
async function getWalletFromCache() {
  // ✅ POUŽIJ common.js PUBLIC API
  if (window.BaseCampTheme?.getWalletCache) {
    const { wallet, sepolia_status } = window.BaseCampTheme.getWalletCache();
    if (wallet) {
      return wallet;
    }
  }
  // Fallback na přímý localStorage
  const cached_wallet = localStorage.getItem('cached_wallet');
  if (cached_wallet) {
    return cached_wallet;
  }

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
      return false;
    }

    addedProgress = true;
    return true;
  } catch (e) {
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
    if (span) {
      span.textContent = `${currentWallet.slice(0,6)}...${currentWallet.slice(-4)}`;
    }

    const sepolia_status = localStorage.getItem('sepolia_status');
    if (sepolia_status === 'ok') {
      await addProgress();
    }

  } catch (e) {  }
}

function openEthFaucet() {
  addProgress();
  sdk.actions.openUrl('https://www.alchemy.com/faucets/base-sepolia');
}

function openUsdcFaucet() {
  addProgress();
  sdk.actions.openUrl('https://faucet.circle.com');
}


// GLOBÁLNÍ FUNKCE
window.toggleAccordion = toggleAccordion;
window.addProgress = addProgress;
window.openEthFaucet = openEthFaucet;
window.openUsdcFaucet = openUsdcFaucet;

window.addEventListener('load', initWallet);
