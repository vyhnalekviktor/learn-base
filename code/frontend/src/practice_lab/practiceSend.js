import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = "https://learn-base-backend.vercel.app";
const RECIPIENT_ADDRESS = '0x5b9aCe009440c286E9A236f90118343fc61Ee48F';
const AMOUNT_USDC = '1';
const USDC_CONTRACT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)'
];

let ethProvider = null;
let currentWallet = null;

async function initApp() {
  try {
    console.log('Initializing Base App...');
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();

    const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
    currentWallet = accounts && accounts.length > 0 ? accounts[0] : null;

    console.log('Base App ready');
    console.log('Connected wallet:', currentWallet);
  } catch (error) {
    console.error('Init error:', error);
  }
}

async function callPracticeSent(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/practice-sent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("practice-sent error:", msg);
      return false;
    }
    return true;
  } catch (e) {
    console.error("practice-sent network error:", e);
    return false;
  }
}

async function updatePracticeSendProgress(wallet) {
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet,
      table_name: "USER_PROGRESS",
      field_name: "send",
      value: true,
    }),
  });

  if (!res.ok) {
    let msg = "Unknown backend error";
    try {
      const err = await res.json();
      msg = err.detail || JSON.stringify(err);
    } catch (_) {}
    console.error("update_field error:", msg);
    return false;
  }
  return true;
}

window.toggleAccordion = function(id) {
  const content = document.getElementById('content-' + id);
  const icon = document.getElementById('icon-' + id);

  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    icon.textContent = '▼';
  } else {
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.textContent = '▲';
  }
};

window.sendTransaction = async function() {
  console.log('Send transaction clicked!');
  const statusDiv = document.getElementById('txStatus');

  try {
    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.innerHTML = 'Preparing USDC payment...';

    const { BrowserProvider, Contract, parseUnits } = await import('https://esm.sh/ethers@6.9.0');

    const provider = new BrowserProvider(ethProvider);
    const signer = await provider.getSigner();

    const usdcContract = new Contract(USDC_CONTRACT, USDC_ABI, signer);

    statusDiv.innerHTML = 'Please confirm the transaction in your wallet...';

    const amount = parseUnits(AMOUNT_USDC, 6);
    const tx = await usdcContract.transfer(RECIPIENT_ADDRESS, amount);

    const txHash = tx.hash;
    const shortHash = txHash.substring(0, 10) + '...' + txHash.substring(txHash.length - 8);

    statusDiv.innerHTML = `
      <strong>Transaction submitted!</strong><br><br>
      <strong>Hash:</strong> <code>${shortHash}</code><br><br>
      Waiting for confirmation...
    `;

    await tx.wait();

    if (currentWallet) {
      const okPractice = await callPracticeSent(currentWallet);
      const okProgress = await updatePracticeSendProgress(currentWallet);
      console.log('practice-sent:', okPractice, 'progress send:', okProgress);
    }

    statusDiv.className = 'info-box';
    statusDiv.innerHTML = `
      <strong>Payment Sent!</strong><br><br>
      <strong>Amount:</strong> ${AMOUNT_USDC} USDC<br>
      <strong>To:</strong> ${RECIPIENT_ADDRESS.substring(0, 6)}...${RECIPIENT_ADDRESS.substring(38)}<br><br>
      <button onclick="openBaseScan()"
        style="padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
        View on BaseScan
      </button><br><br>
      <small style="color: #666;">Payment successfully processed on Base Sepolia testnet</small>
    `;

  } catch (error) {
    console.error('Payment error:', error);
    statusDiv.className = 'error-box';

    if (error.code === 4001 || error.message.includes('User rejected') || error.message.includes('rejected')) {
      statusDiv.innerHTML = 'Payment rejected by user';
    } else if (error.message.includes('insufficient')) {
      statusDiv.innerHTML = 'Insufficient USDC balance. Get testnet USDC from <a href="#" onclick="openCircleFaucet(); return false;" style="color: #0052FF;">Circle Faucet</a>.';
    } else {
      statusDiv.innerHTML = `Payment failed: ${error.message}`;
    }
  }
};

function openBridgeBase() {
  sdk.actions.openUrl("https://bridge.base.org");
}

function openCircleFaucet() {
  sdk.actions.openUrl("https://faucet.circle.com");
}

function openBaseScan() {
  sdk.actions.openUrl("https://sepolia.basescan.org");
}

window.openBridgeBase = openBridgeBase;
window.openCircleFaucet = openCircleFaucet;
window.openBaseScan = openBaseScan;

initApp();