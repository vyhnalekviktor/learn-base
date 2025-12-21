import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";
// VLOŽ TVŮJ THIRDWEB CLIENT ID SEM (VEŘEJNÝ, bezpečný)
const THIRDWEB_CLIENT_ID = "c12132b8cbef77793a3ed49c591110e6";

window.addEventListener("load", async () => {
  try {
    console.log("Page loaded, calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("BaseCamp mini app is ready!");

    const ethProvider = await sdk.wallet.ethProvider;
    const accounts = await ethProvider.request({
      method: "eth_requestAccounts",
    });

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;
    if (!wallet) {
      console.warn("Wallet address not found from ethProvider.request()");
      return;
    }

    console.log("Connected wallet from SDK:", wallet);
    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;

    await getProgress(wallet);
    await checkCompletedAll(wallet, ethProvider, wallet);

  } catch (error) {
    console.error("Error during MiniApp wallet init:", error);
  }
});

async function getProgress(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/get-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("get-user error:", msg);
      return;
    }

    const data = await res.json();
    const info = data.info;
    const progress = data.progress;

    if (!progress || !info) {
      console.error("Missing info or progress object in response");
      return;
    }

    // THEORY
    const theoryBar = document.getElementById("theoryProgressBar");
    const theoryText = document.getElementById("theoryProgressText");
    const theoryPercent = info.completed_theory ? 100 : 0;
    if (theoryBar) theoryBar.style.width = `${theoryPercent}%`;
    if (theoryText) theoryText.textContent = `${theoryPercent} / 100 %`;

    // BASE CHAIN LAB
    const baseParts = [progress.faucet, progress.send, progress.receive, progress.mint, progress.launch];
    let baseCompleted = 0;
    for (const part of baseParts) {
      if (part === true) baseCompleted += 1;
    }
    const basePercent = Math.round((baseCompleted / baseParts.length) * 100);
    console.log("Base Chain Lab percent:", basePercent);
    const baseBar = document.getElementById("baseLabProgressBar");
    const baseText = document.getElementById("baseLabProgressText");
    if (baseBar) baseBar.style.width = `${basePercent}%`;
    if (baseText) baseText.textContent = `${basePercent} / 100 %`;

    // SECURITY LAB
    const securityParts = [progress.lab1, progress.lab2, progress.lab3, progress.lab4, progress.lab5];
    let securityCompleted = 0;
    for (const part of securityParts) {
      if (part === true) securityCompleted += 1;
    }
    const securityPercent = Math.round((securityCompleted / securityParts.length) * 100);
    console.log("Security Lab percent:", securityPercent);
    const secBar = document.getElementById("securityProgressBar");
    const secText = document.getElementById("securityProgressText");
    if (secBar) secBar.style.width = `${securityPercent}%`;
    if (secText) secText.textContent = `${securityPercent} / 100 %`;

  } catch (err) {
    console.error("getProgress error:", err);
  }
}

// NFT MINT - odemkne se při completed_all = true
async function checkCompletedAll(wallet, ethProvider, currentWallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/get-field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        table_name: "USER_INFO",
        field_name: "completed_all",
      }),
    });

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("get-field completed_all error:", msg);
      return;
    }

    const data = await res.json();
    const value = data.value;
    console.log("completed_all value:", value);

    const nftSection = document.getElementById("nftSection");
    const mintBtn = document.getElementById("mintNftBtn");

    if (value === true) {
      if (nftSection) nftSection.classList.remove("locked");
      if (mintBtn) {
        mintBtn.disabled = false;

        // THIRDWEB FRONTEND MINT (Client ID - veřejný)
        mintBtn.onclick = async () => {
          try {
            console.log("Thirdweb CLIENT mint started");

            // 1. Přepni na Base mainnet
            const chainId = await ethProvider.request({ method: "eth_chainId" });
            if (chainId !== "0x2105") {
              await ethProvider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x2105" }],
              });
            }

            // 2. APPROVE USDC (wallet popup)
            console.log("1. Approving USDC...");
            const approveResp = await fetch("https://api.thirdweb.com/v1/contracts/write", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-client-id": THIRDWEB_CLIENT_ID,  // VEŘEJNÝ Client ID
              },
              body: JSON.stringify({
                calls: [{
                  contractAddress: "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913",  // USDC
                  method: "function approve(address,uint256) external returns (bool)",
                  params: ["0xA76F456f6FbaB161069fc891c528Eb56672D3e69", "4000000"]  // 4 USDC
                }],
                chainId: 8453,  // Base mainnet
                from: currentWallet,
              }),
            });
            const approveData = await approveResp.json();
            console.log("Approve result:", approveData);

            // 3. Počkej 2s na approve potvrzení
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. CLAIM NFT (wallet popup)
            console.log("2. Claiming NFT...");
            const claimResp = await fetch("https://api.thirdweb.com/v1/contracts/write", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-client-id": THIRDWEB_CLIENT_ID,
              },
              body: JSON.stringify({
                calls: [{
                  contractAddress: "0xA76F456f6FbaB161069fc891c528Eb56672D3e69",  // NFT Drop
                  method: "function claim(address,uint256) public payable",
                  params: [currentWallet, 1]
                }],
                chainId: 8453,
                from: currentWallet,
              }),
            });

            const claimData = await claimResp.json();
            console.log("Claim result:", claimData);

            if (claimData.transactionHash) {
              console.log("NFT MINTED! Tx:", claimData.transactionHash);
              alert(`NFT successfully minted!\nTx: ${claimData.transactionHash}`);
            } else {
              console.error("Mint failed:", claimData);
              alert("Mint failed: " + JSON.stringify(claimData));
            }

          } catch (e) {
            console.error("Thirdweb mint error:", e);
            alert("Mint error: " + e.message);
          }
        };
      }
    }
  } catch (err) {
    console.error("checkCompletedAll error:", err);
  }
}
