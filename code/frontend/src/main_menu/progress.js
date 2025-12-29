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
  // Pojistka: Vložíme styly pro modal přímo sem, kdyby chyběly v CSS
  injectModalStyles();

  try {
    await sdk.actions.ready();

    let wallet = null;
    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            wallet = cache.wallet;
        } catch (e) { console.log('Wallet cache miss'); }
    }

    if (!wallet) {
      console.warn('No wallet available');
      return;
    }

    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet;

    await loadProgressFromCache(wallet, sdk.wallet.ethProvider);

  } catch (error) {
    console.error('Load error:', error);
  }
});

// === 2. LOAD DATA ===
async function loadProgressFromCache(wallet, ethProvider) {
    let data = window.BaseCampTheme?.getUserData();

    // Pokud data nejsou, stáhneme je
    if (!data) {
        await window.BaseCampTheme.initUserData(wallet);
        data = window.BaseCampTheme.getUserData();
    }

    if (!data || !data.progress) return;

    const { info, progress } = data;
    const p = progress;

    // --- GRAPHS ---
    const theoryPercent = Math.round(([p.theory1, p.theory2, p.theory3, p.theory4, p.theory5].filter(Boolean).length / 5) * 100);
    updateBar('theory', theoryPercent);

    const basePercent = Math.round(([p.faucet, p.send, p.receive, p.mint, p.launch].filter(Boolean).length / 5) * 100);
    updateBar('baseLab', basePercent);

    const securityPercent = Math.round(([p.lab1, p.lab2, p.lab3, p.lab4, p.lab5].filter(Boolean).length / 5) * 100);
    updateBar('security', securityPercent);

    // --- NFT LOGIC ---
    // Zkontrolujeme všechna pole (zda jsou true)
    const theoryDone = [p.theory1, p.theory2, p.theory3, p.theory4, p.theory5].every(Boolean);
    const baseDone = [p.faucet, p.send, p.receive, p.mint, p.launch].every(Boolean);
    const secDone = [p.lab1, p.lab2, p.lab3, p.lab4, p.lab5].every(Boolean);

    const allDone = theoryDone && baseDone && secDone;
    const claimedNft = info && info.claimed_nft === true;

    const nftSection = document.getElementById('nftSection');
    const nftBlockTitle = document.getElementById('nftBlockTitle');
    const nftBlockContent = document.getElementById('nftBlockContent');
    const mintBtn = document.getElementById('mintNftBtn');
    const ownedSection = document.getElementById('ownedNftSection');

    if (claimedNft) {
      // UŽ MÁ NFT
      if (nftSection) { nftSection.classList.remove('locked'); nftSection.classList.add('claimed'); }
      if (nftBlockTitle) nftBlockTitle.textContent = 'Already claimed!';
      if (nftBlockContent) nftBlockContent.style.display = 'none';
      if (ownedSection) ownedSection.style.display = 'block';
      if (mintBtn) { mintBtn.disabled = true; mintBtn.textContent = "NFT Claimed"; }

    } else if (allDone) {
      // PŘIPRAVENO K MINTU
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
      // NESPLNĚNO
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
    // 1. Check Network (Base Mainnet)
    let chainId = await ethProvider.request({ method: 'eth_chainId' });
    if (chainId !== BASE_CHAIN_ID_HEX) {
         try {
            await ethProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
         } catch (e) {
             showModal('danger', "Please switch your wallet to Base Mainnet.");
             return;
         }
    }

    if (mintBtn) {
        mintBtn.textContent = "Processing...";
        mintBtn.disabled = true;
    }

    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const userWallet = accounts[0];

    const usdcIface = new ethers.Interface(['function approve(address spender, uint256 amount) external returns (bool)']);
    const badgeIface = new ethers.Interface(['function mintWithUSDC() external']);
    const price = 2000000n; // 2 USDC

    // 2. Approve USDC
    if (mintBtn) mintBtn.textContent = "Confirm Approve...";
    const approveData = usdcIface.encodeFunctionData('approve', [NFT_CONTRACT, price]);
    const approveTx = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: USDC, data: approveData }],
    });

    // Wait for Approve
    if (mintBtn) mintBtn.textContent = "Approving...";
    const publicProvider = new JsonRpcProvider('https://mainnet.base.org');
    await publicProvider.waitForTransaction(approveTx);

    // 3. Mint NFT
    if (mintBtn) mintBtn.textContent = "Confirm Mint...";
    const mintData = badgeIface.encodeFunctionData('mintWithUSDC', []);
    const mintTxHash = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: NFT_CONTRACT, data: mintData }],
    });

    // Wait for Mint confirmation
    if (mintBtn) mintBtn.textContent = "Minting...";
    await publicProvider.waitForTransaction(mintTxHash);

    // --- SUCCESS! ZOBRAZIT MODAL HNED ---
    showModal('success', `
        <strong>Congratulations!</strong><br>
        You have officially completed BaseCamp.<br><br>
        <button onclick="window.open('https://basescan.org/tx/${mintTxHash}', '_blank')"
                style="background:#0052FF; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; width:100%; font-weight:bold;">
            View Transaction
        </button>
    `);

    // 4. Update UI
    const nftSection = document.getElementById('nftSection');
    const nftBlockTitle = document.getElementById('nftBlockTitle');
    const nftBlockContent = document.getElementById('nftBlockContent');
    const ownedSection = document.getElementById('ownedNftSection');

    if (nftSection) { nftSection.classList.add('claimed'); }
    if (nftBlockTitle) nftBlockTitle.textContent = 'Already claimed!';
    if (nftBlockContent) nftBlockContent.style.display = 'none';
    if (ownedSection) ownedSection.style.display = 'block';
    if (mintBtn) {
        mintBtn.textContent = 'NFT Claimed!';
        mintBtn.classList.remove('pulse');
    }

    // 5. Update Backend & Cache (na pozadí)
    try {
      // A) Lokální cache
      if (window.BaseCampTheme && window.BaseCampTheme.updateLocalProgress) {
         // Update 'info' sekce v cache, ne 'progress'
         // updateLocalProgress obvykle updatuje progress bar, my potřebujeme claimed_nft flag
         // Zkusíme zavolat updateLocalProgress pro jistotu, ale hlavně musíme zajistit reload dat příště
         window.BaseCampTheme.updateLocalProgress('claimed_nft', true);
      }

      // B) Databáze - USER_INFO
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

    } catch (dbError) {
      console.error("DB Save Warning (but NFT is minted):", dbError);
    }

  } catch (e) {
    console.error(e);
    showModal('danger', 'Mint failed: ' + (e.message || "User rejected transaction"));
    if (mintBtn) {
        mintBtn.disabled = false;
        mintBtn.textContent = "Mint Completion NFT";
    }
  }
}

// === 4. MODAL UTILS (Agresivní styl) ===
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

        /* Variants */
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