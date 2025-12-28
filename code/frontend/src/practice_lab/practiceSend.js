import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
import { pay } from 'https://esm.sh/@base-org/account';

const API_BASE = "https://learn-base-backend.vercel.app";
const RECIPIENT_ADDRESS = '0x5b9aCe009440c286E9A236f90118343fc61Ee48F';
const AMOUNT_USDC = '1';

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

    // 1. Převedeme 1 USDC na hex (USDC má 6 desetinných míst)
    // 1 USDC = 1000000 (1 * 10^6)
    const amountHex = "0xf4240"; // 1000000 v hexadecimální soustavě

    // 2. Data pro transfer funkce (ERC20 transfer)
    // Method ID: 0xa9059cbb
    // Padding adresy a částky na 32 bytů
    const recipientPadding = RECIPIENT_ADDRESS.slice(2).padStart(64, '0');
    const amountPadding = amountHex.slice(2).padStart(64, '0');
    const data = `0xa9059cbb${recipientPadding}${amountPadding}`;

    // Adresa USDC kontraktu na Base Sepolia
    const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

    statusDiv.innerHTML = 'Please confirm the payment in your wallet...';

    // 3. Odeslání transakce přes nativní provider (Farcaster wallet)
    const txHash = await ethProvider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: currentWallet,
          to: USDC_CONTRACT_ADDRESS, // Voláme kontrakt USDC, ne příjemce přímo!
          data: data, // Zde říkáme: "Pošli USDC na adresu RECIPIENT_ADDRESS"
          value: "0x0", // Neposíláme ETH, ale tokeny
        },
      ],
    });

    console.log('Payment sent! Hash:', txHash);

    // ... zbytek tvého kódu (practice-sent, progress, success hláška) ...
    if (currentWallet) {
      const okPractice = await callPracticeSent(currentWallet);
      const okProgress = await updatePracticeSendProgress(currentWallet);
      console.log('practice-sent:', okPractice, 'progress send:', okProgress);
    }

    statusDiv.className = 'info-box';
    statusDiv.innerHTML = `
      <strong>Payment Sent!</strong><br>
      Amount: ${AMOUNT_USDC} USDC<br>
      To: ${RECIPIENT_ADDRESS.substring(0, 6)}...${RECIPIENT_ADDRESS.substring(38)}<br><br>
      <small>Transaction Hash: ${txHash.substring(0, 10)}...</small><br>
      <small>Check it in your wallet</small>
    `;

  } catch (error) {
     // ... sem vlož ten tvůj nový catch blok, co jsme řešili předtím ...
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