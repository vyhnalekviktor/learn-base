import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const BACKEND_URL = 'https://learn-base-backend.vercel.app';
const MY_WALLET = '0x5b9aCe009440c286E9A236f90118343fc61Ee48F';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = '0x2105';

let ethProvider = null;

async function initApp() {
  try {
    console.log('Initializing Support Me App...');

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
    console.log('💾 Saving donation to statistics:', amount, 'USDC');

    const res = await fetch(`${BACKEND_URL}/api/add-donation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount
      }),
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

async function donate(amount) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  try {
    if (!ethProvider) {
      throw new Error('Provider not available');
    }

    statusDiv.innerHTML = 'Checking network...';

    const { BrowserProvider } = await import('https://esm.sh/ethers@6.9.0');
    const provider = new BrowserProvider(ethProvider);
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);

    // Switch to Base if needed
    if (currentChainId !== 8453) {
      statusDiv.innerHTML = 'Switching to Base network...';

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
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        } else {
          throw switchError;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    statusDiv.innerHTML = 'Preparing transaction...';

    const accounts = await ethProvider.request({
      method: 'eth_requestAccounts' // ← FIX: requestAccounts
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No account connected');
    }

    const userAddress = accounts[0];
    console.log('💳 User address:', userAddress);

    // Prepare USDC transfer data
    const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
    const transferFunctionSelector = '0xa9059cbb';
    const recipientPadded = MY_WALLET.substring(2).padStart(64, '0');
    const amountPadded = amountInWei.toString(16).padStart(64, '0');
    const data = transferFunctionSelector + recipientPadded + amountPadded;

    console.log('💸 Sending USDC transaction:', amount, 'USDC');
    statusDiv.innerHTML = '⏳ Confirm transaction in MY wallet...';

    // ✅ FIX: Await transaction PŘED success message
    const txHash = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userAddress,
        to: USDC_ADDRESS,
        data
      }]
    });

    console.log('✅ Transaction confirmed:', txHash);

    // ✅ FIX: Save to statistics AFTER transaction
    statusDiv.innerHTML = '💾 Updating statistics...';
    const saved = await addDonationDB(amount);

    if (!saved) {
      console.warn('⚠️ Statistics update failed (non-critical)');
    }

    // ✅ NEW: Success message with Basescan link
    statusDiv.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 10px;">✅</div>
        <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">
          Thank you for ${amount} USDC support!
        </div>
        <div style="font-size: 14px; opacity: 0.8; margin-bottom: 12px;">
          Transaction confirmed on Base
        </div>
        <a
          href="https://basescan.org/tx/${txHash}"
          target="_blank"
          style="
            display: inline-block;
            padding: 10px 20px;
            background: rgba(96, 165, 250, 0.1);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 8px;
            color: #60a5fa;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='rgba(96, 165, 250, 0.2)'; this.style.borderColor='rgba(96, 165, 250, 0.5)'"
          onmouseout="this.style.background='rgba(96, 165, 250, 0.1)'; this.style.borderColor='rgba(96, 165, 250, 0.3)'"
        >
          View on Basescan →
        </a>
      </div>
    `;

  } catch (error) {
    console.error('❌ Payment error:', error);

    let errorMsg = error.message;

    // Handle common errors
    if (error.code === 4001) {
      errorMsg = 'Transaction cancelled by user';
    } else if (error.code === -32002) {
      errorMsg = 'Request already pending in wallet';
    } else if (error.code === -32603) {
      errorMsg = 'Insufficient USDC balance';
    }

    statusDiv.innerHTML = `
      <div style="color: #ef4444; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 10px;">❌</div>
        <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">
          Payment failed
        </div>
        <div style="font-size: 14px; opacity: 0.8;">
          ${errorMsg}
        </div>
      </div>
    `;
  }
}

function stepAmount(delta) {
  const input = document.getElementById('customAmount');
  if (!input) return;

  const current = parseFloat(input.value || '0') || 0;
  let next = current + delta;

  if (next < 1) next = 1;
  if (next > 10000) next = 10000;

  input.value = String(Math.floor(next));
}

function donateCustom() {
  const input = document.getElementById('customAmount');
  if (!input) return;

  const amount = input.value;
  if (amount && parseFloat(amount) >= 1) {
    donate(amount);
  } else {
    alert('Minimum amount is 1 USDC');
  }
}

window.donate = donate;
window.donateCustom = donateCustom;
window.stepAmount = stepAmount;

initApp();
