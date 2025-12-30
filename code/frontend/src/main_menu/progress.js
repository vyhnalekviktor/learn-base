import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_CHAIN_ID_HEX = '0x2105'; // Base Mainnet

// Adresy
const NFT_CONTRACT = '0xE0F8cb7B89DB4619B21526AC70786444dd9d2f0f';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// === 1. INIT ===
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Progress page initializing...");
  injectModalStyles();

  // Reset UI
  document.querySelectorAll('.loading-indicator').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.progress-text').forEach(el => {
      if(el.textContent === 'Loading...') el.textContent = '0%';
  });

  try {
    await sdk.actions.ready();

    // 1. ZÍSKÁNÍ PENĚŽENKY
    let wallet = null;

    // a) Zkusíme cache (sessionStorage)
    const cachedWallet = sessionStorage.getItem('cached_wallet');
    if (cachedWallet) wallet = cachedWallet;

    // b) Fallback SDK
    try {
        const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
            wallet = accounts[0];
            sessionStorage.setItem('cached_wallet', wallet);
        }
    } catch (err) {
        console.warn("SDK check skipped");
    }

    if (!wallet) {
      console.warn('No wallet available.');
      const mintBtn = document.getElementById('mintNftBtn');
      if (mintBtn) {
          mintBtn.textContent = "Connect Wallet Failed";
          mintBtn.disabled = true;
      }
      return;
    }

    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet;

    // 2. DATA SYNC
    if (window.BaseCampTheme && window.BaseCampTheme.initUserData) {
        const hasCache = sessionStorage.getItem('user_data_cache');
        // Pokud data chybí (nebo je jiná peněženka), stáhni je
        if (!hasCache || cachedWallet !== wallet) {
            console.log("🔄 Fetching data from DB...");
            await window.BaseCampTheme.initUserData(wallet);
        }
    }

    // 3. LOGIKA UI
    await loadPageLogic(wallet, sdk.wallet.ethProvider);

  } catch (error) {
    console.error('CRITICAL INIT ERROR:', error);
    const mintBtn = document.getElementById('mintNftBtn');
    if (mintBtn) mintBtn.textContent = "App Error (Check Console)";
  }
});

// === 2. HLAVNÍ LOGIKA UI ===
async function loadPageLogic(wallet, ethProvider) {
    console.log("🎨 Rendering page logic...");

    // A) Načtení dat ze sessionStorage
    const localData = getSafeUserData();
    const p = localData.progress;

    // Výpočet procent
    const theoryPercent = Math.round(([p.theory1, p.theory2, p.theory3, p.theory4, p.theory5].filter(Boolean).length / 5) * 100);
    const basePercent = Math.round(([p.faucet, p.send, p.receive, p.mint, p.launch].filter(Boolean).length / 5) * 100);
    const securityPercent = Math.round(([p.lab1, p.lab2, p.lab3, p.lab4, p.lab5].filter(Boolean).length / 5) * 100);

    // Update UI
    updateBar('theory', theoryPercent);
    updateBar('baseLab', basePercent);
    updateBar('security', securityPercent);

    const isLocalAllDone = (theoryPercent === 100 && basePercent === 100 && securityPercent === 100);

    // B) Logika Tlačítka
    const mintBtn = document.getElementById('mintNftBtn');

    // 1. Rychlá kontrola cache
    if (localData.info.claimed_nft === true) {
        console.log("✅ Cache hit: NFT is claimed.");
        updateNftUiState(true, true, ethProvider, wallet);
        return;
    }

    // 2. Pokud nemáme splněno, zamkneme
    if (!isLocalAllDone) {
        updateNftUiState(false, false, ethProvider, wallet);
        return;
    }

    // 3. Pokud máme splněno, ale cache říká "ne", ověříme to v DB
    if (mintBtn) {
        mintBtn.disabled = true;
        mintBtn.textContent = "Checking status...";
    }

    let isClaimedDB = false;
    try {
        console.log("🔍 Verifying claim status with DB...");
        const dbRes = await fetch(`${API_BASE}/api/database/get-field`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                wallet: wallet,
                table_name: "USER_INFO",
                field_name: "claimed_nft"
            })
        });

        if (dbRes.ok) {
            const json = await dbRes.json();
            if (json.success && json.value === true) {
                isClaimedDB = true;
                // Opravíme cache pro příště
                if (window.BaseCampTheme?.updateLocalInfo) {
                    window.BaseCampTheme.updateLocalInfo('claimed_nft', true);
                }
            }
        }
    } catch (e) {
        console.error("DB Check failed:", e);
        if (mintBtn) mintBtn.textContent = "Connection Error";
        return;
    }

    // 4. Update UI podle výsledku
    updateNftUiState(isClaimedDB, true, ethProvider, wallet);
}

// Pomocná funkce - čte ze sessionStorage
function getSafeUserData() {
    let data = { progress: {}, info: {} };
    try {
        if (window.BaseCampTheme && window.BaseCampTheme.getUserData) {
            data = window.BaseCampTheme.getUserData() || data;
        } else {
            const raw = sessionStorage.getItem('user_data_cache');
            if (raw) data = JSON.parse(raw);
        }
        if (!data.progress) data.progress = {};
        if (!data.info) data.info = {};
    } catch (e) { console.error("Data parse error", e); }
    return data;
}

function updateNftUiState(isClaimed, isLocalAllDone, ethProvider, wallet) {
    const nftSection = document.getElementById('nftSection');
    const nftBlockTitle = document.getElementById('nftBlockTitle');
    const nftBlockContent = document.getElementById('nftBlockContent');
    const mintBtn = document.getElementById('mintNftBtn');
    const ownedSection = document.getElementById('ownedNftSection');

    if (isClaimed) {
        // --- CLAIMED ---
        if (nftSection) { nftSection.classList.remove('locked'); nftSection.classList.add('claimed'); }
        if (nftBlockTitle) nftBlockTitle.textContent = 'Already claimed!';
        if (nftBlockContent) nftBlockContent.style.display = 'none';
        if (ownedSection) ownedSection.style.display = 'block';
        if (mintBtn) {
            mintBtn.disabled = true;
            mintBtn.textContent = "NFT Claimed";
        }
    } else if (isLocalAllDone) {
        // --- READY TO MINT ---
        if (nftSection) nftSection.classList.remove('locked');
        if (mintBtn) {
            mintBtn.disabled = false;
            mintBtn.textContent = "Mint Completion NFT";
            mintBtn.classList.add('pulse');
            mintBtn.onclick = async () => {
                await handlePaidClaim(ethProvider, wallet);
            };
        }
    } else {
        // --- LOCKED ---
        if (mintBtn) {
            mintBtn.disabled = true;
            mintBtn.textContent = "Complete all lessons first";
        }
    }
}

function updateBar(prefix, percent) {
    const bar = document.getElementById(`${prefix}ProgressBar`);
    const text = document.getElementById(`${prefix}ProgressText`);
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}%`;
}

// === 3. HANDLE MINT ===
async function handlePaidClaim(ethProvider, wallet) {
  const mintBtn = document.getElementById('mintNftBtn');

  try {
    // 1. Dynamický import Ethers
    mintBtn.textContent = "Loading libs...";
    const { ethers } = await import('https://esm.sh/ethers@6.9.0');

    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const userWallet = accounts[0];

    // Check Network
    let chainId = await ethProvider.request({ method: 'eth_chainId' });
    if (chainId !== BASE_CHAIN_ID_HEX) {
         try {
            await ethProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
         } catch (e) {
             showModal('danger', "Please switch to Base Mainnet manually.");
             return;
         }
    }

    mintBtn.textContent = "Processing...";
    mintBtn.disabled = true;

    const usdcIface = new ethers.Interface(['function approve(address spender, uint256 amount) external returns (bool)']);
    const badgeIface = new ethers.Interface(['function mintWithUSDC() external']);
    const price = 2000000n; // 2 USDC

    // 2. Approve
    mintBtn.textContent = "Confirm Approve...";
    const approveData = usdcIface.encodeFunctionData('approve', [NFT_CONTRACT, price]);
    await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: USDC, data: approveData }],
    });

    mintBtn.textContent = "Waiting...";
    await new Promise(r => setTimeout(r, 2000));

    // 3. Mint
    mintBtn.textContent = "Confirm Mint...";
    const mintData = badgeIface.encodeFunctionData('mintWithUSDC', []);
    const mintTx = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: NFT_CONTRACT, data: mintData }],
    });

    // 4. Update UI
    const nftSection = document.getElementById('nftSection');
    const nftBlockTitle = document.getElementById('nftBlockTitle');
    const nftBlockContent = document.getElementById('nftBlockContent');
    const ownedSection = document.getElementById('ownedNftSection');

    if (nftSection) { nftSection.classList.remove('locked'); nftSection.classList.add('claimed'); }
    if (nftBlockTitle) nftBlockTitle.textContent = 'Already claimed!';
    if (nftBlockContent) nftBlockContent.style.display = 'none';
    if (ownedSection) ownedSection.style.display = 'block';

    mintBtn.textContent = 'NFT Claimed!';
    mintBtn.classList.remove('pulse');

    // 5. SMART UPDATE (DB + Cache)
    try {
        console.log("💾 Saving to DB & SessionCache...");

        // A) Update DB
        await fetch(`${API_BASE}/api/database/update_field`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet: wallet,
              table_name: 'USER_INFO',
              field_name: 'claimed_nft',
              value: true
            })
        });

        // B) Update Cache (sessionStorage)
        if (window.BaseCampTheme?.updateLocalInfo) {
            window.BaseCampTheme.updateLocalInfo('claimed_nft', true);
        }

    } catch (e) { console.error("Save failed", e); }

    showModal('success', `
        <strong>Congratulations!</strong><br>
        You have officially completed BaseCamp.<br><br>
        <button onclick="window.open('https://basescan.org/tx/${mintTx}', '_blank')"
                style="width: 100%; padding: 12px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
            View Transaction
        </button>
    `);

  } catch (e) {
    console.error(e);
    showModal('danger', 'Mint failed: ' + (e.message || "User rejected transaction"));
    mintBtn.disabled = false;
    mintBtn.textContent = "Mint Completion NFT";
  }
}

// === 4. MODAL UTILS ===
function injectModalStyles() {
    if (document.getElementById('progress-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'progress-modal-styles';
    style.innerHTML = `
        .custom-modal-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center; z-index: 99999; animation: fadeIn 0.3s ease;
        }
        .custom-modal-content {
            background: #0f172a; border: 1px solid #334155; border-radius: 24px;
            width: 90%; max-width: 400px; padding: 0; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; font-family: sans-serif;
            animation: scaleUp 0.3s ease;
        }
        .modal-header { padding: 20px; border-bottom: 1px solid #334155; }
        .modal-title { margin: 0; font-size: 20px; font-weight: 700; color: white; }
        .modal-body { padding: 24px; color: #cbd5e1; font-size: 16px; line-height: 1.5; }
        .modal-footer { padding: 16px; background: #1e293b; border-top: 1px solid #334155; }
        .modal-btn {
            width: 100%; padding: 12px; background: #334155; color: white; border: none;
            border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 16px;
        }
        .modal-success .modal-title { color: #22c55e; }
        .modal-success .modal-btn { background: #22c55e; color: #022c22; }
        .modal-danger .modal-title { color: #ef4444; }
        .modal-danger .modal-btn { background: #ef4444; color: white; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
}

function showModal(type, msg) {
    const existing = document.querySelector('.custom-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';

    let title = 'NOTICE';
    let modalClass = 'modal-warning';

    if (type === 'success') { title = 'SUCCESS!'; modalClass = 'modal-success'; }
    else if (type === 'danger') { title = 'ERROR'; modalClass = 'modal-danger'; }

    overlay.innerHTML = `
        <div class="custom-modal-content ${modalClass}">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
            </div>
            <div class="modal-body">${msg}</div>
            <div class="modal-footer">
                <button class="modal-btn" onclick="this.closest('.custom-modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}