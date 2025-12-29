import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = "https://learn-base-backend.vercel.app";
let ethProvider = null;

// === 1. INIT ===
document.addEventListener('DOMContentLoaded', async () => {
  // injectStyles() JSME ODSTRANILI - STYLY JSOU V tutorial.css
  try {
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();
  } catch (error) { console.error('Init error:', error); }
});

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

async function updateReceiveProgress(wallet) {
  // 1. Optimistic
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('receive', true);
  }

  // 2. DB
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
  return res.ok;
}

// === 2. LOGIKA RECEIVE ===
window.requestTestUSDC = async function() {
  const walletInput = document.getElementById('walletInput');
  const statusDiv = document.getElementById('receiveStatus');
  const receiveBtn = document.getElementById('receiveBtn');
  const address = walletInput.value.trim();

  // Validace adresy - chyba do modalu
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    showModal('danger', 'Invalid wallet address.');
    return;
  }

  try {
    receiveBtn.disabled = true;

    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.innerHTML = 'Asking your friend to send you USDC...';

    const response = await fetch('https://learn-base-backend.vercel.app/api/testnet/send-test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: address }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) throw new Error(result.msg || result.detail || 'Failed to send USDC');

    updateReceiveProgress(address);

    statusDiv.style.display = 'none';

    showModal('success', `
        <strong>Payment Received!</strong><br><br>
        Your friend sent you <strong>1 USDC</strong> on Base Sepolia!<br>
        <small style="color: #94a3b8;">Transaction should appear in 10–30s</small>
    `);

  } catch (error) {
    statusDiv.style.display = 'none';
    showModal('danger', error.message || 'Failed to send USDC.');
  } finally {
    receiveBtn.disabled = false;
  }
};

// === 3. MODAL UTILS ===
function showModal(type, msg) {
    const old = document.querySelector('.custom-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';

    let title = 'NOTICE';
    let modalClass = 'modal-warning';

    if (type === 'success') { title = 'GREAT JOB!'; modalClass = 'modal-success'; }
    else if (type === 'danger') { title = 'ERROR'; modalClass = 'modal-danger'; }

    overlay.innerHTML = `
        <div class="custom-modal-content ${modalClass}">
            <div class="modal-header"><h3 class="modal-title">${title}</h3></div>
            <div class="modal-body">${msg}</div>
            <div class="modal-footer"><button class="modal-btn" onclick="this.closest('.custom-modal-overlay').remove()">Got it</button></div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

window.openSepoliaScan = () => sdk.actions.openUrl("https://sepolia.basescan.org");
window.openBaseScan = () => sdk.actions.openUrl("https://basescan.org");
window.openSepoliaScanAddress = (addr) => sdk.actions.openUrl(`https://sepolia.basescan.org/address/${addr}`);