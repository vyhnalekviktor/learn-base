import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

// ⬇️ TVŮJ NOVÝ PAYMASTER URL
const PAYMASTER_URL = "https://api.developer.coinbase.com/rpc/v1/base/LmqaivWtGVqE238WPHQBoWgD1wOOQPXg";

const API_BASE = "https://learn-base-backend.vercel.app";
const RECIPIENT_ADDRESS = '0x5b9aCe009440c286E9A236f90118343fc61Ee48F';
const AMOUNT_USDC = '1'; // Pro účely dema

let ethProvider = null;
let currentWallet = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await sdk.actions.ready();
    ethProvider = await sdk.wallet.ethProvider;

    // 1. Cache wallet
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

// Funkce pro update v DB
async function callPracticeSent(wallet) {
  try {
    await fetch(`${API_BASE}/api/database/practice-sent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
  } catch (e) {
    console.error("Database error:", e);
  }
}

// Funkce pro update v Cache (Optimistic UI)
function updatePracticeSendProgress(wallet) {
  if (window.BaseCampTheme && window.BaseCampTheme.updateLocalProgress) {
      window.BaseCampTheme.updateLocalProgress('practice_send', true);
  }
}

// UI Helpers
const toggleDetails = () => {
  const content = document.getElementById('details-content');
  const icon = document.getElementById('toggle-icon');
  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    icon.textContent = '▼';
  } else {
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.textContent = '▲';
  }
};
window.toggleDetails = toggleDetails;

// === HLAVNÍ FUNKCE ODESLÁNÍ (Upravená pro Paymaster) ===
window.sendTransaction = async function() {
  const statusDiv = document.getElementById('txStatus');

  if (!currentWallet) {
      alert("Wallet not connected. Please reload.");
      return;
  }

  try {
    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.innerHTML = 'Requesting Sponsored Transaction...';

    // === NOVÁ LOGIKA S PAYMASTEREM ===
    // Používáme wallet_sendCalls (EIP-5792) místo pay()
    const batchId = await ethProvider.request({
        method: 'wallet_sendCalls',
        params: [{
            version: '1.0',
            chainId: '0x2105', // Base Mainnet (8453)
            from: currentWallet,
            calls: [{
                to: RECIPIENT_ADDRESS,
                value: "0x0", // Posíláme 0 ETH (jen data/signál), aby to uživatele nic nestálo
                data: "0x"
            }],
            capabilities: {
                paymasterService: {
                    url: PAYMASTER_URL
                }
            }
        }]
    });

    console.log("Transaction Batch ID:", batchId);

    // Pokud to prošlo sem, transakce byla odeslána
    if (currentWallet) {
      // Paralelně: update statistik bota a update user progressu
      callPracticeSent(currentWallet);
      updatePracticeSendProgress(currentWallet);
    }

    statusDiv.className = 'info-box';
    statusDiv.innerHTML = `
      <strong>Sponsored Transaction Sent!</strong><br>
      <span style="color:#22c55e">Gas fees paid by BaseCamp</span><br>
      Amount: ${AMOUNT_USDC} USDC (Simulated)<br>
      To: ${RECIPIENT_ADDRESS.substring(0, 6)}...${RECIPIENT_ADDRESS.substring(38)}<br><br>
    `;
  } catch (error) {
    console.error(error);
    statusDiv.className = 'error-box';
    if (error.message && error.message.includes('rejected')) {
      statusDiv.innerHTML = 'Transaction rejected by user';
    } else {
      statusDiv.innerHTML = `Failed: ${error.message}`;
    }
  }
};

window.openBridgeBase = () => sdk.actions.openUrl("https://bridge.base.org/deposit");