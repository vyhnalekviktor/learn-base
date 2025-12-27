import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
import { pay } from 'https://esm.sh/@base-org/account';

const API_BASE = "https://learn-base-backend.vercel.app";
const RECIPIENT_ADDRESS = '0x5b9aCe009440c286E9A236f90118343fc61Ee48F';
const AMOUNT_USDC = '1';

let ethProvider = null;
let currentWallet = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await sdk.actions.ready();
    ethProvider = await sdk.wallet.ethProvider;

    // 1. Cache
    currentWallet = sessionStorage.getItem('cached_wallet');

    // 2. Fallback SDK
    if (!currentWallet) {
        const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
        currentWallet = accounts && accounts.length > 0 ? accounts[0] : null;
        if (currentWallet) sessionStorage.setItem('cached_wallet', currentWallet);
    }

    console.log('Connected wallet:', currentWallet);
  } catch (error) {
    console.error('Init error:', error);
  }
});

async function callPracticeSent(wallet) {
  try {
    await fetch(`${API_BASE}/api/database/practice-sent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
  } catch (e) { console.error(e); }
}

async function updatePracticeSendProgress(wallet) {
  // 1. Optimistic Update
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('send', true);
  }

  // 2. DB Update
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
  return res.ok;
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
  const statusDiv = document.getElementById('txStatus');

  try {
    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.innerHTML = 'Preparing USDC payment...';

    statusDiv.innerHTML = 'Please confirm the payment in your wallet...';
    await pay({
      amount: AMOUNT_USDC,
      to: RECIPIENT_ADDRESS,
      testnet: true
    });

    if (currentWallet) {
      // Paralelně: update statistik bota a update user progressu
      callPracticeSent(currentWallet);
      updatePracticeSendProgress(currentWallet);
    }

    statusDiv.className = 'info-box';
    statusDiv.innerHTML = `
      <strong>Payment Sent!</strong><br>
      Amount: ${AMOUNT_USDC} USDC<br>
      To: ${RECIPIENT_ADDRESS.substring(0, 6)}...${RECIPIENT_ADDRESS.substring(38)}<br><br>
      <small>Payment successfully processed on Base Sepolia testnet</small>
    `;
  } catch (error) {
    statusDiv.className = 'error-box';
    if (error.message.includes('rejected')) {
      statusDiv.innerHTML = 'Payment rejected by user';
    } else {
      statusDiv.innerHTML = `Payment failed: ${error.message}`;
    }
  }
};

window.openBridgeBase = () => sdk.actions.openUrl("https://bridge.base.org");
window.openCircleFaucet = () => sdk.actions.openUrl("https://faucet.circle.com");
window.openBaseScan = () => sdk.actions.openUrl("https://sepolia.basescan.org");