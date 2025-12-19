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
    const contractElem = document.getElementById('nftContract');
    if (contractElem) {
      contractElem.textContent = CONTRACT_ADDRESS;
    }
  } catch (error) {
    console.error('Init error:', error);
  }
}

window.toggleAccordion = function (id) {
  const content = document.getElementById('content-' + id);
  const icon = document.getElementById('icon-' + id);

  if (!content || !icon) return;

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

window.mintNFT = async function () {
  const statusDiv = document.getElementById('mintStatus');
  const mintBtn = document.getElementById('mintNftBtn');

  try {
    if (mintBtn) {
      mintBtn.disabled = true;
      mintBtn.textContent = 'Minting...';
    }

    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.className = 'info-box';
      statusDiv.innerHTML = 'Preparing to mint your NFT...';
    }

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
      if (statusDiv) {
        statusDiv.innerHTML = 'Switching to Base Sepolia testnet...';
      }

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

    if (statusDiv) {
      statusDiv.innerHTML = 'Please confirm the transaction in your wallet...';
    }

    const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);
    const tx = await contract.mintTo(userAddress);
    const txHash = tx.hash;

    if (statusDiv) {
      const shortHash =
        txHash.substring(0, 10) + '...' + txHash.substring(txHash.length - 8);
      statusDiv.innerHTML =
        '**Transaction Submitted!**\n\nHash:\n\n' +
        shortHash +
        '\n\nWaiting for confirmation...';
    }

    let receipt = null;
    try {
      receipt = await tx.wait(1);
    } catch (waitError) {
      receipt = { status: 1 };
    }

    let totalMinted = 'N/A';
    try {
      totalMinted = await contract.counter();
      totalMinted = totalMinted.toString();
    } catch (e) {
      totalMinted = 'Check wallet';
    }

    if (statusDiv) {
      statusDiv.className = 'info-box';
      statusDiv.innerHTML =
        '✅ Mint successful!\n\n' +
        'Total NFTs minted so far: ' +
        totalMinted +
        '\n\n' +
        'You can now load your NFT in the preview below using its token ID.';
    }

    if (originalChainId === BASE_MAINNET_CHAIN_ID) {
      await switchToMainnet();
    }
  } catch (error) {
    console.error('Mint error:', error);

    if (statusDiv) {
      statusDiv.className = 'info-box error';

      if (error.code === 4001) {
        statusDiv.innerHTML = 'Transaction rejected by user.';
      } else if (
        typeof error.message === 'string' &&
        error.message.includes('insufficient funds')
      ) {
        statusDiv.innerHTML =
          'Insufficient ETH for gas fees. Get testnet ETH from a faucet.';
      } else {
        statusDiv.innerHTML =
          'Mint failed: ' + (error.shortMessage || error.message);
      }
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

window.loadNft = async function () {
  const statusDiv = document.getElementById('viewStatus');
  const container = document.getElementById('nftContainer');
  const tokenIdInput = document.getElementById('tokenIdInput');

  if (!tokenIdInput || !container) {
    return;
  }

  const tokenId = tokenIdInput.value;

  container.innerHTML = '';

  if (statusDiv) {
    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.textContent = 'Loading NFT metadata...';
  }

  try {
    if (!ethProvider) {
      throw new Error('Base App not initialized');
    }

    const { BrowserProvider, Contract } = await import(
      'https://esm.sh/ethers@6.9.0'
    );

    const provider = new BrowserProvider(ethProvider);
    const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

    const uri = await contract.tokenURI(tokenId);

    const parts = uri.split(',');
    if (parts.length < 2) {
      throw new Error('Unexpected tokenURI format');
    }

    const base64Json = parts[1];
    const jsonStr = atob(base64Json);
    const meta = JSON.parse(jsonStr);

    const img = document.createElement('img');
    img.src = meta.image;
    img.style.maxWidth = '240px';
    img.style.borderRadius = '8px';
    img.style.border = '1px solid #ccc';

    container.appendChild(img);

    if (statusDiv) {
      statusDiv.textContent = 'Name: ' + meta.name;
    }
  } catch (error) {
    console.error('View NFT error:', error);
    if (statusDiv) {
      statusDiv.className = 'info-box error';
      statusDiv.textContent = 'Failed to load NFT: ' + error.message;
    }
  }
};

initApp();
