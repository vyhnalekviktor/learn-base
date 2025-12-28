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

async function initApp() {
  try {
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();
    const addrSpan = document.getElementById('nftContract');
    if (addrSpan) addrSpan.textContent = CONTRACT_ADDRESS.slice(0, 6) + '...' + CONTRACT_ADDRESS.slice(-4);
  } catch (error) { console.error('Init error:', error); }
}

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
    await ethProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2105' }]
    });
  } catch (error) {}
}

async function updateMintProgress(wallet) {
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('mint', true);
  }
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
  return res.ok;
}

// ✅ ZDE BYLA CHYBĚJÍCÍ FUNKCIONALITA
async function buildNftImageHtml(tokenId) {
  try {
    const { BrowserProvider, Contract } = await import('https://esm.sh/ethers@6.9.0');
    const provider = new BrowserProvider(ethProvider);
    const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

    // Načtení on-chain metadat
    const uri = await contract.tokenURI(tokenId);
    const parts = uri.split(',');
    if (parts.length < 2) return '';

    // Dekódování Base64 JSONu
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
  const mintBtn = document.getElementById('mintNftBtn');
  if (!statusDiv) return;

  try {
    if (mintBtn) { mintBtn.disabled = true; mintBtn.textContent = 'Minting...'; }
    statusDiv.style.display = 'block';
    statusDiv.className = 'info-box';
    statusDiv.innerHTML = 'Preparing to mint...';

    const { BrowserProvider, Contract } = await import('https://esm.sh/ethers@6.9.0');

    // 1. Zjistíme aktuální síť a Provider
    let tempProvider = new BrowserProvider(ethProvider);
    let network = await tempProvider.getNetwork();
    originalChainId = Number(network.chainId);

    // 2. Network Switch Logic (pokud není Sepolia)
    if (originalChainId !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML = 'Switching to Base Sepolia...';
      try {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14a34' }] // 84532
        });
      } catch (e) {
         console.error("Switch error:", e);
      }

      // Polling na změnu sítě
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 1000));
        tempProvider = new BrowserProvider(ethProvider);
        network = await tempProvider.getNetwork();
        if (Number(network.chainId) === BASE_SEPOLIA_CHAIN_ID) break;
        attempts++;
      }

      if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) {
          throw new Error("Failed to switch network. Please switch manually.");
      }
    }

    // 3. Setup signer a adresy
    const sepoliaProvider = new BrowserProvider(ethProvider);
    signer = await sepoliaProvider.getSigner();
    const userAddress = await signer.getAddress();

    // Debug log - uvidíš v konzoli, jestli je adresa správně
    console.log("Minting for address:", userAddress);

    statusDiv.innerHTML = 'Confirm in wallet...';
    const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);

    // =================================================================
    // 5. ODESLÁNÍ TRANSAKCE (RAW METODA) - ZDE JE OPRAVA
    // =================================================================
    // Místo contract.mintTo() použijeme přímé volání, abychom obešli
    // specifické validace ethers.js, které se hádají se Smart Wallet.

    // A) Enkódujeme data (funkci a parametry)
    const data = contract.interface.encodeFunctionData("mintTo", [userAddress]);

    // B) Sestavíme request ručně
    const txParams = {
        to: CONTRACT_ADDRESS,
        from: userAddress,
        data: data,
        chainId: '0x14a34' // Natvrdo Sepolia ID v hexu
        // Nedáváme gasLimit, necháme walletku a paymastera, ať si to vyřeší
    };

    // C) Pošleme přímo přes providera
    const txHash = await ethProvider.request({
        method: 'eth_sendTransaction',
        params: [txParams]
    });

    console.log("Tx Hash:", txHash);
    statusDiv.innerHTML = 'Transaction submitted. Waiting...';

    // D) Čekání na potvrzení (Ethers v6 styl)
    // Protože máme jen hash, musíme počkat na receipt
    const receipt = await sepoliaProvider.waitForTransaction(txHash);
    // =================================================================

    // --- Zbytek kódu pro zobrazení NFT ---
    let totalMinted = 'N/A';
    let newTokenId = null;
    try {
      const counter = await contract.counter();
      totalMinted = counter.toString();
      newTokenId = totalMinted; // Pro jednoduchost bereme poslední (counter)
    } catch (e) {}

    let nftImageHtml = '';
    if (newTokenId) {
        nftImageHtml = await buildNftImageHtml(newTokenId);
    }

    updateMintProgress(userAddress);

    statusDiv.className = 'info-box';
    statusDiv.innerHTML = `
      <strong>Mint successful!</strong><br>
      <strong>Total NFTs:</strong> ${totalMinted}<br>
      ${nftImageHtml}
      <br>
      <button onclick="openSepoliaScanAddress('https://sepolia.basescan.org/tx/${txHash}')"
              style="margin-top: 12px; padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer;">
        View on BaseScan
      </button>
    `;

    // if (originalChainId === BASE_MAINNET_CHAIN_ID) await switchToMainnet();

  } catch (error) {
    console.error("Mint error:", error);
    statusDiv.className = 'error-box';

    if (error.message && (error.message.includes("rejected") || error.code === 4001)) {
        statusDiv.innerHTML = `Transaction rejected by user.`;
    } else {
        const msg = error.message.length > 100 ? "Transaction failed (check console)" : error.message;
        statusDiv.innerHTML = `Mint failed: ${msg}`;
    }
  } finally {
    if (mintBtn) { mintBtn.disabled = false; mintBtn.textContent = 'Mint NFT'; }
  }
};

window.openSepoliaScanAddress = (addr) => sdk.actions.openUrl(addr);
document.addEventListener("DOMContentLoaded", initApp);