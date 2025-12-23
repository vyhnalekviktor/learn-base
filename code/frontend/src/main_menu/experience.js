import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';
const BASE_CHAIN_ID_HEX = '0x2105';

const NFT_CONTRACT = '0xE0F8cb7B89DB4619B21526AC70786444dd9d2f0f';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

window.addEventListener('load', async () => {
  try {
    await sdk.actions.ready();

    const ethProvider = sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      return;
    }

    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet;

    await getProgressAndSetupMint(wallet, ethProvider);
  } catch (_) {
  }
});

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

    const theoryBar = document.getElementById('theoryProgressBar');
    const theoryText = document.getElementById('theoryProgressText');
    const theoryPercent = info.completed_theory ? 100 : 0;
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
  } catch (_) {
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

    alert(`NFT claimed successfully!\nTx hash: ${mintTx}\nView on: https://basescan.org/tx/${mintTx}`);

  } catch (e) {
    if (!(e && e.code === 4001)) {
      alert('Error: ' + (e && e.message ? e.message : e));
    }
  }
}
