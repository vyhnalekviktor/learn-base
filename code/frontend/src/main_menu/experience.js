import sdk from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = 'https://learn-base-backend.vercel.app';

const BASE_CHAIN_ID_HEX = '0x2105';
const NFT_CONTRACT = '0xA76F456f6FbaB161069fc891c528Eb56672D3e69';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PRICE_USDC_HEX = '00000000000000000000000000000000000000000000000000000000003d0900';

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
  } catch (error) {
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
      let msg = 'Unknown backend error';
      try {
        const err = await res.json();
        msg = err.detail ? JSON.stringify(err) : msg;
      } catch {}
      return;
    }

    const data = await res.json();
    const info = data.info;
    const progress = data.progress;

    if (!progress || !info) {
      return;
    }

    // Progress bars
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

    // Odemčení mintu podle USER_INFO.completed_all (předpoklad: info.completed_all)
    const completedAll = info.completed_all === true;

    const nftSection = document.getElementById('nftSection');
    const mintBtn = document.getElementById('mintNftBtn');

    if (completedAll) {
      if (nftSection) nftSection.classList.remove('locked');
      if (mintBtn) mintBtn.disabled = false;
    }

    if (mintBtn) {
      mintBtn.onclick = async () => {
        try {

          const accounts2 = await ethProvider.request({ method: 'eth_requestAccounts' });
          const userWallet = (accounts2 && accounts2[0]) ? accounts2[0].toLowerCase() : null;
          if (!userWallet) {
            alert('Wallet address not found');
            return;
          }
          let chainId = await ethProvider.request({ method: 'eth_chainId' });
          if (chainId !== BASE_CHAIN_ID_HEX) {
            await ethProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
            chainId = await ethProvider.request({ method: 'eth_chainId' });
          }

          // APPROVE 4 USDC
          const approveData =
            '0x095ea7b3' +
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

          await new Promise(r => setTimeout(r, 5000));

          // CLAIM
          const claimData =
            '0x57bc3d78' +
            '000000000000000000000000' + userWallet.slice(2).toLowerCase() +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            '0000000000000000000000000000000000000000000000000000000000000001' +
            '000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913' +
            PRICE_USDC_HEX +
            '00000000000000000000000000000000000000000000000000000000000000e0' +
            '0000000000000000000000000000000000000000000000000000000000000200' +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            PRICE_USDC_HEX +
            '000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913' +
            '0000000000000000000000000000000000000000000000000000000000000000';

          const claimTx = await ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: userWallet,
              to: NFT_CONTRACT,
              data: claimData,
            }],
          });

          const ownedSection = document.getElementById('ownedNftSection');
          if (ownedSection) ownedSection.style.display = 'block';
          mintBtn.disabled = true;
          mintBtn.textContent = 'NFT Minted!';
          alert(`NFT claimed!\nTx hash: ${claimTx}`);
        } catch (e) {
          alert('Error: ' + (e.message || e));
        }
      };
    }
  } catch (err) {
  }
}

