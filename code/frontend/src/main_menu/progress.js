import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_CHAIN_ID_HEX = '0x2105'; // Base Mainnet (8453)

// Adresy
const NFT_CONTRACT = '0xE0F8cb7B89DB4619B21526AC70786444dd9d2f0f';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Načteme Ethers providera dynamicky
const { ethers, JsonRpcProvider } = await import('https://esm.sh/ethers@6.9.0');

// === 1. INIT ===
document.addEventListener('DOMContentLoaded', async () => {
  injectModalStyles();

  try {
    await sdk.actions.ready();

    // 1. Zkusíme získat peněženku z cache (common.js)
    let wallet = null;
    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            wallet = cache.wallet;
        } catch (e) { console.log('Wallet cache miss'); }
    }

    // 2. FALLBACK: Pokud v cache není (přímý přístup), zkusíme SDK
    if (!wallet) {
        try {
            const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                wallet = accounts[0];
                sessionStorage.setItem('cached_wallet', wallet);
            }
        } catch (err) {
            console.error("SDK fallback failed:", err);
        }
    }

    if (!wallet) {
      const mintBtn = document.getElementById('mintNftBtn');
      if (mintBtn) mintBtn.textContent = "Wallet Connection Failed";
      return;
    }

    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet;

    // 3. Spustíme logiku (čistě z cache)
    await loadPageLogic(wallet, sdk.wallet.ethProvider);

  } catch (error) {
    console.error('Load error:', error);
  }
});

// === 2. MAIN LOGIC (Pouze Cache) ===
async function loadPageLogic(wallet, ethProvider) {
    // Načteme data z cache. Pokud tam nejsou, common.js je pravděpodobně teprve stahuje.
    // Ale my neblokujeme. Pokud je cache prázdná, ukážeme zamčeno (uživatel si počká na refresh nebo další load).
    const localData = window.BaseCampTheme?.getUserData() || { progress: {}, info: {} };
    const p = localData.progress || {};
    const info = localData.info || {};

    // Výpočet procent
    const theoryPercent = Math.round(([p.theory1, p.theory2, p.theory3, p.theory4, p.theory5].filter(Boolean).length / 5) * 100);
    const basePercent = Math.round(([p.faucet, p.send, p.receive, p.mint, p.launch].filter(Boolean).length / 5) * 100);
    const securityPercent = Math.round(([p.lab1, p.lab2, p.lab3, p.lab4, p.lab5].filter(Boolean).length / 5) * 100);

    // Update UI barů
    updateBar('theory', theoryPercent);
    updateBar('baseLab', basePercent);
    updateBar('security', securityPercent);

    const isLocalAllDone = (theoryPercent === 100 && basePercent === 100 && securityPercent === 100);

    // ZJISTÍME STAV POUZE Z CACHE
    const isClaimed = info.claimed_nft === true;

    // Update tlačítek
    updateNftUiState(isClaimed, isLocalAllDone, ethProvider, wallet);
}

function updateNftUiState(isClaimed, isLocalAllDone, ethProvider, wallet) {
    const nftSection = document.getElementById('nftSection');
    const nftBlockTitle = document.getElementById('nftBlockTitle');
    const nftBlockContent = document.getElementById('nftBlockContent');
    const mintBtn = document.getElementById('mintNftBtn');
    const ownedSection = document.getElementById('ownedNftSection');

    if (isClaimed) {
        // --- 1. UŽ MÁ NFT (podle Cache) ---
        if (nftSection) { nftSection.classList.remove('locked'); nftSection.classList.add('claimed'); }
        if (nftBlockTitle) nftBlockTitle.textContent = 'Already claimed!';
        if (nftBlockContent) nftBlockContent.style.display = 'none';
        if (ownedSection) ownedSection.style.display = 'block';
        if (mintBtn) {
            mintBtn.disabled = true;
            mintBtn.textContent = "NFT Claimed";
        }
    } else if (isLocalAllDone) {
        // --- 2. MŮŽE MINTOVAT ---
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
        // --- 3. NESPLNIL VŠE ---
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

    // 1. Approve
    mintBtn.textContent = "Confirm Approve...";
    const approveData = usdcIface.encodeFunctionData('approve', [NFT_CONTRACT, price]);
    await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: USDC, data: approveData }],
    });

    mintBtn.textContent = "Waiting...";
    await new Promise(r => setTimeout(r, 2000));

    // 2. Mint
    mintBtn.textContent = "Confirm Mint...";
    const mintData = badgeIface.encodeFunctionData('mintWithUSDC', []);
    const mintTx = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: NFT_CONTRACT, data: mintData }],
    });

    // 3. Update UI OKAMŽITĚ
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

    // 4. Update CACHE a DB
    try {
        // A) Update Cache (přes novou funkci v common.js)
        if (window.BaseCampTheme?.updateLocalInfo) {
            window.BaseCampTheme.updateLocalInfo('claimed_nft', true);
            console.log("Cache updated: claimed_nft = true");
        }

        // B) Update DB (USER_INFO)
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
        console.log("DB Updated Successfully");

    } catch (e) { console.error("Save failed", e); }

    // Success Modal
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