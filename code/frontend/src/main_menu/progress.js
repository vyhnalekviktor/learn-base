import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_CHAIN_ID_HEX = '0x2105'; // Base Mainnet

// Adresy
const NFT_CONTRACT = '0xE0F8cb7B89DB4619B21526AC70786444dd9d2f0f';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await sdk.actions.ready();

    // 1. Získáme peněženku z common.js cache
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

    // 2. Načteme data
    await loadProgressFromCache(wallet, sdk.wallet.ethProvider);

  } catch (error) {
    console.error('Load error:', error);
  }
});

async function loadProgressFromCache(wallet, ethProvider) {
    // A) Zkusíme data z lokální cache
    let data = window.BaseCampTheme?.getUserData();

    // B) Pokud data nejsou, stáhneme je
    if (!data || !data.progress || Object.keys(data.progress).length === 0) {
        console.log('Cache miss or empty, fetching data...');
        if (window.BaseCampTheme?.initUserData) {
            await window.BaseCampTheme.initUserData(wallet);
            data = window.BaseCampTheme.getUserData();
        }
    }

    if (!data || !data.progress) {
        console.warn('No user data found');
        return;
    }

    // === OPRAVA: OKAMŽITĚ SKRYJEME LOADING ===
    // Toto chybělo - common.js to dělá v refreshUI, ale my si kreslíme UI sami
    document.querySelectorAll('.loading-indicator').forEach(el => el.style.display = 'none');
    // Pokud tam máš text "Loading..." přímo v elementech, resetuj je:
    document.querySelectorAll('[data-lab-status]').forEach(el => {
        if (el.textContent === 'Loading...') el.textContent = '';
    });

    const { info, progress } = data;
    const p = progress;

    // --- 1. VYKRESLENÍ GRAFŮ ---
    const theoryParts = [p.theory1, p.theory2, p.theory3, p.theory4, p.theory5];
    const theoryPercent = Math.round((theoryParts.filter(Boolean).length / 5) * 100);
    updateBar('theory', theoryPercent);

    const baseParts = [p.faucet, p.send, p.receive, p.mint, p.launch];
    const basePercent = Math.round((baseParts.filter(Boolean).length / 5) * 100);
    updateBar('baseLab', basePercent);

    const securityParts = [p.lab1, p.lab2, p.lab3, p.lab4, p.lab5];
    const securityPercent = Math.round((securityParts.filter(Boolean).length / 5) * 100);
    updateBar('security', securityPercent);

    // --- 2. KONTROLA NÁROKU ---
    const allTheoryDone = theoryParts.every(val => val === true);
    const allPracticeDone = baseParts.every(val => val === true);
    const allSecurityDone = securityParts.every(val => val === true);
    const isEligibleToMint = allTheoryDone && allPracticeDone && allSecurityDone;

    // === OPRAVA: ROBUSTNĚJŠÍ CHECK ===
    // Použijeme !! aby to bralo true, 1, "true" atd.
    const claimedNft = info && (!!info.claimed_nft);

    // --- 3. AKTUALIZACE UI ---
    const nftSection = document.getElementById('nftSection');
    const nftBlockTitle = document.getElementById('nftBlockTitle');
    const nftBlockContent = document.getElementById('nftBlockContent');
    const mintBtn = document.getElementById('mintNftBtn');
    const ownedSection = document.getElementById('ownedNftSection');

    if (claimedNft) {
      if (nftSection) {
        nftSection.classList.remove('locked');
        nftSection.classList.add('claimed');
      }
      if (nftBlockTitle) nftBlockTitle.textContent = 'Already claimed!';
      if (nftBlockContent) nftBlockContent.style.display = 'none';
      if (ownedSection) ownedSection.style.display = 'block';

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
          else mintBtn.textContent = "Complete all lessons first";
      }
    }
}

function updateBar(prefix, percent) {
    const bar = document.getElementById(`${prefix}ProgressBar`);
    const text = document.getElementById(`${prefix}ProgressText`); // Ujisti se, že máš tento ID v HTML pro text procent
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}%`;

    // Fallback: Pokud máš status text pod barem, aktualizuj ho
    const statusText = document.querySelector(`[data-lab-status="${prefix}"]`); // Pokud používáš tento atribut
    if (statusText) {
        statusText.textContent = percent === 100 ? 'Completed' : `${percent}% Done`;
        statusText.style.color = percent === 100 ? '#22c55e' : '#cbd5e1';
    }
}

async function handlePaidClaim(ethProvider, wallet) {
  const mintBtn = document.getElementById('mintNftBtn');

  try {
    const { ethers } = await import('https://esm.sh/ethers@6.9.0');
    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const userWallet = accounts[0];

    let chainId = await ethProvider.request({ method: 'eth_chainId' });
    if (chainId !== BASE_CHAIN_ID_HEX) {
         try {
            await ethProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
         } catch (e) {
             alert("Please switch to Base Mainnet manually.");
             return;
         }
    }

    mintBtn.textContent = "Processing...";
    mintBtn.disabled = true;

    const usdcIface = new ethers.Interface(['function approve(address spender, uint256 amount) external returns (bool)']);
    const badgeIface = new ethers.Interface(['function mintWithUSDC() external']);
    const price = 2000000n;

    // Approve
    const approveData = usdcIface.encodeFunctionData('approve', [NFT_CONTRACT, price]);
    await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: USDC, data: approveData }],
    });

    await new Promise(r => setTimeout(r, 2000));

    // Mint
    const mintData = badgeIface.encodeFunctionData('mintWithUSDC', []);
    const mintTx = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: NFT_CONTRACT, data: mintData }],
    });

    // Update UI
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
    if (ownedSection) ownedSection.style.display = 'block';

    mintBtn.textContent = 'NFT Claimed!';
    mintBtn.classList.remove('pulse');

    // Save
    try {
      // Tady voláme updateLocalProgress, který v common.js už správně řeší 'info' sekci
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

    alert(`NFT Minted Successfully!`);

  } catch (e) {
    console.error(e);
    alert('Mint failed: ' + (e.message || e));
    mintBtn.disabled = false;
    mintBtn.textContent = "Mint Completion NFT";
  }
}