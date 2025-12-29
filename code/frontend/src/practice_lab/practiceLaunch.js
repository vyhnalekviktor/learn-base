import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
// Načteme vše potřebné hned nahoře
const { BrowserProvider, Contract, JsonRpcProvider } = await import('https://esm.sh/ethers@6.9.0');

const BASE_SEPOLIA_CHAIN_ID = 84532;
const FACTORY_ADDRESS = "0x0ea04CA4244f91b4e09b4D3E5922dBba48226F57";
const FACTORY_ABI = [
  "event TokenCreated(address indexed token, string name, string symbol, uint256 initialSupply, address indexed owner)",
  "function createToken(string name_, string symbol_, uint256 initialSupply_) external returns (address)"
];

const API_BASE = "https://learn-base-backend.vercel.app";

// Globální proměnná
let ethProvider = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();
    const contractEl = document.getElementById("tokenContract");
    if (contractEl) contractEl.textContent = "Not deployed yet";
  } catch (error) { console.error("Init error:", error); }
});

window.toggleAccordion = function (id) {
  const content = document.getElementById("content-" + id);
  const icon = document.getElementById("icon-" + id);
  if (!content) return;
  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    if (icon) icon.textContent = "▼";
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    if (icon) icon.textContent = "▲";
  }
}

async function updatePracticeLaunchProgress(wallet) {
  if (window.BaseCampTheme) {
      window.BaseCampTheme.updateLocalProgress('launch', true);
  }
  const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        table_name: "USER_PROGRESS",
        field_name: "launch",
        value: true,
      }),
  });
  return res.ok;
}

window.launchToken = async function (tokenName) {
  const statusDiv = document.getElementById("launchStatus");
  const launchBtn = document.getElementById("launchTokenBtn");
  if (!statusDiv) return;

  if (!tokenName || tokenName.trim().length < 3) {
    statusDiv.style.display = "block";
    statusDiv.className = "error-box";
    statusDiv.innerHTML = "<p>Name too short (min 3 chars).</p>";
    return;
  }

  const cleanName = tokenName.trim();
  const symbol = cleanName.substring(0, 3).toUpperCase();

  try {
    if (launchBtn) { launchBtn.disabled = true; launchBtn.textContent = "Launching..."; }
    statusDiv.style.display = "block";
    statusDiv.className = "info-box";
    statusDiv.innerHTML = `Launching ${tokenName}...`;

    // 1. ZÁCHRANA: Načtení providera
    if (!ethProvider) {
        console.log("Provider was null, fetching again...");
        ethProvider = await sdk.wallet.ethProvider;
    }
    if (!ethProvider) throw new Error("Wallet not connected. Please reload.");

    // 2. KONTROLA SÍTĚ (Zkopírováno z Mintu, aby to nepadalo na Mainnetu)
    let tempProvider = new BrowserProvider(ethProvider);
    let network = await tempProvider.getNetwork();

    if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML = 'Switching to Base Sepolia...';
      try {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14a34' }]
        });
      } catch (e) { console.error("Switch error:", e); }

      // Polling
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 1000));
        tempProvider = new BrowserProvider(ethProvider);
        network = await tempProvider.getNetwork();
        if (Number(network.chainId) === BASE_SEPOLIA_CHAIN_ID) break;
        attempts++;
      }

      if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) {
          throw new Error("Failed to switch network.");
      }
    }

    // 3. PŘÍPRAVA SIGNERA
    const walletProvider = new BrowserProvider(ethProvider);
    const signer = await walletProvider.getSigner();
    const wallet = await signer.getAddress();

    statusDiv.innerHTML += "<p>Confirm in wallet...</p>";
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

    // 4. ODESLÁNÍ (WRITE) - S VYSOKÝM GAS LIMITEM
    // Deploy tokenu je drahý, dáváme 3M gas limit pro jistotu
    let tx;
    try {
        tx = await factory.createToken(cleanName, symbol, 1000000, { gasLimit: 3000000 });
    } catch (err) {
        console.warn("Manual limit failed, trying default...", err);
        tx = await factory.createToken(cleanName, symbol, 1000000);
    }

    statusDiv.innerHTML = "Transaction submitted. Waiting for confirmation...";

    // 5. ČEKÁNÍ (READ) - HYBRIDNÍ PROVIDER (Fix chyby 4200)
    const publicProvider = new JsonRpcProvider('https://sepolia.base.org');

    // Čekáme na účtenku z veřejného uzlu
    const receipt = await publicProvider.waitForTransaction(tx.hash);

    if (!receipt || receipt.status === 0) {
        throw new Error("Transaction reverted on chain.");
    }

    // 6. PARSOVÁNÍ LOGŮ (Získání adresy nového tokenu)
    let tokenAddress = null;

    // K parsování logů nepotřebujeme signera, stačí Interface z kontraktu
    if (receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed && parsed.name === "TokenCreated") {
            tokenAddress = parsed.args.token;
            break;
          }
        } catch {}
      }
    }

    // Fallback dekódování
    if (!tokenAddress && receipt.logs?.length > 0) {
      try {
        const lastLog = receipt.logs[receipt.logs.length - 1];
        const decoded = factory.interface.decodeEventLog("TokenCreated", lastLog.data, lastLog.topics);
        if (decoded?.token) {
          tokenAddress = decoded.token;
        }
      } catch {}
    }

    if (!tokenAddress) {
      throw new Error("Token deployed, but address not found in logs.");
    }

    const contractEl = document.getElementById("tokenContract");
    if (contractEl) contractEl.textContent = tokenAddress;

    await updatePracticeLaunchProgress(wallet);

    statusDiv.className = "success-box";
    statusDiv.innerHTML = `
      <p><strong>Token Launched!</strong></p>
      <p><strong>${cleanName}</strong> (${symbol})</p>
      <p>Supply: 1,000,000</p>
      <p>Contract: <code>${tokenAddress.slice(0,6)}...${tokenAddress.slice(-4)}</code></p>
      <button onclick="openSepoliaScanAddress('https://sepolia.basescan.org/address/${tokenAddress}')" style="margin-top:10px; padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer;">View on BaseScan</button>
    `;

  } catch (error) {
    console.error("Launch error:", error);
    statusDiv.className = "error-box";
    statusDiv.innerHTML = `Launch failed: ${error.message}`;
  } finally {
    if (launchBtn) { launchBtn.disabled = false; launchBtn.textContent = "🚀 Launch Token"; }
  }
}

window.openSepoliaScanAddress = (addr) => sdk.actions.openUrl(addr);