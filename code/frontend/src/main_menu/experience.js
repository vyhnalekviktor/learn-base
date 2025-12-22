// experience.js – Security lab + NFT claim za 4 USDC na Base mainnet

import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

const BASE_CHAIN_ID_HEX = '0x2105'; // Base mainnet
const NFT_CONTRACT = '0xA76F456f6FbaB161069fc891c528Eb56672D3e69';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// ========== DEBUG ==========
function debug(msg) {
  console.log(msg);
  const box = document.getElementById('debugLog');
  if (!box) return;
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  box.textContent += `[${time}] ${msg}\n`;
  box.scrollTop = box.scrollHeight;
}

// ========== INIT ==========
window.addEventListener('load', async () => {
  try {
    debug('Page loaded, calling sdk.actions.ready()...');
    await sdk.actions.ready();
    debug('BaseCamp mini app is ready!');

    const ethProvider = sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      debug('Wallet address not found from ethProvider.request');
      return;
    }

    debug('Connected wallet from SDK: ' + wallet);
    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet;

    await getProgressAndSetupMint(wallet, ethProvider);
  } catch (error) {
    debug('Error during MiniApp wallet init: ' + (error.message || String(error)));
  }
});

// ========== PROGRESS + MINT ODEMKNUTÍ ==========
async function getProgressAndSetupMint(wallet, ethProvider) {
  try {
    debug('Loading user progress from backend for wallet: ' + wallet);

    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    });

    if (!res.ok) {
      let msg = 'Unknown backend error';
      try {
        const err = await res.json();
        msg = err.detail ? JSON.stringify(err) : msg;
      } catch {}
      debug('get-user error: ' + msg + ' (status: ' + res.status + ')');
      return;
    }

    const data = await res.json();
    const info = data.info;
    const progress = data.progress;

    if (!progress || !info) {
      debug('Missing info or progress object in response');
      return;
    }

    // Theory progress
    const theoryBar = document.getElementById('theoryProgressBar');
    const theoryText = document.getElementById('theoryProgressText');
    const theoryPercent = info.completed_theory ? 100 : 0;
    if (theoryBar) theoryBar.style.width = `${theoryPercent}%`;
    if (theoryText) theoryText.textContent = `${theoryPercent}%`;

    // Base labs
    const baseParts = [progress.faucet, progress.send, progress.receive, progress.mint, progress.launch];
    let baseCompleted = 0;
    for (const part of baseParts) if (part === true) baseCompleted++;
    const basePercent = Math.round((baseCompleted / baseParts.length) * 100);
    debug('Base Chain Lab percent: ' + basePercent);
    const baseBar = document.getElementById('baseLabProgressBar');
    const baseText = document.getElementById('baseLabProgressText');
    if (baseBar) baseBar.style.width = `${basePercent}%`;
    if (baseText) baseText.textContent = `${basePercent}%`;

    // Security labs
    const securityParts = [progress.lab1, progress.lab2, progress.lab3, progress.lab4, progress.lab5];
    let securityCompleted = 0;
    for (const part of securityParts) if (part === true) securityCompleted++;
    const securityPercent = Math.round((securityCompleted / securityParts.length) * 100);
    debug('Security Lab percent: ' + securityPercent);
    const secBar = document.getElementById('securityProgressBar');
    const secText = document.getElementById('securityProgressText');
    if (secBar) secBar.style.width = `${securityPercent}%`;
    if (secText) secText.textContent = `${securityPercent}%`;

    // completed_all odemkne claim
    const completedAll = info.completed_all === true;
    debug('completed_all from USER_INFO: ' + JSON.stringify(completedAll));

    const nftSection = document.getElementById('nftSection');
    const mintBtn = document.getElementById('mintNftBtn');

    if (completedAll) {
      debug('All labs completed - unlocking NFT claim');
      if (nftSection) nftSection.classList.remove('locked');
      if (mintBtn) mintBtn.disabled = false;
    } else {
      debug('Not all labs completed - claim button stays locked');
    }

    if (mintBtn) {
      mintBtn.onclick = async () => {
        await handlePaidClaim(ethProvider);
      };
    }
  } catch (err) {
    debug('getProgressAndSetupMint error: ' + (err.message || String(err)));
  }
}

// ========== CLAIM ZA 4 USDC (stejné parametry jako thirdweb curl) ==========
async function handlePaidClaim(ethProvider) {
  const mintBtn = document.getElementById('mintNftBtn');
  try {
    debug('PAID CLAIM START – Base mainnet 0x2105, 4 USDC');

    const { ethers } = await import('https://esm.sh/ethers@6.9.0');

    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const userWallet = accounts && accounts[0] ? accounts[0] : null;
    if (!userWallet) {
      debug('Wallet not found');
      alert('Wallet address not found');
      return;
    }
    debug('Using wallet: ' + userWallet);

    // 1) Chain check – Base mainnet
    let chainId = await ethProvider.request({ method: 'eth_chainId' });
    debug('Current chain: ' + chainId);
    if (chainId !== BASE_CHAIN_ID_HEX) {
      debug('Switching to Base mainnet...');
      try {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID_HEX }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          debug('Adding Base network to wallet...');
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

    // 2) Ethers interface pro claim
    const iface = new ethers.Interface([
      'function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, (bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) payable'
    ]);

    // Parametry podle tvého curl:
    // _receiver = userWallet
    // _tokenId = 0
    // _quantity = 1
    // _currency = USDC na Base
    // _pricePerToken = 4000000 (4 USDC s 6 decimály)
    const receiver = userWallet;
    const tokenId = 0n;
    const quantity = 1n;
    const currency = USDC;
    const pricePerToken = 4000000n;

    const allowlistProof = {
      proof: [],
      quantityLimitPerWallet: 0n,
      pricePerToken: pricePerToken,
      currency: currency,
    };

    const dataBytes = '0x';

    const claimData = iface.encodeFunctionData('claim', [
      receiver,
      tokenId,
      quantity,
      currency,
      pricePerToken,
      allowlistProof,
      dataBytes,
    ]);

    debug('claimData generated (length: ' + claimData.length + '): ' + claimData.slice(0, 80) + '...');
    debug('Sending claim transaction to ' + NFT_CONTRACT);

    // 3) Uživatel podepíše tx (platí 4 USDC z vlastního účtu)
    const txHash = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userWallet,
        to: NFT_CONTRACT,
        data: claimData,
        // value: '0x0'  // platba je v USDC, ne v ETH
      }],
    });

    debug('Claim tx sent! Hash: ' + txHash);

    const ownedSection = document.getElementById('ownedNftSection');
    if (ownedSection) ownedSection.style.display = 'block';
    if (mintBtn) {
      mintBtn.disabled = true;
      mintBtn.textContent = 'NFT Claimed!';
    }

    debug('SUCCESS - NFT claimed!');
    alert(`NFT claimed successfully!\nTx hash: ${txHash}\nView on: https://basescan.org/tx/${txHash}`);
  } catch (e) {
    debug('Claim error: ' + (e.message || String(e)));
    if (e.code === 4001) {
      debug('User rejected transaction');
    } else if (e.message && e.message.toLowerCase().includes('insufficient')) {
      debug('Insufficient funds or allowance');
    }
    alert('Error: ' + (e.message || e));
  }
}
