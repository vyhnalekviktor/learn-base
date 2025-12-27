import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_CHAIN_ID_HEX = '0x2105'; // Base Mainnet

const NFT_CONTRACT = '0xE0F8cb7B89DB4619B21526AC70786444dd9d2f0f';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

window.addEventListener('load', async () => {
  try {
    await sdk.actions.ready();

    // 1. Zkus načíst wallet z cache (sessionStorage)
    let wallet = sessionStorage.getItem('cached_wallet');

    // 2. Pokud není v cache, získej ho (fallback)
    if (!wallet) {
      console.log('No cached wallet, fetching from SDK...');
      const ethProvider = sdk.wallet.ethProvider;
      const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
      wallet = accounts && accounts.length > 0 ? accounts[0] : null;

      if (wallet) {
        // ZMĚNA: Ulož do sessionStorage
        sessionStorage.setItem('cached_wallet', wallet);
        console.log('Wallet cached to session:', wallet);
      }
    } else {
      console.log('Using cached wallet from session:', wallet);
    }

    if (!wallet) {
      console.warn('No wallet available');
      return;
    }

    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet;

    await getProgressAndSetupMint(wallet, sdk.wallet.ethProvider);
  } catch (error) {
    console.error('Load error:', error);
  }
});
// ... zbytek souboru progress.js je v pořádku, kopíruj ho sem ...
async function getProgressAndSetupMint(wallet, ethProvider) {
  try {
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    });

    if (!res.ok) {
      return;
    }

    const data = await res.json();
    const info = data.info;
    const progress = data.progress;

    if (!progress || !info) {
      return;
    }

    const theoryParts = [progress.theory1, progress.theory2, progress.theory3, progress.theory4, progress.theory5];
    let theoryCompleted = 0;
    for (const part of theoryParts) if (part === true) theoryCompleted++;
    const theoryPercent = Math.round((theoryCompleted / theoryParts.length) * 100);
    const theoryBar = document.getElementById('theoryProgressBar');
    const theoryText = document.getElementById('theoryProgressText');
    if (theoryBar) theoryBar.style.width = `${theoryPercent}%`;
    if (theoryText) theoryText.textContent = `${theoryPercent}%`;

    const baseParts = [progress.faucet, progress.send, progress.receive, progress.mint, progress.launch];
    let baseCompleted = 0;
    for (const part of baseParts) if (part === true) baseCompleted++;
    const basePercent = Math.round((baseCompleted / baseParts.length) * 100);
    const baseBar = document.getElementById('baseLabProgressBar');
    const baseText = document.getElementById('baseLabProgressText');
    if (baseBar) baseBar.style.width = `${basePercent}%`;
    if (baseText) baseText.textContent = `${basePercent}%`;

    const securityParts = [progress.lab1, progress.lab2, progress.lab3, progress.lab4, progress.lab5];
    let securityCompleted = 0;
    for (const part of securityParts) if (part === true) securityCompleted++;
    const securityPercent = Math.round((securityCompleted / securityParts.length) * 100);
    const secBar = document.getElementById('securityProgressBar');
    const secText = document.getElementById('securityProgressText');
    if (secBar) secBar.style.width = `${securityPercent}%`;
    if (secText) secText.textContent = `${securityPercent}%`;

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
  } catch (error) {
    console.error('getProgressAndSetupMint error:', error);
  }
}

async function handlePaidClaim(ethProvider, wallet) {
  const mintBtn = document.getElementById('mintNftBtn');

  try {
    const { ethers } = await import('https://esm.sh/ethers@6.9.0');

    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const userWallet = accounts && accounts[0] ? accounts[0] : null;
    if (!userWallet) {
      alert('Wallet address not found');
      return;
    }

    let chainId = await ethProvider.request({ method: 'eth_chainId' });
    if (chainId !== BASE_CHAIN_ID_HEX) {
      try {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID_HEX }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await ethProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID_HEX,
              chainName: 'Base',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        } else {
          throw switchError;
        }
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    const usdcIface = new ethers.Interface([
      'function approve(address spender, uint256 amount) external returns (bool)'
    ]);
    const badgeIface = new ethers.Interface([
      'function mintWithUSDC() external'
    ]);

    const price = 2000000n;

    const approveData = usdcIface.encodeFunctionData('approve', [
      NFT_CONTRACT,
      price,
    ]);
    await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userWallet,
        to: USDC,
        data: approveData,
      }],
    });

    await new Promise(r => setTimeout(r, 2000));

    const mintData = badgeIface.encodeFunctionData('mintWithUSDC', []);
    const mintTx = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userWallet,
        to: NFT_CONTRACT,
        data: mintData,
      }],
    });

    const viewLink = document.getElementById('view-nft-link');
    const txLinkSection = document.getElementById('txLinkSection');

    if (viewLink) {
      viewLink.href = `https://basescan.org/tx/${mintTx}`;
    }
    if (txLinkSection) {
      txLinkSection.style.display = 'block';
    }

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

    try {
      const res = await fetch(`${API_BASE}/api/database/update_field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet,
          table_name: 'USER_INFO',
          field_name: 'claimed_nft',
          value: true
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Update failed (${res.status}):`, errorText);
      }
    } catch (error) {
      console.error('Update claimed_nft error:', error);
    }

   // Nahraď alert() tímto:
function showSuccessModal(txHash) {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.8);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000; backdrop-filter: blur(10px);
    ">
      <div style="
        background: linear-gradient(135deg, #00FF88, #00D46A);
        padding: 30px; border-radius: 20px; max-width: 400px;
        text-align: center; color: black;
      ">
        <h3 style="margin: 0 0 15px; font-size: 24px;">NFT Minted!</h3>
        <p style="margin: 0 0 20px; font-size: 16px;">
          Tx: ${txHash.slice(0,10)}...
        </p>
        <a href="https://basescan.org/tx/${txHash}"
           target="_blank"
           style="display: inline-block; padding: 12px 24px;
                  background: rgba(0,0,0,0.2); color: black;
                  text-decoration: none; border-radius: 10px;
                  font-weight: 600;">
          View on Basescan
        </a>
        <button onclick="this.parentElement.parentElement.remove()"
                style="margin-top: 15px; padding: 12px 24px;
                       background: rgba(0,0,0,0.3); border: none;
                       border-radius: 10px; color: black; font-weight: 600;
                       cursor: pointer;">
          Close
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Použití:
showSuccessModal(mintTx);


  } catch (e) {
    if (!(e && e.code === 4001)) {
      alert('Error: ' + (e && e.message ? e.message : e));
    }
  }
}