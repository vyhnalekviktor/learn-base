import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_CHAIN_ID_HEX = '0x2105'; // Base Mainnet

// Adresy pro Mint
const NFT_CONTRACT = '0xE0F8cb7B89DB4619B21526AC70786444dd9d2f0f';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Inicializace SDK
    await sdk.actions.ready();

    let wallet = null;
    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            wallet = cache.wallet;
        } catch (e) {
            console.log('Wallet cache miss');
        }
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

async function loadProgressFromCache(wallet, ethProvider) {
    let data = window.BaseCampTheme?.getUserData();
    if (!data) {
        await window.BaseCampTheme.initUserData(wallet);
        data = window.BaseCampTheme.getUserData();
    }

    if (!data || !data.progress) return;

    const { info, progress } = data;
    const p = progress;

    // 1. Graphs
    const theoryParts = [p.theory1, p.theory2, p.theory3, p.theory4, p.theory5];
    const theoryPercent = Math.round((theoryParts.filter(Boolean).length / 5) * 100);
    updateBar('theory', theoryPercent);

    const baseParts = [p.faucet, p.send, p.receive, p.mint, p.launch];
    const basePercent = Math.round((baseParts.filter(Boolean).length / 5) * 100);
    updateBar('baseLab', basePercent);

    const securityParts = [p.lab1, p.lab2, p.lab3, p.lab4, p.lab5];
    const securityPercent = Math.round((securityParts.filter(Boolean).length / 5) * 100);
    updateBar('security', securityPercent);

    // 2. Logic
    const allTheoryDone = theoryParts.every(val => val === true);
    const allPracticeDone = baseParts.every(val => val === true);
    const allSecurityDone = securityParts.every(val => val === true);
    const isEligibleToMint = allTheoryDone && allPracticeDone && allSecurityDone;
    const claimedNft = info && info.claimed_nft === true;

    // 3. UI Updates
    const nftSection = document.getElementById('nftSection');
    const nftBlockTitle = document.getElementById('nftBlockTitle');
    const nftBlockContent = document.getElementById('nftBlockContent');
    const mintBtn = document.getElementById('mintNftBtn');
    const ownedSection = document.getElementById('ownedNftSection');

    if (claimedNft) {
      // Skryjeme sekci pro mintování
      if (nftSection) {
        nftSection.classList.remove('locked');
        nftSection.classList.add('claimed');
      }
      if (nftBlockTitle) nftBlockTitle.textContent = 'Already claimed!';
      if (nftBlockContent) nftBlockContent.style.display = 'none';

      // Zobrazíme sekci "Your NFT"
      if (ownedSection) {
          ownedSection.style.display = 'block';

          const pageShareBtn = document.getElementById('shareBtn');
          if (pageShareBtn) {
            pageShareBtn.style.display = 'inline-flex';
            pageShareBtn.className = 'share-btn';
            // SVG ikona
            pageShareBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                Share to Feed
            `;
            // ZDE JE OPRAVA: Voláme novou funkci pro Farcaster Compose
            pageShareBtn.onclick = shareSuccess;
          }
      }

      // Automaticky otevřít modal při vstupu, pokud už má hotovo
      // (Můžete to zakomentovat, pokud to má vyskočit jen ihned po mintu)
      showNftModal();

    } else if (isEligibleToMint) {
      if (nftSection) nftSection.classList.remove('locked');
      if (mintBtn) {
          mintBtn.disabled = false;
          mintBtn.classList.add('pulse');
          mintBtn.textContent = "Mint Completion NFT";
          mintBtn.onclick = async () => {
            await handlePaidClaim(ethProvider, wallet);
          };
      }
    } else {
      if (mintBtn) {
          mintBtn.disabled = true;
          if (!allTheoryDone) mintBtn.textContent = "Finish Theory First";
          else if (!allPracticeDone) mintBtn.textContent = "Finish Practice Labs";
          else if (!allSecurityDone) mintBtn.textContent = "Finish Security Labs";
      }
    }
}

function updateBar(prefix, percent) {
    const bar = document.getElementById(`${prefix}ProgressBar`);
    const text = document.getElementById(`${prefix}ProgressText`);
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}%`;
}

// === SPECIÁLNÍ MODAL PRO NFT A SHARE ===
function showNftModal() {
    const content = `
        <div class="modal-text-center">
            <img src="../../images/nft1.png" alt="Your NFT" class="modal-nft-image">
            <h3 style="margin-bottom: 8px;">You are a Graduate!</h3>
            <p style="color: #666; margin-bottom: 20px; font-size: 14px;">
                Congratulations on completing the BaseCamp curriculum.
                Show off your badge to the world!
            </p>
            <div class="share-btn-container">
                <button id="modalShareBtn" class="share-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                    Share to Feed
                </button>
            </div>
        </div>
    `;

    showModal('success', content);

    // Navázání eventu na tlačítko v modalu
    setTimeout(() => {
        const btn = document.getElementById('modalShareBtn');
        if (btn) btn.onclick = shareSuccess;
    }, 100);
}


// === HANDLER PRO MINT ===
async function handlePaidClaim(ethProvider, wallet) {
  const mintBtn = document.getElementById('mintNftBtn');

  try {
    const { ethers } = await import('https://esm.sh/ethers@6.9.0');
    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const userWallet = accounts[0];

    // 1. Kontrola Sítě
    let chainId = await ethProvider.request({ method: 'eth_chainId' });
    if (chainId !== BASE_CHAIN_ID_HEX) {
         try {
            await ethProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
         } catch (e) {
             showModal('danger', "Please switch to Base Mainnet manually in your wallet.");
             return;
         }
    }

    mintBtn.textContent = "Processing...";
    mintBtn.disabled = true;

    const usdcIface = new ethers.Interface(['function approve(address spender, uint256 amount) external returns (bool)']);
    const badgeIface = new ethers.Interface(['function mintWithUSDC() external']);
    const price = 2000000n; // 2 USDC

    // 2. Approve
    const approveData = usdcIface.encodeFunctionData('approve', [NFT_CONTRACT, price]);
    await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: USDC, data: approveData }],
    });

    await new Promise(r => setTimeout(r, 2000));

    // 3. Mint
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

    if (nftSection) {
      nftSection.classList.remove('locked');
      nftSection.classList.add('claimed');
    }
    if (nftBlockTitle) nftBlockTitle.textContent = 'Already claimed!';
    if (nftBlockContent) nftBlockContent.style.display = 'none';

    if (ownedSection) {
        ownedSection.style.display = 'block';
        const pageShareBtn = document.getElementById('shareBtn');
        if (pageShareBtn) {
             pageShareBtn.style.display = 'inline-flex';
             pageShareBtn.className = 'share-btn';
             pageShareBtn.onclick = shareSuccess;
        }
    }

    // === ZOBRAZENÍ LINKU NA EXPLORER (OPRAVENO PRO SDK) ===
    const txSection = document.getElementById('txLinkSection');
    const viewLinkBtn = document.getElementById('view-nft-link');

    if (txSection && viewLinkBtn && mintTx) {
        txSection.style.display = 'block';
        // Nastavíme chování tlačítka pro otevření URL přes SDK
        viewLinkBtn.onclick = (e) => {
            e.preventDefault(); // Pro jistotu, kdyby to byl <a href>
            sdk.actions.openUrl(`https://basescan.org/tx/${mintTx}`);
        };
    }

    mintBtn.textContent = 'NFT Claimed!';

    // 5. DB Update
    try {
      if (window.BaseCampTheme) window.BaseCampTheme.updateLocalProgress('claimed_nft', true);

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
    } catch (error) {
      console.error('Update claimed_nft error:', error);
    }

    showNftModal();

  } catch (e) {
    console.error(e);
    const msg = (e.message || e).toString();
    showModal('danger', `Mint failed:<br>${msg.length > 80 ? "Transaction failed / rejected" : msg}`);
    mintBtn.disabled = false;
    mintBtn.textContent = "Mint Completion NFT";
  }
}

// === POMOCNÉ FUNKCE ===

function showModal(type, msg) {
    const old = document.querySelector('.custom-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';

    let title = 'NOTICE';
    let modalClass = 'modal-warning';

    if (type === 'success') {
        title = 'CONGRATULATIONS!';
        modalClass = 'modal-success';
    } else if (type === 'danger') {
        title = 'ERROR';
        modalClass = 'modal-danger';
    }

    overlay.innerHTML = `
        <div class="custom-modal-content ${modalClass}">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
            </div>
            <div class="modal-body">
                ${msg}
            </div>
            <div class="modal-footer">
                <button class="modal-btn" onclick="this.closest('.custom-modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

function shareSuccess() {
    const appUrl = 'https://learnbase.quest';
    const shareUrl = 'https://learnbase.quest/images/share_success.jpg';

    sdk.actions.composeCast({
        // 1. Změna: Odkaz vložíme přímo na konec textu (${appUrl})
        text: `gm Base! 🔵\n\nJust leveled up my onchain skills. If you are a beginner looking for a safe, hands-on start, BaseCamp is the way.\n\nStart your journey here: ${appUrl}`,

        // 2. Změna: Do embeds dáme JEN obrázek.
        // Když je tam sám, Warpcast ho roztáhne na plnou šířku a nebude ho ořezávat.
        embeds: [shareUrl]
    });
}