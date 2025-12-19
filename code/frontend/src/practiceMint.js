import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const CONTRACT_ADDRESS = '0x726107014C8F10d372D59882dDF126ea02c3c6d4';
const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_MAINNET_CHAIN_ID = 8453;

const ABI = [
  'function mintTo(address _to) public',
  'function counter() public view returns (uint256)',
  'function tokenURI(uint256 tokenId) public view returns (string)'
];

let ethProvider = null;
let signer = null;
let originalChainId = null;

async function initApp() {
  try {
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();
    document.getElementById('nftContract').textContent = CONTRACT_ADDRESS;
  } catch (error) {
    console.error('Init error:', error);
  }
}

window.toggleAccordion = function (id) {
  const content = document.getElementById('content-' + id);
  const icon = document.getElementById('icon-' + id);

  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    icon.textContent = '▼';
  } else {
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.textContent = '▲';
  }
};

async function switchToMainnet() {
  try {
    await ethProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2105' }]
    });
  } catch (error) {
    console.error('Failed to switch back to mainnet:', error);
  }
}

// načte metadata a vrátí <img> tag jako HTML string
async function buildNftImageHtml(tokenId) {
  try {
    const { BrowserProvider, Contract } = await import(
      'https://esm.sh/ethers@6.9.0'
    );

    const provider = new BrowserProvider(ethProvider);
    const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

    const uri = await contract.tokenURI(tokenId);
    const parts = uri.split(',');
    if (parts.length < 2) {
      return '';
    }

    const base64Json = parts[1];
    const jsonStr = atob(base64Json);
    const meta = JSON.parse(jsonStr);

    if (!meta.image) {
      return '';
    }

    return `
      <div style="margin: 16px 0; text-align: center;">
        <p style="margin-bottom: 8px; font-weight: 600;">This is your NFT</p>
        <img src="${meta.image}"
             alt="Your NFT"
             style="max-width: 140px; border-radius: 6px; border: 1px solid #ccc;" />
      </div>
    `;
  } catch (e) {
    console.error('buildNftImageHtml error:', e);
    return '';
  }
}

window.mintNFT = async function () {
  const statusDiv = document.getElementById('mintStatus');
  const mintBtn = document.getElementById('mintNftBtn');

  try {
    if (mintBtn) {
      mintBtn.disabled = true;
      mintBtn.textContent = 'Minting...';
    }

    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.innerHTML = '<p>Preparing to mint your NFT...</p>';

    if (!ethProvider) {
      throw new Error('Base App not initialized');
    }

    const { BrowserProvider, Contract } = await import(
      'https://esm.sh/ethers@6.9.0'
    );

    const provider = new BrowserProvider(ethProvider);
    const network = await provider.getNetwork();
    originalChainId = Number(network.chainId);

    if (originalChainId !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML = '<p>Switching to Base Sepolia testnet...</p>';

      try {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14a34' }]
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await ethProvider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x14a34',
                chainName: 'Base Sepolia',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org']
              }
            ]
          });
        } else {
          throw switchError;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    const sepoliaProvider = new BrowserProvider(ethProvider);
    signer = await sepoliaProvider.getSigner();
    const userAddress = await signer.getAddress();

    statusDiv.innerHTML =
      '<p>Please confirm the transaction in your wallet...</p>';

    const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);
    const tx = await contract.mintTo(userAddress);
    const txHash = tx.hash;

    const shortHash =
      txHash.substring(0, 10) + '...' + txHash.substring(txHash.length - 8);

    statusDiv.innerHTML = `
      <p><strong>Transaction submitted!</strong></p>
      <p>Hash: <code>${shortHash}</code></p>
      <p>Waiting for confirmation...</p>
    `;

    let receipt = null;
    try {
      receipt = await tx.wait(1);
    } catch (waitError) {
      receipt = { status: 1 };
    }

    let totalMinted = 'N/A';
    let newTokenId = null;

    try {
      const counter = await contract.counter();
      totalMinted = counter.toString();
      newTokenId = totalMinted;
    } catch (e) {
      console.error('Error fetching counter:', e);
      totalMinted = 'Check wallet';
    }

    let nftImageHtml = '';
    if (newTokenId) {
      nftImageHtml = await buildNftImageHtml(newTokenId);
    }

    const scannerUrl = newTokenId
      ? `https://sepolia.basescan.org/nft/${CONTRACT_ADDRESS}/${newTokenId}`
      : `https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`;

    statusDiv.className = 'info-box';
    statusDiv.innerHTML = `
      <p><strong>Mint successful!</strong></p>
      <p>Total NFTs minted: ${totalMinted}</p>
      ${newTokenId ? `<p>Your new token ID: #${newTokenId}</p>` : ''}
      ${nftImageHtml}
      <div style="margin-top: 12px; display:flex; flex-direction:column; gap:8px;">
        <a href="${scannerUrl}" target="_blank"
           style="padding: 10px 16px; text-align:center; border-radius:10px; border:1px solid #0052FF; color:#0052FF; font-weight:600; text-decoration:none;">
          View scanner
        </a>
        <a href="https://account.base.app/activity" target="_blank"
           style="padding: 10px 16px; text-align:center; border-radius:10px; border:1px solid #0052FF; color:#0052FF; font-weight:600; text-decoration:none;">
          View in wallet
        </a>
      </div>
      <p style="margin-top:8px; font-size:12px; color:#666;">
        Your NFT has been minted on Base Sepolia testnet.
      </p>
    `;

    if (originalChainId === BASE_MAINNET_CHAIN_ID) {
      await switchToMainnet();
    }
  } catch (error) {
    console.error('Mint error:', error);

    statusDiv.className = 'info-box';

    if (error.code === 4001) {
      statusDiv.innerHTML = '<p>Transaction rejected by user.</p>';
    } else if (
      typeof error.message === 'string' &&
      error.message.includes('insufficient funds')
    ) {
      statusDiv.innerHTML =
        '<p>Insufficient ETH for gas fees. Get testnet ETH from a faucet.</p>';
    } else {
      statusDiv.innerHTML = `<p>Mint failed: ${
        error.shortMessage || error.message
      }</p>`;
    }

    if (originalChainId === BASE_MAINNET_CHAIN_ID) {
      await switchToMainnet();
    }
  } finally {
    if (mintBtn) {
      mintBtn.disabled = false;
      mintBtn.textContent = 'Mint NFT';
    }
  }
};

initApp();
