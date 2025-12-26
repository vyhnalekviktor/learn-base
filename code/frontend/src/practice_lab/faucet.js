import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';
const APIBASE = 'https://learn-base-backend.vercel.app';

let currentWallet = null;
let addedProgress = false;

async function getWalletFromCache() {
  const cachedWallet = localStorage.getItem('cachedwallet');

  if (cachedWallet) {
    console.log('✅ CACHE HIT - wallet + sepolia ready:', cachedWallet.slice(0,6)+'...'+cachedWallet.slice(-4), sepoliaStatus);
    return cachedWallet;
  }

  // 2. Fallback na SDK (pouze bez cache)
  console.log('❌ CACHE MISS - fetching from SDK...');
  await sdk.actions.ready();

  const ethProvider = await sdk.wallet.ethProvider;
  if (!ethProvider) {
    console.error('❌ No ethProvider from SDK');
    throw new Error('No wallet provider');
  }

  let accounts;
  try {
    accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
  } catch (e) {
    console.error('❌ eth_requestAccounts failed:', e);
    throw new Error('Wallet connection failed');
  }

  const wallet = accounts?.[0];
  if (!wallet) {
    console.error('❌ No wallet address found');
    throw new Error('No wallet address');
  }

  console.log('✅ SDK wallet obtained:', wallet);
  return wallet;
}

async function addProgress() {
  const wallet = currentWallet;
  if (addedProgress || !wallet) {
    console.log('addProgress skipped - already done or no wallet');
    return false;
  }

  try {
    console.log('📝 Adding faucet progress for:', wallet);
    const res = await fetch(`${APIBASE}/api/database/update_field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet,
        tablename: 'USER_PROGRESS',
        fieldname: 'faucet',
        value: true
      })
    });

    if (!res.ok) {
      let msg = 'Unknown backend error';
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch {
        // ignore
      }
      console.error('❌ updatefield faucet failed:', res.status, msg);
      return false;
    }

    addedProgress = true;
    console.log('✅ Faucet progress added successfully!');
    return true;

  } catch (error) {
    console.error('❌ addProgress error:', error);
    return false;
  }
}

function toggleAccordion(id) {
  const content = document.getElementById(`content-${id}`);
  const icon = document.getElementById(`icon-${id}`);

  if (content.style.maxHeight === '0px') {
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.textContent = '−';
  } else {
    content.style.maxHeight = '0px';
    icon.textContent = '+';
  }
}

// 🔑 GLOBÁLNÍ FUNKCE PRO HTML BUTTONS
window.toggleAccordion = toggleAccordion;
window.addProgress = addProgress;

async function initWallet() {
  try {
    console.log('Faucet page loaded - initializing wallet...');
    currentWallet = await getWalletFromCache();

    // Update wallet address v UI
    const span = document.getElementById('wallet-address');
    if (span) {
      span.textContent = `${currentWallet.slice(0, 6)}...${currentWallet.slice(-4)}`;
      console.log('✅ Wallet UI updated:', span.textContent);
    }

    // Auto-add progress při načtení (pokud Sepolia OK)
    const sepoliaStatus = localStorage.getItem('sepoliastatus');
    if (sepoliaStatus === 'ok') {
      console.log('🌐 Sepolia OK - auto adding faucet progress...');
      await addProgress();
    }

    console.log('✅ Faucet init COMPLETE - wallet:', currentWallet);

  } catch (error) {
    console.error('❌ Wallet init failed:', error);

    // Zobraz warning pokud není wallet
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: linear-gradient(135deg, #ef4444, #dc2626); color: white;
      padding: 12px 20px; border-radius: 12px; font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000;
      max-width: 90vw;
    `;
    warningDiv.textContent = 'Wallet required. Open in Coinbase Wallet or refresh.';
    document.body.appendChild(warningDiv);

    setTimeout(() => {
      if (warningDiv.parentNode) warningDiv.remove();
    }, 5000);
  }
}

function openEthFaucet() {
  console.log('Opening ETH faucet...');
  sdk.actions.openUrl('https://www.alchemy.com/faucets/base-sepolia');
}

function openUsdcFaucet() {
  console.log('Opening USDC faucet...');
  sdk.actions.openUrl('https://faucet.circle.com');
}

// GLOBÁLNÍ FUNKCE PRO HTML
window.openEthFaucet = openEthFaucet;
window.openUsdcFaucet = openUsdcFaucet;

window.addEventListener('load', initWallet);
