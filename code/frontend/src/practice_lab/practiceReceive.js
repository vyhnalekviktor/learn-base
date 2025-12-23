import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = "https://learn-base-backend.vercel.app";

let ethProvider = null;

async function initApp() {
  try {
    console.log('Initializing Base App...');
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();
    console.log('Base App ready');
  } catch (error) {
    console.error('Init error:', error);
  }
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

// update USER_PROGRESS.receive = true
async function updateReceiveProgress(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        table_name: "USER_PROGRESS",
        field_name: "receive",
        value: true,
      }),
    });

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("update_field receive error:", msg);
      return false;
    }
    return true;
  } catch (e) {
    console.error("update_field receive network error:", e);
    return false;
  }
}

window.requestTestUSDC = async function() {
  const walletInput = document.getElementById('walletInput');
  const statusDiv = document.getElementById('receiveStatus');
  const receiveBtn = document.getElementById('receiveBtn');

  const address = walletInput.value.trim();

  if (!address) {
    statusDiv.style.display = 'block';
    statusDiv.className = 'error-box';
    statusDiv.innerHTML = '\n\nPlease enter your wallet address';
    return;
  }

  if (!address.startsWith('0x') || address.length !== 42) {
    statusDiv.style.display = 'block';
    statusDiv.className = 'error-box';
    statusDiv.innerHTML = '\n\nInvalid wallet address. Must start with 0x and be 42 characters long.';
    return;
  }

  try {
    receiveBtn.disabled = true;
    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.innerHTML = '\n\nAsking your friend to send you USDC...';

    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch('https://learn-base-backend.vercel.app/api/testnet/send-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wallet: address }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.msg || result.detail || 'Failed to send USDC');
    }

    // ✅ progress update po úspěšném receive
    const progressOk = await updateReceiveProgress(address);
    console.log("receive progress updated:", progressOk);

    statusDiv.className = 'info-box';
    statusDiv.innerHTML = `
        <strong>Payment Received!</strong><br><br>
            Your friend sent you <strong>1 USDC</strong> on Base Sepolia!<br><br>
        <strong>To:</strong> ${address.substring(0, 6)}...${address.substring(38)}<br><br>
        <button onclick="openSepoliaScanAddress('${address}')"
          style="padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
            View on BaseScan
        </button><br><br>
        <small style="color: #666;">Transaction should appear in your wallet within 10–30 seconds</small>
    `;


  } catch (error) {
    console.error('Error:', error);
    statusDiv.className = 'error-box';
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `

${error.message || 'Failed to send USDC. Please try again later.'}`;
  } finally {
    receiveBtn.disabled = false;
  }
};

function openSepoliaScan() {
  sdk.actions.openUrl("https://sepolia.basescan.org");
}

function openBaseScan() {
  sdk.actions.openUrl("https://basescan.org");
}

window.openSepoliaScanAddress = function(addr) {
  sdk.actions.openUrl(`https://sepolia.basescan.org/address/${addr}`);
};


window.openSepoliaScan = openSepoliaScan;
window.openBaseScan = openBaseScan;

initApp();
