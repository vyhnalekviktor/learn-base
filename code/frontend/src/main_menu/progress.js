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
            <h3 style="margin-bottom: 8px;">Welcome to the Club!</h3>
            <p style="color: #666; margin-bottom: 20px; font-size: 14px;">
                You've completed the journey.
                Say "gm" to your new community and show them your badge!
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


// === OPRAVENÝ HANDLER (Network Switch PRVNÍ) ===
async function handlePaidClaim(ethProvider, wallet) {
  const mintBtn = document.getElementById('mintNftBtn');

  // !!! ZKONTROLUJ ADRESY !!!
  const ADMIN_WALLET = "0x5b9aCe009440c286E9A236f90118343fc61Ee48F";
  const NFT_CONTRACT = "0x23CAe5684d49c9145b60e888Be3139Fc17411553";

  const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const PRICE_WEI = 2000000n;

  try {
    const { ethers, BrowserProvider, Contract } = await import('https://esm.sh/ethers@6.9.0');

    // 1. Autorizace
    await ethProvider.request({ method: 'eth_requestAccounts' });

    // 2. Setup Providera
    const provider = new BrowserProvider(ethProvider);
    const signer = await provider.getSigner();

    // --- 3. KROK: PŘEPNUTÍ SÍTĚ (MUSÍ BÝT HNED TADY!) ---
    // Než sáhneme na USDC kontrakt, musíme být na Base
    const network = await provider.getNetwork();
    if (network.chainId !== 8453n) { // 8453 = Base Mainnet
         try {
            await ethProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x2105' }], // 8453 hex
            });
            // Počkáme chvilku, než se síť skutečně přehodí
            await new Promise(r => setTimeout(r, 1000));

            // Pro jistotu obnovíme providera po změně sítě
            // (Některé peněženky to vyžadují)
         } catch (e) {
             showModal('danger', "Prosím přepni peněženku na síť Base Mainnet.");
             return;
         }
    }

    // Získáme adresu uživatele
    const userAddress = await signer.getAddress();

    // --- 4. KONTROLA ZŮSTATKŮ (Teď už bezpečně na Base) ---
    const ethBalance = await provider.getBalance(userAddress);
    if (ethBalance === 0n) {
        throw new Error("Máš 0 ETH na síti Base. Potřebuješ alespoň pár centů na poplatky (gas).");
    }

    const usdcAbiCheck = ['function balanceOf(address owner) view returns (uint256)'];
    // Musíme znovu vytvořit kontrakt s providerem, který je určitě na Base
    const usdcCheckContract = new Contract(USDC_ADDRESS, usdcAbiCheck, signer);

    // Tady to padalo - teď už by nemělo
    const usdcBalance = await usdcCheckContract.balanceOf(userAddress);

    if (usdcBalance < PRICE_WEI) {
         const currentUsdc = ethers.formatUnits(usdcBalance, 6);
         throw new Error(`Nemáš dostatek USDC. Cena je 2.0, ty máš ${currentUsdc}.`);
    }

    // --- 5. VLASTNÍ PLATBA ---
    mintBtn.textContent = "Processing Payment...";
    mintBtn.disabled = true;

    const usdcAbi = ['function transfer(address to, uint256 amount) external returns (bool)'];
    const usdcContract = new Contract(USDC_ADDRESS, usdcAbi, signer);

    console.log("Sending USDC to:", ADMIN_WALLET);
    const tx = await usdcContract.transfer(ADMIN_WALLET, PRICE_WEI);

    mintBtn.textContent = "Verifying Payment...";
    await tx.wait();

    // --- 6. VOLÁNÍ BACKENDU ---
    mintBtn.textContent = "Minting NFT...";

    const response = await fetch(`${API_BASE}/api/buy-nft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            wallet: wallet,
            tx_hash: tx.hash
        })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.detail || "Server mint failed");
    }

    mintBtn.textContent = "NFT Delivered!";

    // UI Update
    const nftSection = document.getElementById('nftSection');
    const nftBlockTitle = document.getElementById('nftBlockTitle');
    const nftBlockContent = document.getElementById('nftBlockContent');
    const ownedSection = document.getElementById('ownedNftSection');

    if (nftSection) nftSection.classList.add('claimed');
    if (nftBlockTitle) nftBlockTitle.textContent = 'Already claimed!';
    if (nftBlockContent) nftBlockContent.style.display = 'none';

    if (ownedSection) {
        ownedSection.style.display = 'block';
        const pageShareBtn = document.getElementById('shareBtn');
        if (pageShareBtn) {
             pageShareBtn.style.display = 'inline-flex';
             pageShareBtn.onclick = shareSuccess;
        }
    }

    if (window.BaseCampTheme) window.BaseCampTheme.updateLocalProgress('claimed_nft', true);
    showNftModal();

  } catch (e) {
    console.error(e);
    mintBtn.disabled = false;
    mintBtn.textContent = "Mint Completion NFT";

    let msg = (e.message || e).toString();
    if (msg.includes("user rejected")) msg = "Transakce zrušena uživatelem.";

    // Ošetření chybějící revert data (kdyby náhodou)
    if (msg.includes("missing revert data")) {
       msg = "Chyba komunikace se sítí. Zkontroluj, zda jsi na Base Mainnetu.";
    }

    showModal('danger', `Process failed:<br>${msg.substring(0, 100)}`);
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

    sdk.actions.composeCast({
        text: 'gm Base! 🔵\n\nJust leveled up my onchain skills. If you are a beginner looking for a safe, hands-on start, BaseCamp is the way.\n\nStart your journey here: 👇',
        embeds: [appUrl]
    });
}