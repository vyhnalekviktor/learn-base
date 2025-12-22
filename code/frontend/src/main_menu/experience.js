// experience.js – Security lab + NFT claim za 2 USDC na Base mainnet

import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

const BASE_CHAIN_ID_HEX = '0x2105'; // Base mainnet

// NOVÝ badge kontrakt a USDC
const NFT_CONTRACT = '0xE0F8cb7B89DB4619B21526AC70786444dd9d2f0f';
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
      // hlavní tlačítko pro claim za 2 USDC
      mintBtn.onclick = async () => {
        await handlePaidClaim(ethProvider);
      };
    }
  } catch (err) {
    debug('getProgressAndSetupMint error: ' + (err.message || String(err)));
  }
}

// ========== CLAIM ZA 2 USDC (BaseCampBadge ERC721) ==========

async function handlePaidClaim(ethProvider) {
  const mintBtn = document.getElementById('mintNftBtn');

  try {
    debug('PAID CLAIM START – Base mainnet 0x2105, 2 USDC');

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

    // 2) Interfaces – USDC approve + badge mint
    const usdcIface = new ethers.Interface([
      'function approve(address spender, uint256 amount) external returns (bool)'
    ]);
    const badgeIface = new ethers.Interface([
      'function mintWithUSDC() external'
    ]);

    const price = 2000000n; // 2 USDC (6 decimals)

    // 3) Approve 2 USDC pro BaseCampBadge kontrakt
    const approveData = usdcIface.encodeFunctionData('approve', [
      NFT_CONTRACT,
      price,
    ]);
    debug('Sending USDC approve tx...');
    const approveTx = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userWallet,
        to: USDC,
        data: approveData,
      }],
    });
    debug('Approve tx hash: ' + approveTx);

    // malý delay, aby se approve propsal
    await new Promise(r => setTimeout(r, 2000));

    // 4) Mint NFT za 2 USDC
    const mintData = badgeIface.encodeFunctionData('mintWithUSDC', []);
    debug('Sending mintWithUSDC tx to ' + NFT_CONTRACT + ' ...');

    const mintTx = await ethProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userWallet,
        to: NFT_CONTRACT,
        data: mintData,
      }],
    });

    debug('Mint tx sent! Hash: ' + mintTx);

    const ownedSection = document.getElementById('ownedNftSection');
    if (ownedSection) ownedSection.style.display = 'block';
    if (mintBtn) {
      mintBtn.disabled = true;
      mintBtn.textContent = 'NFT Claimed!';
    }

    debug('SUCCESS - NFT claimed!');
    alert(`NFT claimed successfully!\nTx hash: ${mintTx}\nView on: https://basescan.org/tx/${mintTx}`);
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
