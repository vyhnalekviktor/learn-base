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

async function donate(rawAmount) {
  console.log('🧪 donate CALLED:', rawAmount);

  // ✅ NOVÁ TŘÍDA - support-thanks-msg (žádný CSS konflikt!)
  const thanksDiv = document.createElement('div');
  thanksDiv.id = 'support-thanks-msg';
  thanksDiv.className = 'support-thanks-msg';

  // ✅ STYLY PŘÍMO V JS (kompletní override)
  thanksDiv.style.cssText = `
    position: fixed !important;
    top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
    background: rgba(0, 0, 0, 0.98) !important;
    color: white !important;
    z-index: 99999 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif !important;
    padding: 20px !important;
    box-sizing: border-box !important;
  `;

  document.body.appendChild(thanksDiv);

  const amount = Number(rawAmount);
  console.log('🧪 Parsed amount:', amount);

  if (!Number.isFinite(amount) || amount < 1) {
    thanksDiv.innerHTML = `
      <div style="text-align: center; max-width: 400px;">
        <div style="font-size: 48px; margin-bottom: 20px; color: #ef4444;">❌</div>
        <div style="font-size: 24px; font-weight: 700; margin-bottom: 12px;">Minimum 1 USDC</div>
        <button onclick="document.getElementById('support-thanks-msg').remove()"
                style="margin-top: 20px; padding: 12px 24px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; font-size: 16px; cursor: pointer;">
          Close
        </button>
      </div>
    `;
    return;
  }

  // Processing screen
  thanksDiv.innerHTML = `
    <div style="text-align: center; max-width: 400px;">
      <div style="font-size: 56px; margin-bottom: 24px;">💾</div>
      <div style="font-weight: 700; font-size: 28px; margin-bottom: 16px;">
        Saving ${amount} USDC...
      </div>
      <div style="font-size: 16px; opacity: 0.9; margin-bottom: 8px;">
        Thank you for supporting BaseCamp! ❤️
      </div>
    </div>
  `;

  // Backend call (background)
  addDonationDB(amount).catch(err => console.error('Backend error:', err));

  // Thank you screen po 2.5s
  setTimeout(() => {
    thanksDiv.innerHTML = `
      <div style="text-align: center; max-width: 400px; padding: 40px;">
        <div style="font-size: 64px; margin-bottom: 32px; color: #10b981;">✅</div>
        <div style="font-weight: 700; font-size: 32px; margin-bottom: 20px; color: #10b981;">
          Thank you for ${amount} USDC!
        </div>
        <div style="font-size: 18px; opacity: 0.95; margin-bottom: 40px;">
          Statistics updated successfully ❤️
        </div>
        <div style="font-size: 14px; opacity: 0.7; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 24px;">
          Support appreciated!
        </div>
        <button onclick="document.getElementById('support-thanks-msg').remove()"
                style="
                  padding: 14px 32px;
                  background: linear-gradient(135deg, rgba(16,185,129,0.3), rgba(34,197,94,0.2));
                  border: 1px solid rgba(255,255,255,0.3);
                  border-radius: 12px;
                  color: white;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  backdrop-filter: blur(10px);
                  transition: all 0.2s;
                "
                onmouseover="this.style.background='linear-gradient(135deg, rgba(16,185,129,0.5), rgba(34,197,94,0.4))'; this.style.transform='scale(1.05)'"
                onmouseout="this.style.background='linear-gradient(135deg, rgba(16,185,129,0.3), rgba(34,197,94,0.2))'; this.style.transform='scale(1)'">
          Close
        </button>
      </div>
    `;
  }, 2500);
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