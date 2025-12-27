import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_CHAIN_ID_HEX = '0x2105';

const NFT_CONTRACT = '0xE0F8cb7B89DB4619B21526AC70786444dd9d2f0f';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Používáme DOMContentLoaded pro rychlý start
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await sdk.actions.ready();

    // 1. Získáme peněženku z common.js cache
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

    // 2. Načteme data (Z CACHE - bleskové)
    await loadProgressFromCache(wallet, sdk.wallet.ethProvider);

  } catch (error) {
    console.error('Load error:', error);
  }
});

async function loadProgressFromCache(wallet, ethProvider) {
    // A) Zkusíme data z lokální cache
    let data = window.BaseCampTheme?.getUserData();

    // B) Pokud data nejsou (např. hard refresh), stáhneme je a uložíme
    if (!data) {
        console.log('Cache miss, fetching data...');
        await window.BaseCampTheme.initUserData(wallet);
        data = window.BaseCampTheme.getUserData();
    }

    if (!data || !data.info || !data.progress) {
        console.warn('No user data found');
        return;
    }

    const { info, progress } = data;

    // --- VYKRESLENÍ GRAFŮ ---

    // Theory
    const theoryParts = [progress.theory1, progress.theory2, progress.theory3, progress.theory4, progress.theory5];
    const theoryPercent = Math.round((theoryParts.filter(Boolean).length / 5) * 100);
    updateBar('theory', theoryPercent);

    // Practice
    const baseParts = [progress.faucet, progress.send, progress.receive, progress.mint, progress.launch];
    const basePercent = Math.round((baseParts.filter(Boolean).length / 5) * 100);
    updateBar('baseLab', basePercent); // ID v HTML je baseLabProgressBar

    // Security
    const securityParts = [progress.lab1, progress.lab2, progress.lab3, progress.lab4, progress.lab5];
    const securityPercent = Math.round((securityParts.filter(Boolean).length / 5) * 100);
    updateBar('security', securityPercent);

    // --- NFT CLAIM LOGIKA ---
    const completedAll = info.completed_all === true;
    const claimedNft = info.claimed_nft === true;

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
    } else if (completedAll) {
      if (nftSection) nftSection.classList.remove('locked');
      if (mintBtn) mintBtn.disabled = false;
    }

    if (mintBtn && !claimedNft) {
      mintBtn.onclick = async () => {
        await handlePaidClaim(ethProvider, wallet);
      };
    }
}

function updateBar(prefix, percent) {
    const bar = document.getElementById(`${prefix}ProgressBar`);
    const text = document.getElementById(`${prefix}ProgressText`);
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}%`;
}

// ... (Zbytek funkce handlePaidClaim zůstává stejný jako předtím,
// jen na konci zavolej window.BaseCampTheme.updateLocalProgress('claimed_nft', true)) ...

async function handlePaidClaim(ethProvider, wallet) {
  const mintBtn = document.getElementById('mintNftBtn');

  try {
    const { ethers } = await import('https://esm.sh/ethers@6.9.0');
    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const userWallet = accounts[0];

    // Switch Chain Logic... (zkráceno pro přehlednost, použij svůj původní kód)
    let chainId = await ethProvider.request({ method: 'eth_chainId' });
    if (chainId !== BASE_CHAIN_ID_HEX) {
         try {
            await ethProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
         } catch (e) {
             // Add chain logic...
         }
    }

    // Approve & Mint Logic...
    const usdcIface = new ethers.Interface(['function approve(address spender, uint256 amount) external returns (bool)']);
    const badgeIface = new ethers.Interface(['function mintWithUSDC() external']);
    const price = 2000000n; // 2 USDC

    // 1. Approve
    const approveData = usdcIface.encodeFunctionData('approve', [NFT_CONTRACT, price]);
    await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: USDC, data: approveData }],
    });

    // Wait...
    await new Promise(r => setTimeout(r, 2000));

    // 2. Mint
    const mintData = badgeIface.encodeFunctionData('mintWithUSDC', []);
    const mintTx = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ from: userWallet, to: NFT_CONTRACT, data: mintData }],
    });

    // UI Updates
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
    if (mintBtn) {
      mintBtn.disabled = true;
      mintBtn.textContent = 'NFT Claimed!';
    }

    // UPDATE DB & CACHE
    try {
      // Optimistic update
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

    alert(`NFT Minted! Tx: ${mintTx}`);

  } catch (e) {
    console.error(e);
    alert('Mint failed: ' + (e.message || e));
  }
}