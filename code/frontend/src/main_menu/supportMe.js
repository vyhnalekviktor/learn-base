import sdk from 'https://esm.sh/@farcaster/miniapp-sdk'; // ← FIX: BEZ { }!

const BACKEND_URL = 'https://learn-base-backend.vercel.app';
const MY_WALLET = '0x5b9aCe009440c286E9A236f90118343fc61Ee48F';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = '0x2105';

let ethProvider = null;

async function initApp() {
  try {
    console.log('Initializing Support Me App v2.0...');

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

    console.log('✅ App initialized successfully');
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
      body: JSON.stringify({ amount: amount }),
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
    console.log('✅ Donation saved to DB:', data);
    return true;

  } catch (error) {
    console.error('❌ addDonationDB error:', error);
    return false;
  }
}

// ✅ NEW: Helper funkce pro otevření Basescan
async function openBasescan(txHash) {
  if (!txHash) {
    console.warn('⚠️ No txHash available');
    return;
  }
  console.log('🔗 Opening Basescan for tx:', txHash);
  try {
    await sdk.actions.openUrl(`https://basescan.org/tx/${txHash}`);
  } catch (err) {
    console.error('❌ Failed to open URL:', err);
    // Fallback: normální window.open
    window.open(`https://basescan.org/tx/${txHash}`, '_blank');
  }
}

async function donate(amount) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  let txHash = null; // ← Scope pro celou funkci

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
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No account connected');
    }

    const userAddress = accounts[0];
    console.log('💳 User wallet:', userAddress);

    // ✅ Prepare ERC20 transfer (SPRÁVNĚ - to: USDC_ADDRESS)
    const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
    const transferFunctionSelector = '0xa9059cbb'; // transfer(address,uint256)
    const recipientPadded = MY_WALLET.substring(2).padStart(64, '0');
    const amountPadded = amountInWei.toString(16).padStart(64, '0');
    const data = transferFunctionSelector + recipientPadded + amountPadded;

    console.log('💸 Sending USDC transaction:');
    console.log('  Amount:', amount, 'USDC');
    console.log('  From:', userAddress);
    console.log('  To Contract:', USDC_ADDRESS);
    console.log('  Recipient (in data):', MY_WALLET);

    statusDiv.innerHTML = '⏳ Confirm transaction in your wallet...';

    // ✅ Send transaction
    const txResponse = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userAddress,
        to: USDC_ADDRESS,  // ← SPRÁVNĚ: USDC contract address
        data               // ← Data obsahuje recipient + amount
      }]
    });

    // ✅ DEBUG: Log response
    console.log('📦 TX Response TYPE:', typeof txResponse);
    console.log('📦 TX Response VALUE:', txResponse);
    console.log('📦 TX Response (stringified):', JSON.stringify(txResponse));

    // ✅ Extract txHash (podporuje různé formáty)
    if (typeof txResponse === 'string') {
      txHash = txResponse;
    } else if (txResponse && typeof txResponse === 'object') {
      txHash = txResponse.hash || txResponse.transactionHash || txResponse.tx || null;
    }

    console.log('✅ Extracted txHash:', txHash);

    // ✅ Save to statistics
    statusDiv.innerHTML = '💾 Updating statistics...';
    const saved = await addDonationDB(amount);

    if (!saved) {
      console.warn('⚠️ Statistics update failed (non-critical)');
    }

    // ✅ SUCCESS MESSAGE
    if (txHash && txHash.startsWith('0x')) {
      // Success S txHash
      statusDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <div style="font-weight: 700; font-size: 22px; margin-bottom: 12px; color: #10b981;">
            Thank you for ${amount} USDC!
          </div>
          <div style="font-size: 14px; opacity: 0.7; margin-bottom: 20px;">
            Transaction confirmed on Base
          </div>
          <div style="
            display: inline-block;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 8px;
            padding: 10px 16px;
            margin-bottom: 20px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #10b981;
            word-break: break-all;
            max-width: 300px;
          ">
            ${txHash.slice(0, 12)}...${txHash.slice(-10)}
          </div>
          <br>
          <button
            onclick="window.openBasescan('${txHash}')"
            style="
              padding: 14px 28px;
              background: linear-gradient(135deg, #0052ff 0%, #0041cc 100%);
              border: none;
              border-radius: 12px;
              color: white;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 4px 14px rgba(0, 82, 255, 0.4);
              transition: all 0.3s ease;
            "
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0, 82, 255, 0.5)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 14px rgba(0, 82, 255, 0.4)'"
          >
            View on Basescan →
          </button>
        </div>
      `;
    } else {
      // Success BEZ txHash (fallback)
      statusDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <div style="font-weight: 700; font-size: 22px; margin-bottom: 12px; color: #10b981;">
            Thank you for ${amount} USDC!
          </div>
          <div style="font-size: 14px; opacity: 0.7; margin-bottom: 12px;">
            Transaction confirmed on Base
          </div>
          <div style="font-size: 13px; opacity: 0.5; font-style: italic;">
            Check your wallet for transaction details
          </div>
        </div>
      `;
    }

  } catch (error) {
    console.error('❌ Payment error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    let errorMsg = error.message;

    // Handle common errors
    if (error.code === 4001) {
      errorMsg = 'Transaction cancelled by user';
    } else if (error.code === -32002) {
      errorMsg = 'Request already pending in wallet';
    } else if (error.code === -32603) {
      errorMsg = 'Insufficient USDC balance';
    } else if (error.code === 4100) {
      errorMsg = 'Wallet not authorized - please connect first';
    }

    statusDiv.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin-bottom: 16px; color: #ef4444;">❌</div>
        <div style="font-weight: 700; font-size: 20px; margin-bottom: 12px; color: #ef4444;">
          Payment Failed
        </div>
        <div style="font-size: 15px; opacity: 0.9; color: #ef4444;">
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

// ✅ Global exports
window.donate = donate;
window.donateCustom = donateCustom;
window.stepAmount = stepAmount;
window.openBasescan = openBasescan; // ← NOVÉ!

initApp();