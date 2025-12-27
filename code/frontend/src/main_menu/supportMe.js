import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const BACKEND_URL = 'https://learn-base-backend.vercel.app';
const MY_WALLET = '0x5b9aCe009440c286E9A236f90118343fc61Ee48F';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = '0x2105'; // 8453 Decimal

let ethProvider = null;

// Initialize on DOMContentLoaded for faster load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Initializing Support Me App...');
    await sdk.actions.ready();
    ethProvider = await sdk.wallet.ethProvider;

    // Enable UI elements
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

    console.log('App ready');
  } catch (error) {
    console.error('Init error:', error);
  }
});

// Helper function for status messages
function updateStatus(message, type = 'info') {
  let statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  statusDiv.style.display = 'block';

  let color = '#9ca3af'; // default gray
  if (type === 'error') color = '#ef4444';
  if (type === 'success') color = '#10b981';
  if (type === 'warning') color = '#f59e0b';

  // Spinner for loading state
  const spinnerHtml = type === 'loading'
    ? '<div class="spinner" style="width:20px;height:20px;margin:0 auto 10px;border:2px solid rgba(255,255,255,0.1);border-top:2px solid currentColor;border-radius:50%;animation:spin 1s linear infinite;"></div>'
    : '';

  statusDiv.innerHTML = `
    <div style="text-align: center; padding: 15px; color: ${color}; animation: fadeIn 0.3s ease;">
      ${spinnerHtml}
      <span style="font-weight: 500;">${message}</span>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  `;
}

// Function to show the success screen
function showSuccessView(amount, txHash) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  statusDiv.innerHTML = `
    <div style="
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin-top: 20px;
      animation: slideUp 0.4s ease-out;
    ">
      <h3 style="color: #10b981; margin: 0 0 8px 0; font-size: 22px;">Donation Successful</h3>
      <p style="color: var(--text-secondary); margin: 0 0 20px 0;">
        Thank you so much for supporting BaseCamp with <strong>${amount} USDC</strong>.
      </p>

      ${txHash ? `
        <a href="https://basescan.org/tx/${txHash}" target="_blank" style="
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-card);
          padding: 10px 16px;
          border-radius: 10px;
          text-decoration: none;
          color: var(--text-primary);
          font-size: 13px;
          border: 1px solid var(--border);
          transition: transform 0.2s;
        ">
          <span>View Transaction</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      ` : ''}
    </div>

    <style>
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;
}

async function addDonationDB(amount) {
  try {
    console.log('Saving donation stats:', amount);
    await fetch(`${BACKEND_URL}/api/add-donation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    return true;
  } catch (error) {
    console.warn('Stats update failed (non-critical):', error);
    return false;
  }
}

async function donate(rawAmount) {
  // 1. Validation
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount < 1) {
    updateStatus('Minimum donation is 1 USDC', 'error');
    return;
  }

  // 2. Provider Check
  if (!ethProvider) {
    updateStatus('Wallet not initialized. Please reload.', 'error');
    return;
  }

  let txHash = null;

  try {
    // 3. Network Check (Base Mainnet)
    updateStatus('Checking network...', 'loading');

    const { BrowserProvider } = await import('https://esm.sh/ethers@6.9.0');
    const provider = new BrowserProvider(ethProvider);
    const network = await provider.getNetwork();

    // 8453 = Base Mainnet
    if (Number(network.chainId) !== 8453) {
      updateStatus('Switching to Base Mainnet...', 'loading');
      try {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }]
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          // Add chain if missing
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
      // Brief pause for network switch
      await new Promise(r => setTimeout(r, 1500));
    }

    // 4. User Warning (Real Transaction)
    updateStatus(`Preparing real transaction (${amount} USDC)...`, 'warning');

    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];

    // 5. Prepare Transaction Data (Manual hex construction)
    const amountInWei = BigInt(Math.floor(amount * 1_000_000)); // USDC 6 decimals
    const transferFunctionSelector = '0xa9059cbb';
    const recipientPadded = MY_WALLET.substring(2).padStart(64, '0');
    const amountPadded = amountInWei.toString(16).padStart(64, '0');
    const data = transferFunctionSelector + recipientPadded + amountPadded;

    // 6. Request Signature
    updateStatus('Please confirm in your wallet...', 'loading');

    const txResponse = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userAddress,
        to: USDC_ADDRESS,
        data: data
      }]
    });

    txHash = typeof txResponse === 'string' ? txResponse : null;

    // 7. Completion
    updateStatus('Transaction sent! Finalizing...', 'success');

    // Save to DB and show result in parallel
    addDonationDB(amount);
    showSuccessView(amount, txHash);

  } catch (error) {
    console.error('Donation error:', error);

    let msg = error.message || 'Transaction failed';
    if (error.code === 4001) msg = 'Transaction cancelled by user';
    if (msg.includes('insufficient')) msg = 'Insufficient USDC balance on Base';

    updateStatus(msg, 'error');
  }
}

// Function for +/- buttons
function stepAmount(delta) {
  const input = document.getElementById('customAmount');
  if (!input) return;
  let current = Number(input.value) || 0;
  // Limit min 1, max 10000
  current = Math.max(1, Math.min(10000, current + delta));
  input.value = Math.floor(current);
}

// Function for custom amount button
function donateCustom() {
  const input = document.getElementById('customAmount');
  if (!input) return;
  const amount = input.value.trim();
  if (amount && Number(amount) >= 1) {
    donate(amount);
  } else {
    updateStatus('Minimum amount is 1 USDC', 'warning');
  }
}

// Global exports
window.donate = donate;
window.donateCustom = donateCustom;
window.stepAmount = stepAmount;