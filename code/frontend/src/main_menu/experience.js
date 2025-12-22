import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

// Chain + kontrakty
const BASE_CHAIN_ID_HEX = '0x2105'; // Base mainnet 8453
const NFT_CONTRACT = '0xA76F456f6FbaB161069fc891c528Eb56672D3e69';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
// 4000000 (4 USDC, 6 desetin), left-padded na 32 bajtů
const PRICE_USDC_HEX = '00000000000000000000000000000000000000000000000000000000003d0900';

function debug(msg) {
  console.log(msg);
  const box = document.getElementById('debugLog');
  if (!box) return;
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  box.textContent += `[${time}] ${msg}\n`;
  box.scrollTop = box.scrollHeight;
}

window.addEventListener('load', async () => {
  try {
    debug('Page loaded, calling sdk.actions.ready()...');
    await sdk.actions.ready();
    debug('BaseCamp mini app is ready!');

    const ethProvider = await sdk.wallet.ethProvider();
    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;

    if (!wallet) {
      debug('Wallet address not found from ethProvider.request');
      return;
    }

    debug('Connected wallet from SDK: ' + wallet);
    const span = document.getElementById('wallet-address');
    if (span) span.textContent = wallet;

    await getProgress(wallet);
    await checkCompletedAll(wallet, ethProvider);
  } catch (error) {
    debug('Error during MiniApp wallet init: ' + (error.message || String(error)));
  }
});

async function getProgress(wallet) {
  try {
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
      } catch {
        // ignore
      }
      debug('get-user error: ' + msg);
      return;
    }

    const data = await res.json();
    const info = data.info;
    const progress = data.progress;

    if (!progress || !info) {
      debug('Missing info or progress object in response');
      return;
    }

    // THEORY
    const theoryBar = document.getElementById('theoryProgressBar');
    const theoryText = document.getElementById('theoryProgressText');
    const theoryPercent = info.completed_theory ? 100 : 0;
    if (theoryBar) theoryBar.style.width = `${theoryPercent}%`;
    if (theoryText) theoryText.textContent = `${theoryPercent}%`;

    // BASE CHAIN LAB
    const baseParts = [progress.faucet, progress.send, progress.receive, progress.mint, progress.launch];
    let baseCompleted = 0;
    for (const part of baseParts) if (part === true) baseCompleted++;
    const basePercent = Math.round((baseCompleted / baseParts.length) * 100);
    debug('Base Chain Lab percent: ' + basePercent);

    const baseBar = document.getElementById('baseLabProgressBar');
    const baseText = document.getElementById('baseLabProgressText');
    if (baseBar) baseBar.style.width = `${basePercent}%`;
    if (baseText) baseText.textContent = `${basePercent}%`;

    // SECURITY LAB
    const securityParts = [progress.lab1, progress.lab2, progress.lab3, progress.lab4, progress.lab5];
    let securityCompleted = 0;
    for (const part of securityParts) if (part === true) securityCompleted++;
    const securityPercent = Math.round((securityCompleted / securityParts.length) * 100);
    debug('Security Lab percent: ' + securityPercent);

    const secBar = document.getElementById('securityProgressBar');
    const secText = document.getElementById('securityProgressText');
    if (secBar) secBar.style.width = `${securityPercent}%`;
    if (secText) secText.textContent = `${securityPercent}%`;
  } catch (err) {
    debug('getProgress error: ' + (err.message || String(err)));
  }
}

async function checkCompletedAll(wallet, ethProvider) {
  try {
    const res = await fetch(`${API_BASE}/api/database/get-field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet,
        table_name: 'USER_INFO',
        field_name: 'completedall',
      }),
    });

    if (!res.ok) {
      let msg = 'Unknown backend error';
      try {
        const err = await res.json();
        msg = err.detail ? JSON.stringify(err) : msg;
      } catch {
        // ignore
      }
      debug('get-field completedall error: ' + msg);
      return;
    }

    const data = await res.json();
    const value = data.value;
    debug('completedall value: ' + JSON.stringify(value));

    const nftSection = document.getElementById('nftSection');
    const mintBtn = document.getElementById('mintNftBtn');

    if (value === true) {
      if (nftSection) nftSection.classList.remove('locked');
      if (mintBtn) mintBtn.disabled = false;
    }

    if (mintBtn) {
      mintBtn.onclick = async () => {
        try {
          debug('MINT START – user pays from own wallet');

          // 1) aktuální účet z MiniApp SDK
          const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
          const userWallet = (accounts && accounts[0]) ? accounts[0].toLowerCase() : null;
          if (!userWallet) {
            alert('Wallet address not found');
            return;
          }
          debug('Using wallet: ' + userWallet);

          // 2) přepni na Base mainnet
          let chainId = await ethProvider.request({ method: 'eth_chainId' });
          debug('Current chain: ' + chainId);
          if (chainId !== BASE_CHAIN_ID_HEX) {
            await ethProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
            debug('Switched to Base 0x2105');
            chainId = await ethProvider.request({ method: 'eth_chainId' });
            debug('New chain: ' + chainId);
          }

          // 3) APPROVE 4 USDC pro NFT_CONTRACT
          debug('Sending USDC approve tx...');
          const approveData =
            '0x095ea7b3' + // approve(address,uint256)
            '000000000000000000000000' + NFT_CONTRACT.slice(2).toLowerCase() +
            PRICE_USDC_HEX;

          const approveTx = await ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userWallet,
              to: USDC,
              data: approveData,
            }],
          });
          debug('Approve tx hash: ' + approveTx);

          // 4) krátká pauza (jednoduchá varianta místo čekání na receipt)
          await new Promise(r => setTimeout(r, 5000));

          // 5) CLAIM NFT – ručně encodovaný ABI call claim(...)
          debug('Sending claim tx...');
          const claimData =
            '0x57bc3d78' + // selector
            '000000000000000000000000' + userWallet.slice(2).toLowerCase() + // _receiver
            '0000000000000000000000000000000000000000000000000000000000000000' + // _tokenId = 0
            '0000000000000000000000000000000000000000000000000000000000000001' + // _quantity = 1
            '000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913' + // _currency = USDC
            PRICE_USDC_HEX +                                                   // _pricePerToken
            '00000000000000000000000000000000000000000000000000000000000000e0' + // offset _allowlistProof
            '0000000000000000000000000000000000000000000000000000000000000200' + // offset _data
            // _allowlistProof (tuple)
            '0000000000000000000000000000000000000000000000000000000000000000' + // proof length = 0
            '0000000000000000000000000000000000000000000000000000000000000000' + // quantityLimitPerWallet = 0
            PRICE_USDC_HEX +                                                   // pricePerToken = 4000000
            '000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913' + // currency = USDC
            // _data (empty bytes)
            '0000000000000000000000000000000000000000000000000000000000000000';  // length = 0

          const claimTx = await ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userWallet,
              to: NFT_CONTRACT,
              data: claimData,
            }],
          });
          debug('Claim tx hash: ' + claimTx);

          // UI update
          const ownedSection = document.getElementById('ownedNftSection');
          if (ownedSection) ownedSection.style.display = 'block';
          mintBtn.disabled = true;
          mintBtn.textContent = 'NFT Minted!';
          alert(`NFT claimed!\nTx hash: ${claimTx}`);
        } catch (e) {
          debug('Mint/claim error: ' + (e.message || String(e)));
          alert('Error: ' + (e.message || e));
        }
      };
    }
  } catch (err) {
    debug('checkCompletedAll error: ' + (err.message || String(err)));
  }
}
