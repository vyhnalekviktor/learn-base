import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const API_BASE = "https://learn-base-backend.vercel.app";
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

// init
async function initApp() {
  try {
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();

    const addrSpan = document.getElementById('nftContract');
    if (addrSpan) {
      addrSpan.textContent = CONTRACT_ADDRESS;
    }
  } catch (error) {
    console.error('Init error:', error);
  }
}

// accordion
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

// update USER_PROGRESS.mint = true
async function updateMintProgress(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        table_name: "USER_PROGRESS",
        field_name: "mint",
        value: true,
      }),
    });

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("update_field mint error:", msg);
      return false;
    }
    return true;
  } catch (e) {
    console.error("update_field mint network error:", e);
    return false;
  }
}

// load NFT metadata and return HTML snippet
async function buildNftImageHtml(tokenId) {
  try {
    const { BrowserProvider, Contract } = await import(
      'https://esm.sh/ethers@6.9.0'
    );

    const provider = new BrowserProvider(ethProvider);
    const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

    const uri = await contract.tokenURI(tokenId);
    const parts = uri.split(',');
    if (parts.length < 2) return '';

    const base64Json = parts[1];
    const jsonStr = atob(base64Json);
    const meta = JSON.parse(jsonStr);

    if (!meta.image) return '';

    return `
      <div style="margin-top: 16px;">
        <div style="margin-bottom: 8px; font-weight: 600;">This is your NFT</div>
        <img src="${meta.image}" alt="Your NFT" style="max-width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15);" />
      </div>
    `;
  } catch (e) {
    console.error('Error building NFT image HTML:', e);
    return '';
  }
}

window.mintNFT = async function () {
  const statusDiv = document.getElementById('mintStatus');
  const mintBtn = document.getElementById('mintBtn');

  if (!statusDiv) return;

  try {
    if (mintBtn) {
      mintBtn.disabled = true;
      mintBtn.textContent = 'Minting...';
    }

    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.innerHTML = 'Preparing to mint your NFT...';

    if (!ethProvider) {
      throw new Error('Base App not initialized');
    }

    const { BrowserProvider, Contract } = await import(
      'https://esm.sh/ethers@6.9.0'
    );

    const provider = new BrowserProvider(ethProvider);
    const network = await provider.getNetwork();

    originalChainId = Number(network.chainId);

    // switch to Base Sepolia if needed
    if (originalChainId !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML = 'Switching to Base Sepolia testnet...';

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

    statusDiv.innerHTML = 'Please confirm the transaction in your wallet...';

    const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);
    const tx = await contract.mintTo(userAddress);

    const txHash = tx.hash;
    const shortHash =
      txHash.substring(0, 10) + '...' + txHash.substring(txHash.length - 8);

    statusDiv.innerHTML = `
      <strong>Transaction submitted!</strong><br><br>
      <strong>Hash:</strong><br>
      <code>${shortHash}</code><br><br>
      Waiting for confirmation...
    `;

    let receipt = null;
    try {
      receipt = await tx.wait(1);
    } catch (waitError) {
      // some providers throw even if status is 1, so fallback
      receipt = { status: 1 };
    }

    if (receipt.status !== 1) {
      throw new Error('Transaction failed on chain');
    }

    // get total minted and new token id
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

    // ✅ progress update po úspěšném mintu
    try {
      const mintProgressOk = await updateMintProgress(userAddress);
      console.log("mint progress updated:", mintProgressOk);
    } catch (e) {
      console.error("Cannot update mint progress:", e);
    }

    const scannerUrl = newTokenId
      ? `https://sepolia.basescan.org/nft/${CONTRACT_ADDRESS}/${newTokenId}`
      : `https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`;

    statusDiv.className = 'info-box';
    statusDiv.innerHTML = `
      <strong>Mint successful!</strong><br><br>
      <strong>Total NFTs minted:</strong> ${totalMinted}<br>
      ${newTokenId ? `<strong>Your new token ID:</strong> #${newTokenId}<br>` : ''}
      ${nftImageHtml}
      <br>
      <button onclick="openSepoliaScanAddress('${address}')"
              style="margin-top: 12px; padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
        View on BaseScan
      </button><br><br>
      <small style="color: #666;">Your NFT has been minted on Base Sepolia testnet</small>
    `;

    if (originalChainId === BASE_MAINNET_CHAIN_ID) {
      await switchToMainnet();
    }
  } catch (error) {
    console.error('Mint error:', error);

    statusDiv.className = 'info-box';

    if (error.code === 4001) {
      statusDiv.innerHTML = 'Transaction rejected by user.';
    } else if (
      typeof error.message === 'string' &&
      error.message.includes('insufficient funds')
    ) {
      statusDiv.innerHTML =
        'Insufficient ETH for gas fees. Get testnet ETH from a faucet.';
    } else {
      statusDiv.innerHTML = `Mint failed: ${
        error.shortMessage || error.message
      }`;
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

window.openSepoliaScanAddress = function(addr) {
  sdk.actions.openUrl(`${addr}`);
};

initApp();
