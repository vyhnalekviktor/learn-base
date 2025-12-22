import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

async function initWallet() {
  try {
    console.log("Page loaded, calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("BaseCamp mini app is ready!");

    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({
      method: "eth_requestAccounts",
    });

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      console.warn("Wallet address not found from ethProvider.request()");
      return;
    }

    console.log("Connected wallet from SDK:", wallet);
    currentWallet = wallet;

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;
  } catch (error) {
    console.error("Error during MiniApp wallet init:", error);
  }
}

async function updateLabProgress(wallet) {
  if (!wallet) {
    console.error("NO WALLET - cannot call API");
    return false;
  }

  console.log("Calling API with wallet:", wallet);

  const res = await fetch(`${API_BASE}/api/database/update_field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet,
      table_name: "USER_PROGRESS",
      field_name: "lab1",
      value: true,
    }),
  });

  console.log("API response status:", res.status);

  if (!res.ok) {
    let msg = "Unknown backend error";
    try {
      const err = await res.json();
      msg = err.detail || JSON.stringify(err);
    } catch (_) {}
    console.error("update_field error:", msg);
    return false;
  }

  console.log("API call SUCCESS");
  return true;
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Lab 1 loaded - Modal-based SCAM detection (WITH API)');

    // Wallet init PRVNĚ
    await initWallet();

    const scamButton = document.querySelector('.scam-warning-btn');
    const runButton = document.querySelector('.cta-button');

    if (!scamButton) {
        console.error('SCAM button (.scam-warning-btn) not found');
        return;
    }

    // 1. SCAM BUTTON - FIXED jako faucet.js
    scamButton.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();

        console.log("SCAM button clicked, currentWallet:", currentWallet);

        if (!currentWallet) {
            showModal('warning', 'Please connect your wallet first!');
            return;
        }

        const success = await updateLabProgress(currentWallet);
        if (success) {
            showModal('success',
            "CONGRATS! Lab 1 COMPLETE!\n\n" +
            "Never share seed phrase or private key with anybody!");
        } else {
            showModal('danger', 'Failed to save progress. Check console for details.');
        }
    });

    // 2. Run The Lab - scam demo
    if (runButton) {
        runButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showScamDemo();
        });
    }

    function showScamDemo() {
        runButton.style.display = 'none';

        const trySection = document.querySelector('.try-section');
        if (!trySection) return;

        trySection.innerHTML = `
            <div class="scam-header">
                <h2>Claim BASE Airdrop</h2>
                <p>Get 500 BASE tokens FREE!</p>
            </div>

            <div class="fake-wallet-section">
                <button class="connect-btn" onclick="showSeedInput()">Connect Wallet</button>
            </div>

            <div class="seed-input-section" id="seedSection" style="display: none;">
                <h4>Enter your 12/24 word seed phrase to claim</h4>
                <textarea class="seed-textarea" placeholder="word1 word2 word3 ... word24" id="seedInput"></textarea>
                <button class="scam-claim-btn" onclick="showScamAlert()" id="claimBtn">Claim 500 BASE</button>
            </div>
        `;

        trySection.classList.add('scam-active');

        // 3. SEED INPUT - Danger modal při psaní
        const seedInput = document.getElementById('seedInput');
        seedInput.addEventListener('input', function() {
            if (this.value.trim().length > 0) {
                showModal('danger', 'DANGEROUS!\nNEVER enter your seed phrase anywhere!\nLegitimate dApps use WalletConnect/MetaMask popup ONLY!\nYour wallet would be DRAINED instantly!');
                this.value = ''; // Vymaže input
            }
        });
    }

    // Frontend MODAL systém
    function showModal(type, message) {
        // Odstraní případný starý modal
        const oldModal = document.querySelector('.custom-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.className = `custom-modal modal-${type}`;
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-${type}-header">
                    <h3>${type === 'success' ? 'SUCCESS' : type === 'danger' ? 'DANGER' : 'WARNING'}</h3>
                </div>
                <div class="modal-body">
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-close-btn">OK</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Zavře modal
        modal.querySelector('.modal-close-btn').onclick = () => modal.remove();
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
    }

    // Global functions
    window.showSeedInput = function() {
        document.getElementById('seedSection').style.display = 'block';
        document.querySelector('.fake-wallet-section').style.display = 'none';
    };

    window.showScamAlert = function() {
        const seedValue = document.getElementById('seedInput').value.trim();

        // 4. CLAIM bez seed - Warning modal
        if (!seedValue) {
            showModal('warning', 'Please enter your seed phrase to claim 500 BASE tokens!');
            return;
        }

        // Lab complete - Success modal
        showModal('success', 'LAB 1 COMPLETE!\n\nYou understood the SCAM mechanics perfectly!\n\nKey lesson: NEVER enter seed phrase anywhere!');
    };
});
