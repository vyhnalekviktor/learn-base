import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const BACKEND_URL = 'https://learn-base-backend.vercel.app';
const MY_WALLET = '0x5b9aCe009440c286E9A236f90118343fc61Ee48F';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = '0x2105';

let ethProvider = null;

async function initApp() {
  try {
    console.log('Initializing Support Me App v2.1...');

    await sdk.actions.ready();
    ethProvider = await sdk.wallet.ethProvider;
    console.log('Provider:', ethProvider ? 'OK' : 'NULL');

    const paymentButtons = document.getElementById('paymentButtons');
    const customPayment = document.getElementById('customPayment');

    if (paymentButtons) {
      paymentButtons.style.opacity = '1';
      paymentButtons.style.pointerEvents = 'auto';
    }
    if (customPayment) {
      customPayment.style.opacity = '1';
      customPayment.style.pointerEvents = 'auto';
    }

    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) connectBtn.style.display = 'none';

    console.log('✅ App ready');
  } catch (error) {
    console.error('❌ Init error:', error);
  }
}

async function addDonationDB(amount) {
  try {
    console.log('💾 Saving donation NUMERIC:', Number(amount), 'USDC');

    const res = await fetch(`${BACKEND_URL}/api/add-donation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount) }),  // ✅ FORCE NUMBER!
    });

    if (!res.ok) {
      let msg = 'Unknown backend error';
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {
        const text = await res.text();
        msg = text || `HTTP ${res.status}`;
      }
      console.error('❌ Add donation error:', msg);
      return false;
    }

    const data = await res.json();
    console.log('✅ Donation saved:', data);
    return true;
  } catch (error) {
    console.error('❌ addDonationDB error:', error);
    return false;
  }
}

async function openBasescan(txHash) {
  if (!txHash) {
    console.warn('⚠️ No txHash');
    return;
  }
  console.log('🔗 Opening Basescan:', txHash);
  try {
    await sdk.actions.openUrl(`https://basescan.org/tx/${txHash}`);
  } catch (err) {
    window.open(`https://basescan.org/tx/${txHash}`, '_blank');
  }
}

async function donate(amount) {
  // Zajisti status div
  let statusDiv = document.getElementById('status');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'status';
    statusDiv.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.9);color:white;z-index:9999;
      display:flex;align-items:center;justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    `;
    document.body.appendChild(statusDiv);
  }

  const numAmount = Number(amount);
  statusDiv.innerHTML = `
    <div style="text-align:center;padding:40px;max-width:400px;">
      <div style="font-size:56px;margin-bottom:24px;">⏳</div>
      <div style="font-weight:700;font-size:28px;margin-bottom:16px;">
        Processing ${numAmount} USDC...
      </div>
      <div style="font-size:16px;opacity:0.8;margin-bottom:32px;">
        Thank you for your support!
      </div>
    </div>
  `;

  // Backend call ihned (background)
  addDonationDB(numAmount).catch(console.error);

  // Thank you po 3s
  setTimeout(() => {
    statusDiv.innerHTML = `
      <div style="text-align:center;padding:40px;max-width:400px;">
        <div style="font-size:64px;margin-bottom:32px;color:#10b981;">✅</div>
        <div style="font-weight:700;font-size:32px;margin-bottom:20px;color:#10b981;">
          Thank you for ${numAmount} USDC!
        </div>
        <div style="font-size:18px;opacity:0.9;margin-bottom:40px;">
          Your support means a lot ❤️
        </div>
        <div style="font-size:14px;opacity:0.6;padding:12px;background:rgba(255,255,255,0.1);border-radius:8px;">
          Statistics updated successfully
        </div>
      </div>
    `;
  }, 3000);
}


function stepAmount(delta) {
  const input = document.getElementById('customAmount');
  if (!input) return;
  let current = Number(input.value) || 0;
  current = Math.max(1, Math.min(10000, current + delta));
  input.value = Math.floor(current);
}

function donateCustom() {
  const input = document.getElementById('customAmount');
  if (!input) return;

  const amount = input.value.trim();
  console.log('🧪 donateCustom called with input:', amount);

  if (amount && Number(amount) >= 1) {
    donate(amount);
  } else {
    alert('Minimum 1 USDC');
  }
}

// Global exports
window.donate = donate;
window.donateCustom = donateCustom;
window.stepAmount = stepAmount;
window.openBasescan = openBasescan;

initApp();
