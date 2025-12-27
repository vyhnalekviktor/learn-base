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

// Helper function for status messages (ONLY for Loading/Progress now)
function updateStatus(message, type = 'info') {
  let statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  // If message is empty, hide the div
  if (!message) {
    statusDiv.style.display = 'none';
    statusDiv.innerHTML = '';
    return;
  }

  statusDiv.style.display = 'block';

  let color = '#9ca3af'; // default gray
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

// Function to show the ERROR MODAL
function showErrorModal(message, title = 'Error') {
  // 1. Clear the inline status first so it doesn't stay visible behind modal
  updateStatus('');

  // 2. Create Overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;

  // 3. Create Modal Content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: linear-gradient(145deg, #0f172a, #020617);
    border: 1px solid rgba(239, 68, 68, 0.4); /* Red border */
    border-radius: 20px;
    padding: 30px 24px;
    width: 90%;
    max-width: 400px;
    text-align: center;
    color: white;
    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    transform: translateY(20px);
    animation: slideUp 0.4s ease forwards;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  modal.innerHTML = `
    <h3 style="color: #ef4444; margin: 0 0 10px 0; font-size: 24px; font-weight: 700;">${title}</h3>
    <p style="color: #cbd5e1; margin: 0 0 24px 0; line-height: 1.5;">
      ${message}
    </p>

    <button id="closeErrorModal" style="
        width: 100%;
        padding: 14px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 12px;
        font-weight: 700;
        font-size: 16px;
        cursor: pointer;
    ">Close</button>

    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close logic
  const closeBtn = modal.querySelector('#closeErrorModal');
  closeBtn.onclick = () => {
      overlay.style.opacity = '0';
      setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 300);
  };
}

// Function to show the success MODAL (Popup)
function showSuccessModal(amount, txHash) {
  // 1. Clear the inline status first
  updateStatus('');

  // 2. Create Overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;

  // 3. Create Modal Content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: linear-gradient(145deg, #0f172a, #020617);
    border: 1px solid rgba(16, 185, 129, 0.4);
    border-radius: 20px;
    padding: 30px 24px;
    width: 90%;
    max-width: 400px;
    text-align: center;
    color: white;
    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    transform: translateY(20px);
    animation: slideUp 0.4s ease forwards;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  modal.innerHTML = `
    <h3 style="color: #10b981; margin: 0 0 10px 0; font-size: 24px; font-weight: 700;">Donation Successful!</h3>
    <p style="color: #cbd5e1; margin: 0 0 24px 0; line-height: 1.5;">
      Thank you so much for supporting BaseCamp with <strong style="color: white;">${amount} USDC</strong>!
    </p>

    ${txHash ? `
      <a href="https://basescan.org/tx/${txHash}" target="_blank" style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: rgba(255,255,255,0.05);
        padding: 12px;
        border-radius: 12px;
        text-decoration: none;
        color: #10b981;
        font-size: 14px;
        border: 1px solid rgba(16, 185, 129, 0.2);
        margin-bottom: 20px;
        transition: background 0.2s;
      ">
        <span>View Transaction on BaseScan</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>
    ` : ''}

    <button id="closeSuccessModal" style="
        width: 100%;
        padding: 14px;
        background: #10b981;
        color: #022c22;
        border: none;
        border-radius: 12px;
        font-weight: 700;
        font-size: 16px;
        cursor: pointer;
    ">Close</button>

    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close logic
  const closeBtn = modal.querySelector('#closeSuccessModal');
  closeBtn.onclick = () => {
      overlay.style.opacity = '0';
      setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 300);
  };
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
    showErrorModal('Minimum donation is 1 USDC', 'Invalid Amount');
    return;
  }

  // 2. Provider Check
  if (!ethProvider) {
    showErrorModal('Wallet not initialized. Please reload the frame.', 'Wallet Error');
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

    // 4. User Warning (Real Transaction) - This is technically progress/warning, staying inline
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

    // 7. Completion - Show Popup instead of inline text
    addDonationDB(amount);
    showSuccessModal(amount, txHash);

  } catch (error) {
    console.error('Donation error:', error);

    let msg = error.message || 'Transaction failed';
    if (error.code === 4001) msg = 'Transaction cancelled by user';
    if (msg.includes('insufficient')) msg = 'Insufficient USDC balance on Base';

    // Show Error Modal instead of inline status
    showErrorModal(msg, 'Transaction Failed');
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
    showErrorModal('Minimum amount is 1 USDC', 'Invalid Amount');
  }
}

// Global exports
window.donate = donate;
window.donateCustom = donateCustom;
window.stepAmount = stepAmount;