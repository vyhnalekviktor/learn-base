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
  console.log('🧪 donate CALLED with:', rawAmount, 'type:', typeof rawAmount);

  // ✅ FIX 1: Najdi statusDiv nebo vytvoř ho
  let statusDiv = document.getElementById('status');
  if (!statusDiv) {
    console.warn('⚠️ No #status → creating fallback');
    statusDiv = document.createElement('div');
    statusDiv.id = 'status';
    statusDiv.style.cssText = `
      padding: 20px;
      text-align: center;
      min-height: 100px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    document.body.appendChild(statusDiv);
  }

  // ✅ FIX 2: Ověř a přetypuj amount
  const amount = Number(rawAmount);
  console.log('🧪 Parsed amount:', amount);

  if (!Number.isFinite(amount) || amount < 1) {
    statusDiv.innerHTML = `
      <div style="color: #ef4444;">
        ❌ Invalid amount: ${rawAmount}<br>
        Minimum is 1 USDC
      </div>
    `;
    return;
  }

  let txHash = null;

  try {
    if (!ethProvider) {
      throw new Error('Provider not available');
    }

    statusDiv.innerHTML = '🔄 Checking network...';

    const { BrowserProvider } = await import('https://esm.sh/ethers@6.9.0');
    const provider = new BrowserProvider(ethProvider);
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);

    if (currentChainId !== 8453) {
      statusDiv.innerHTML = '🔄 Switching to Base...';
      try {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }]
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await ethProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID,
              chainName: 'Base',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        } else {
          throw switchError;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    statusDiv.innerHTML = '📝 Preparing transaction...';

    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    if (!accounts?.[0]) {
      throw new Error('No account connected');
    }

    const userAddress = accounts[0];
    console.log('💳 User:', userAddress);

    // ERC20 transfer data
    const amountInWei = BigInt(Math.floor(amount * 1_000_000));
    const transferFunctionSelector = '0xa9059cbb';
    const recipientPadded = MY_WALLET.substring(2).padStart(64, '0');
    const amountPadded = amountInWei.toString(16).padStart(64, '0');
    const data = transferFunctionSelector + recipientPadded + amountPadded;

    console.log('💸 Transaction details:', { amount, userAddress, contract: USDC_ADDRESS });

    statusDiv.innerHTML = '⏳ Confirm in wallet...';

    const txResponse = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{ from: userAddress, to: USDC_ADDRESS, data }]
    });

    console.log('📦 TX Response:', typeof txResponse, txResponse);

    txHash = typeof txResponse === 'string' ? txResponse : null;

    statusDiv.innerHTML = '💾 Saving to statistics...';
    const saved = await addDonationDB(amount);

    // ✅ THANK YOU SCREEN
    statusDiv.innerHTML = `
      <div style="text-align: center; padding: 30px;">
        <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
        <div style="font-weight: 700; font-size: 24px; margin-bottom: 12px; color: #10b981;">
          Thank you for ${amount} USDC!
        </div>
        <div style="font-size: 16px; opacity: 0.8; margin-bottom: 24px;">
          Transaction confirmed on Base
        </div>
        ${txHash ? `
          <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-family: monospace; font-size: 13px; color: #10b981; word-break: break-all; max-width: 300px; margin: 0 auto 24px;">
            ${txHash.slice(0,12)}...${txHash.slice(-10)}
          </div>
          <button onclick="window.openBasescan('${txHash}')" style="padding: 14px 28px; background: linear-gradient(135deg, #0052ff, #0041cc); border: none; border-radius: 12px; color: white; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(0,82,255,0.4);">
            View on Basescan →
          </button>
        ` : `
          <div style="font-size: 14px; opacity: 0.6; font-style: italic;">
            Check your wallet for details
          </div>
        `}
        ${saved ? '<div style="font-size: 12px; opacity: 0.5; margin-top: 20px;">Statistics updated ✅</div>' : ''}
      </div>
    `;

  } catch (error) {
    console.error('❌ Payment error:', error);

    let errorMsg = error.message || 'Unknown error';
    if (error.code === 4001) errorMsg = 'Transaction cancelled';
    if (error.code === -32002) errorMsg = 'Request pending';
    if (error.code === -32603) errorMsg = 'Insufficient USDC';

    statusDiv.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #ef4444;">
        <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
        <div style="font-weight: 700; font-size: 20px; margin-bottom: 12px;">
          Payment Failed
        </div>
        <div style="font-size: 15px; opacity: 0.9;">${errorMsg}</div>
      </div>
    `;
  }
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
