// practiceLaunch.js
import sdk from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_MAINNET_CHAIN_ID = 8453;

const FACTORY_ADDRESS = "0x0ea04CA4244f91b4e09b4D3E5922dBba48226F57";

const FACTORY_ABI = [
  "event TokenCreated(address indexed token, string name, string symbol, uint256 initialSupply, address indexed owner)",
  "function createToken(string name_, string symbol_, uint256 initialSupply_) external returns (address)"
];

let ethProvider = null;
let originalChainId = null;

async function initApp() {
  try {
    ethProvider = await sdk.wallet.ethProvider;
    await sdk.actions.ready();
    const contractEl = document.getElementById("tokenContract");
    if (contractEl) contractEl.textContent = "Not deployed yet";
  } catch (error) {
    console.error("Init error:", error);
  }
}

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
};

// update USER_PROGRESS.launch = true
async function updateLaunchProgress(wallet) {
  try {
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

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("update_field launch error:", msg);
      return false;
    }
    return true;
  } catch (e) {
    console.error("update_field launch network error:", e);
    return false;
  }
}

window.launchToken = async function (tokenName) {
  const statusDiv = document.getElementById("launchStatus");
  const launchBtn = document.getElementById("launchTokenBtn");
  if (!statusDiv) return;

  // basic validation
  if (!tokenName || tokenName.trim().length < 3) {
    statusDiv.style.display = "block";
    statusDiv.className = "error-box";
    statusDiv.innerHTML = "\n\nToken name must be at least 3 characters long.";
    return;
  }

  const cleanName = tokenName.trim();
  const symbol = cleanName.substring(0, 3).toUpperCase();

  try {
    if (!ethProvider) {
      throw new Error("Base App not initialized");
    }

    if (launchBtn) {
      launchBtn.disabled = true;
      launchBtn.textContent = "Launching...";
    }

    statusDiv.style.display = "block";
    statusDiv.className = "info-box";
    statusDiv.innerHTML = `
Launching token:<br><br>
<strong>${cleanName}</strong> (${symbol})<br>
Supply: 1,000,000 tokens`;

    const { BrowserProvider, Contract } = await import(
      "https://esm.sh/ethers@6.9.0"
    );

    const provider = new BrowserProvider(ethProvider);
    const network = await provider.getNetwork();
    originalChainId = Number(network.chainId);

    // ensure Base Sepolia
    if (originalChainId !== BASE_SEPOLIA_CHAIN_ID) {
      statusDiv.innerHTML += "<br><br>Switching to Base Sepolia testnet...";
      try {
        await ethProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x14a34" }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await ethProvider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x14a34",
                chainName: "Base Sepolia",
                nativeCurrency: {
                  name: "Ethereum",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia.basescan.org"],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    const signer = await provider.getSigner();

    // create factory instance
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

    // supply in whole tokens -> factory násobí 1e18 v Solidity
    const supply = 1_000_000;

    statusDiv.innerHTML += "<br><br>Please confirm the deployment in your wallet...";

    const tx = await factory.createToken(cleanName, symbol, supply);
    const txHash = tx.hash;
    const shortHash = `${txHash.substring(0, 10)}...${txHash.substring(
      txHash.length - 8
    )}`;

    statusDiv.innerHTML = `
<strong>Transaction submitted!</strong><br><br>
<strong>Hash:</strong><br>
<code>${shortHash}</code><br><br>
Waiting for confirmation...`;

    const receipt = await tx.wait(1);

    // parse TokenCreated event
    let tokenAddress = null;
    try {
      for (const log of receipt.logs || []) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed && parsed.name === "TokenCreated") {
            tokenAddress = parsed.args.token;
            break;
          }
        } catch {
          // ignore non‑matching logs
        }
      }
    } catch (e) {
      console.error("Failed to parse TokenCreated event:", e);
    }

    if (!tokenAddress) {
      statusDiv.className = "error-box";
      statusDiv.innerHTML = `
Transaction confirmed, but could not read TokenCreated event.<br><br>
Check the transaction on BaseScan:
<a href="https://sepolia.basescan.org/tx/${txHash}" target="_blank">View transaction</a>`;
      return;
    }

    const contractEl = document.getElementById("tokenContract");
    if (contractEl) contractEl.textContent = tokenAddress;

    const scannerUrl = `https://sepolia.basescan.org/address/${tokenAddress}`;

    // progress update po úspěšném launchi
    try {
      const userAddress = await signer.getAddress();
      const launchProgressOk = await updateLaunchProgress(userAddress);
      console.log("launch progress updated:", launchProgressOk);
    } catch (e) {
      console.error("Cannot update launch progress:", e);
    }

    // ✅ success UI co nejpodobnější send screen
    statusDiv.className = "info-box";
    statusDiv.innerHTML = `
<strong>Token Launched!</strong><br><br>
<strong>Name:</strong> ${cleanName} (${symbol})<br>
<strong>Supply:</strong> 1,000,000 tokens<br>
<strong>Contract:</strong> ${tokenAddress.substring(0, 6)}...${tokenAddress.substring(38)}<br><br>
<button onclick="window.open('${scannerUrl}', '_blank')"
        style="padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
  View on BaseScan
</button><br><br>
<small style="color: #666;">Token successfully deployed on Base Sepolia testnet</small>
`;

  } catch (error) {
    console.error("Launch error:", error);

    statusDiv.className = "error-box";

    if (error.code === 4001) {
      statusDiv.innerHTML = "\n\nTransaction rejected by user.";
    } else if (
      typeof error.message === "string" &&
      error.message.toLowerCase().includes("insufficient")
    ) {
      statusDiv.innerHTML =
        "\n\nInsufficient ETH for gas fees. Get testnet ETH from a faucet.";
    } else {
      statusDiv.innerHTML = `\n\nLaunch failed: ${error.message || error}`;
    }
  } finally {
    if (launchBtn) {
      launchBtn.disabled = false;
      launchBtn.textContent = "🚀 Launch Token";
    }
  }
};

initApp();
