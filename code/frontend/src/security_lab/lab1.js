import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
const API_BASE = "https://learn-base-backend.vercel.app";
let currentWallet = null;

// ZMĚNA: Robustní načtení peněženky přes common.js cache
async function initWallet() {
  try {
    console.log("Lab 1 init...");
    await sdk.actions.ready();

    // 1. Zkus cache z common.js (nejrychlejší)
    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            if (cache.wallet) {
                currentWallet = cache.wallet;
                console.log('✅ Lab 1: Wallet from cache:', currentWallet);
                updateUI(currentWallet);
                return;
            }
        } catch (e) {}
    }

    // 2. Zkus sessionStorage (záloha)
    const sessionWallet = sessionStorage.getItem('cached_wallet');
    if (sessionWallet) {
        currentWallet = sessionWallet;
        console.log('✅ Lab 1: Wallet from session:', currentWallet);
        updateUI(currentWallet);
        return;
    }

    // 3. Fallback: SDK request
    console.log('🔄 Lab 1: Fetching wallet from SDK...');
    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: "eth_requestAccounts" });

    currentWallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (currentWallet) {
        sessionStorage.setItem('cached_wallet', currentWallet);
        updateUI(currentWallet);
    } else {
        console.warn("⚠️ Lab 1: No wallet found");
    }

  } catch (error) {
    console.error("❌ Lab 1 init error:", error);
  }
}

function updateUI(wallet) {
    const span = document.getElementById("wallet-address");
    if (span) span.textContent = `${wallet.slice(0,6)}...${wallet.slice(-4)}`;
}

async function updateLabProgress(wallet) {
  if (!wallet) {
    console.error("NO WALLET - cannot call API");
    return false;
  }

  // 1. OPTIMISTIC UPDATE (Hned)
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('lab1', true);
  }

  // 2. DB UPDATE (Pozadí)
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

  if (!res.ok) return false;
  return true;
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Lab 1 loaded');
    await initWallet();

    const scamButton = document.querySelector('.scam-warning-btn');
    const runButton = document.querySelector('.cta-button');

    if (scamButton) {
        scamButton.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (!currentWallet) {
                showModal('warning', 'Please connect your wallet first!');
                return;
            }

            updateLabProgress(currentWallet).catch(err => console.error("Save failed:", err));
            showModal('success',
                "CONGRATS! Lab 1 COMPLETE!\n\n" +
                "Never share seed phrase or private key with anybody!");
        });
    }

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

        setTimeout(() => {
            const seedInput = document.getElementById('seedInput');
            if(seedInput) {
                seedInput.addEventListener('input', function() {
                    if (this.value.trim().length > 0) {
                        showModal('danger', 'NEVER enter your seed phrase anywhere!\nYour wallet could be DRAINED instantly!');
                        this.value = '';
                    }
                });
            }
        }, 100);
    }

    function showModal(type, message) {
        const oldModal = document.querySelector('.custom-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.className = `custom-modal modal-${type}`;
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-${type}-header">
                    <h3>${type === 'success' ? 'SUCCESS' : type === 'danger' ? 'DANGER' : 'WARNING'}</h3>
                </div>
                <div class="modal-body" style="color: black;">
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-close-btn">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.modal-close-btn');
        if(closeBtn) closeBtn.onclick = () => modal.remove();

        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
    }

    window.showSeedInput = function() {
        document.getElementById('seedSection').style.display = 'block';
        document.querySelector('.fake-wallet-section').style.display = 'none';
    };

    window.showScamAlert = function() {
        const seedValue = document.getElementById('seedInput').value.trim();
        if (!seedValue) {
            showModal('warning', 'Please enter your seed phrase to claim 500 BASE tokens!');
            return;
        }
        showModal('success', 'LAB 1 COMPLETE!\n\nYou understood the SCAM mechanics perfectly!\n\nKey lesson: NEVER enter seed phrase anywhere!');
    };
});