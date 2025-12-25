import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const BACKEND_URL = 'https://learn-base-backend.vercel.app';
const YOUR_WALLET = '0x5b9aCe009440c286E9A236f90118343fc61Ee48F';   // metamask
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = '0x2105';

let ethProvider = null;

async function initApp() {
  try {
    console.log('Initializing Base App...');

    ethProvider = await sdk.wallet.ethProvider;
    console.log('Provider:', ethProvider);

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

    await sdk.actions.ready();
    console.log('Base App ready');
  } catch (error) {
    console.error('Init error:', error);
  }
}

async function addDonationDB(amount) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/database/add-donation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "amount": amount
      }),
    })

    if (!res.ok) {
      let msg = "Unknown backend error"
      try {
        const err = await res.json()
        msg = err.detail || JSON.stringify(err)
      } catch (_) {}
      console.error("add donation error:", msg)
      return false
    }
    return true
  } catch (error) {
    console.error("addDonationDB error:", error)
    return false
  }
}

async function donate(amount) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  statusDiv.innerHTML = 'Processing payment...';

  try {
    if (!ethProvider) {
      throw new Error('Provider not available');
    }

    const { BrowserProvider } = await import('https://esm.sh/ethers@6.9.0');
    const provider = new BrowserProvider(ethProvider);
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);

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

    statusDiv.innerHTML = 'Processing payment...';

    const accounts = await ethProvider.request({
      method: 'eth_accounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No account connected');
    }

    const userAddress = accounts[0];
    console.log('User address:', userAddress);

    const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
    const transferFunctionSelector = '0xa9059cbb';
    const recipientPadded = YOUR_WALLET.substring(2).padStart(64, '0');
    const amountPadded = amountInWei.toString(16).padStart(64, '0');
    const data = transferFunctionSelector + recipientPadded + amountPadded;

    console.log('Sending USDC transaction...');

    const txHash = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userAddress,
        to: USDC_ADDRESS,
        data
      }]
    });

    console.log('Transaction sent:', txHash);
    addDonationDB(amount);
    if (txHash) {
      statusDiv.innerHTML = `Thank you for ${amount} USDC support!`;
      const walletInfo = document.getElementById('walletInfo');
    } else {
      statusDiv.innerHTML = `Transaction failed!`;
    }
  } catch (error) {
    console.error('Payment error:', error);
    statusDiv.innerHTML = `Payment failed: ${error.message}`;
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