import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

let currentWallet = null;
let addedProgress = false;

// 1. ZÍSKÁNÍ PENĚŽENKY (ČEKÁ NA COMMON.JS)
async function getWallet() {
  // Pokud už ji máme v paměti, rovnou vracíme
  if (currentWallet) return currentWallet;

  // Spoléháme na common.js a jeho waitForWallet mechanismus
  if (window.BaseCampTheme?.waitForWallet) {
    try {
      // Toto počká až 3 sekundy, než common.js načte peněženku
      const cache = await window.BaseCampTheme.waitForWallet();
      if (cache.wallet) {
        console.log('✅ Faucet: Wallet loaded from common.js:', cache.wallet);
        currentWallet = cache.wallet;
        return currentWallet;
      }
    } catch (err) {
      console.warn('⚠️ Faucet: Waiting for wallet timed out, checking storage directly...');
    }
  }

  // Fallback: Pokud waitForWallet selhal (timeout), zkusíme naposledy sessionStorage
  // ZMĚNA: sessionStorage místo localStorage
  const directCache = sessionStorage.getItem('cached_wallet');
  if (directCache) {
    currentWallet = directCache;
    return currentWallet;
  }

  return null;
}

// 2. ODESLÁNÍ PROGRESSU (ROBUSTNÍ VERZE)
async function addProgress() {
  if (addedProgress) return true;

  const wallet = await getWallet();

  if (!wallet) {
    console.error('❌ Faucet: Cannot save progress - No wallet available.');
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: wallet,
        table_name: 'USER_PROGRESS',
        field_name: 'faucet',
        value: true
      })
    });

    if (!res.ok) {
      console.error('❌ Faucet: Progress update failed:', res.status);
      return false;
    }

    addedProgress = true;
    console.log('✅ Faucet: Progress saved successfully!');
    return true;
  } catch (e) {
    console.error('❌ Faucet: Network error during progress save:', e);
    return false;
  }
}

// 3. UI FUNKCE
function toggleAccordion(id) {
  const content = document.getElementById(`content-${id}`);
  const icon = document.getElementById(`icon-${id}`);
  content.style.maxHeight = content.style.maxHeight ? '0px' : content.scrollHeight + 'px';
  icon.textContent = content.style.maxHeight ? '+' : '−';
}

async function initWalletDisplay() {
  // Jen pro zobrazení v UI, neblokuje nic kritického
  const wallet = await getWallet();

  const span = document.getElementById('wallet-address');
  if (span && wallet) {
    span.textContent = `${wallet.slice(0,6)}...${wallet.slice(-4)}`;
  }
}

// 4. HANDLERY TLAČÍTEK
async function openEthFaucet() {
  // Čekáme na uložení progressu, pak otevíráme
  await addProgress();
  sdk.actions.openUrl('https://www.alchemy.com/faucets/base-sepolia');
}

async function openUsdcFaucet() {
  // Čekáme na uložení progressu, pak otevíráme
  await addProgress();
  sdk.actions.openUrl('https://faucet.circle.com');
}

// GLOBÁLNÍ EXPORTY
window.toggleAccordion = toggleAccordion;
window.openEthFaucet = openEthFaucet;
window.openUsdcFaucet = openUsdcFaucet;

// Inicializace: ZMĚNA NA DOMContentLoaded pro rychlost
document.addEventListener('DOMContentLoaded', initWalletDisplay);