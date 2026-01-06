import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

let currentWallet = null;
let addedProgress = false;

// 1. ZÍSKÁNÍ PENĚŽENKY (OPTIMALIZOVANÉ)
async function getWallet() {
  if (currentWallet) return currentWallet;

  // A) Cache z common.js
  if (window.BaseCampTheme?.waitForWallet) {
    try {
      const cache = await window.BaseCampTheme.waitForWallet();
      if (cache.wallet) {
        currentWallet = cache.wallet;
        return currentWallet;
      }
    } catch (err) {}
  }

  // B) Přímý session storage
  const directCache = sessionStorage.getItem('cached_wallet');
  if (directCache) {
    currentWallet = directCache;
    return currentWallet;
  }

  return null;
}

// 2. ODESLÁNÍ PROGRESSU (OPTIMALIZOVANÉ)
async function addProgress() {
  if (addedProgress) return true;

  const wallet = await getWallet();
  if (!wallet) return false;

  // --- A) OPTIMISTIC UPDATE (HNED) ---
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('faucet', true);
  }
  addedProgress = true; // Lokální flag, abychom to neposílali 100x

  // --- B) DB UPDATE (POZADÍ) ---
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

    if (!res.ok) console.error('Faucet DB update failed');
    return true;
  } catch (e) {
    console.error('Faucet network error:', e);
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
  await sdk.actions.ready();
  const wallet = await getWallet();
  const span = document.getElementById('wallet-address');
  if (span && wallet) {
    span.textContent = `${wallet.slice(0,6)}...${wallet.slice(-4)}`;
  }
}

// 4. HANDLERY
async function openUsdcFaucet() {
  await addProgress();
  sdk.actions.openUrl('https://faucet.circle.com');
}

// NOVÁ FUNKCE: CLAIM ETH Z VLASTNÍHO FAUCETU
async function claimEthFaucet() {
    const btn = document.getElementById('claimEthBtn');
    const status = document.getElementById('ethStatus');

    // UI Loading state
    btn.disabled = true;
    btn.textContent = "Processing...";
    status.style.display = "none";
    status.style.color = "#cbd5e1";

    const wallet = await getWallet();
    if (!wallet) {
        btn.disabled = false;
        btn.textContent = "Get 0.0001 ETH";
        alert("Please connect your wallet first!");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/testnet/drip-eth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet: wallet }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // Úspěch
            btn.textContent = "Sent!";
            status.style.display = "block";
            status.style.color = "#4ade80"; // Zelená
            status.innerHTML = `Success! Tx: <a href='https://sepolia.basescan.org/tx/${data.tx_hash}' target='_blank' style='color:#4ade80; text-decoration:underline;'>View on BaseScan</a>`;
            await addProgress(); // Označíme krok jako hotový
        } else {
            // Chyba (Cooldown, prázdný faucet, atd.)
            btn.disabled = false;
            btn.textContent = "Get 0.0001 ETH";
            status.style.display = "block";
            status.style.color = "#f87171"; // Červená
            status.textContent = data.detail || data.msg || "Faucet failed. Try again later.";
        }
    } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.textContent = "Get 0.0001 ETH";
        status.style.display = "block";
        status.style.color = "#f87171";
        status.textContent = "Network error.";
    }
}

window.toggleAccordion = toggleAccordion;
window.claimEthFaucet = claimEthFaucet; // Exportováno pro použití v HTML
window.openUsdcFaucet = openUsdcFaucet;

document.addEventListener('DOMContentLoaded', initWalletDisplay);