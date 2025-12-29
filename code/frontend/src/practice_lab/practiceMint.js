import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
const { BrowserProvider, Contract, JsonRpcProvider } = await import('https://esm.sh/ethers@6.9.0');

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

// === 1. INIT ===
async function initApp() {
  try {
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();
    const addrSpan = document.getElementById('nftContract');
    if (addrSpan) addrSpan.textContent = CONTRACT_ADDRESS.slice(0, 6) + '...' + CONTRACT_ADDRESS.slice(-4);
  } catch (error) { console.error('Init error:', error); }
}

document.addEventListener("DOMContentLoaded", initApp);

window.toggleAccordion = function (id) {
  const content = document.getElementById('content-' + id);
  const icon = document.getElementById('icon-' + id);
  if (!content) return;
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
    await ethProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
  } catch (error) {}
}

async function updateMintProgress(wallet) {
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('mint', true);
  }
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, table_name: "USER_PROGRESS", field_name: "mint", value: true, }),
  });
  return res.ok;
}

// === 2. LOGIKA ===
async function buildNftImageHtml(tokenId) {
  try {
    const publicProvider = new JsonRpcProvider('https://sepolia.base.org');
    const contract = new Contract(CONTRACT_ADDRESS, ABI, publicProvider);
    const uri = await contract.tokenURI(tokenId);
    const parts = uri.split(',');
    if (parts.length < 2) return '';
    const base64Json = parts[1];
    const jsonStr = atob(base64Json);
    const meta = JSON.parse(jsonStr);
    if (!meta.image) return '';
    return `<div style="margin-top: 16px;"><div style="margin-bottom: 8px; font-weight: 600;">This is your NFT</div><img src="${meta.image}" alt="Your NFT" style="max-width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15);" /></div>`;
  } catch (e) { return ''; }
}

window.mintNFT = async function () {
  const statusDiv = document.getElementById('mintStatus');
  const mintBtn = document.getElementById('mintNftBtn');
  if (!statusDiv) return;

  try {
    if (mintBtn) { mintBtn.disabled = true; mintBtn.textContent = 'Minting...'; }

    // Zobrazíme loading ve statusDiv (pouze průběh)
    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.innerHTML = 'Preparing to mint...';

    if (!ethProvider) ethProvider = await sdk.wallet.ethProvider;
    if (!ethProvider) throw new Error("Wallet not connected. Please reload.");

    let tempProvider = new BrowserProvider(ethProvider);
    let network = await tempProvider.getNetwork();
    let originalChainId = Number(network.chainId);

    if (originalChainId !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML = 'Switching to Base Sepolia...';
      try { await ethProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x14a34' }] }); } catch (e) {}
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 1000));
        tempProvider = new BrowserProvider(ethProvider);
        network = await tempProvider.getNetwork();
        if (Number(network.chainId) === BASE_SEPOLIA_CHAIN_ID) break;
        attempts++;
      }
      if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) throw new Error("Failed to switch network.");
    }

    const walletProvider = new BrowserProvider(ethProvider);
    const signer = await walletProvider.getSigner();
    const userAddress = await signer.getAddress();

    statusDiv.innerHTML = 'Confirm in wallet...';
    const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);

    let tx;
    try { tx = await contract.mintTo(userAddress, { gasLimit: 300000 }); }
    catch (err) { tx = await contract.mintTo(userAddress); }

    statusDiv.innerHTML = 'Transaction submitted. Waiting for confirmation...';

    const publicProvider = new JsonRpcProvider('https://sepolia.base.org');
    const receipt = await publicProvider.waitForTransaction(tx.hash);

    if (!receipt || receipt.status === 0) throw new Error("Transaction reverted on chain.");

    let totalMinted = 'N/A';
    let newTokenId = null;
    try {
      const readContract = new Contract(CONTRACT_ADDRESS, ABI, publicProvider);
      const counter = await readContract.counter();
      totalMinted = counter.toString();
      newTokenId = totalMinted;
    } catch (e) {}

    let nftImageHtml = '';
    if (newTokenId) nftImageHtml = await buildNftImageHtml(newTokenId);

    updateMintProgress(userAddress);

    statusDiv.style.display = 'none';

    showModal('success', `
      <strong>Mint successful!</strong><br>
      <strong>Total NFTs:</strong> ${totalMinted}<br>
      ${nftImageHtml}
      <br>
      <button onclick="openSepoliaScanAddress('https://sepolia.basescan.org/tx/${tx.hash}')"
              style="width:100%; margin-top: 12px; padding: 12px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
        View on BaseScan
      </button>
    `);

    if (originalChainId === BASE_MAINNET_CHAIN_ID) await switchToMainnet();

  } catch (error) {
    statusDiv.style.display = 'none';
    const msg = (error && error.message) ? error.message : "Unknown error";
    showModal('danger', `Mint failed:<br>${msg.length > 100 ? "Transaction failed" : msg}`);
  } finally {
    if (mintBtn) { mintBtn.disabled = false; mintBtn.textContent = 'Mint NFT'; }
  }
};

function showModal(type, msg) {
    const old = document.querySelector('.custom-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';

    let title = 'NOTICE';
    let modalClass = 'modal-warning';
    if (type === 'success') { title = 'MINT SUCCESSFUL!'; modalClass = 'modal-success'; }
    else if (type === 'danger') { title = 'MINT FAILED'; modalClass = 'modal-danger'; }

    overlay.innerHTML = `
        <div class="custom-modal-content ${modalClass}">
            <div class="modal-header"><h3 class="modal-title">${title}</h3></div>
            <div class="modal-body">${msg}</div>
            <div class="modal-footer"><button class="modal-btn" onclick="this.closest('.custom-modal-overlay').remove()">Got it</button></div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

window.openSepoliaScanAddress = (addr) => sdk.actions.openUrl(addr);