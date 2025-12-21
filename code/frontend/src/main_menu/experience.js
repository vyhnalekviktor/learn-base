import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";
//import { mintNft } from "./nftMint.js"; // externí soubor s logikou mintu

const API_BASE = "https://learn-base-backend.vercel.app";

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
    //await checkCompletedAll(wallet, ethProvider, wallet);
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
    if (theoryBar) {
      theoryBar.style.width = `${theoryPercent}%`;
    }
    if (theoryText) {
      theoryText.textContent = `${theoryPercent} / 100 %`;
    }

    // BASE CHAIN LAB
    const baseParts = [
      progress.faucet,
      progress.send,
      progress.receive,
      progress.mint,
      progress.launch,
    ];
    let baseCompleted = 0;
    for (const part of baseParts) {
      if (part === true) {
        baseCompleted += 1;
      }
    }
    const basePercent = Math.round(
      (baseCompleted / baseParts.length) * 100
    );
    console.log("Base Chain Lab percent:", basePercent);
    const baseBar = document.getElementById("baseLabProgressBar");
    const baseText = document.getElementById("baseLabProgressText");
    if (baseBar) {
      baseBar.style.width = `${basePercent}%`;
    }
    if (baseText) {
      baseText.textContent = `${basePercent} / 100 %`;
    }

    // SECURITY LAB
    const securityParts = [
      progress.lab1,
      progress.lab2,
      progress.lab3,
      progress.lab4,
      progress.lab5,
    ];
    let securityCompleted = 0;
    for (const part of securityParts) {
      if (part === true) {
        securityCompleted += 1;
      }
    }
    const securityPercent = Math.round(
      (securityCompleted / securityParts.length) * 100
    );
    console.log("Security Lab percent:", securityPercent);

    const secBar = document.getElementById("securityProgressBar");
    const secText = document.getElementById("securityProgressText");
    if (secBar) {
      secBar.style.width = `${securityPercent}%`;
    }
    if (secText) {
      secText.textContent = `${securityPercent} / 100 %`;
    }
  } catch (err) {
    console.error("getProgress error:", err);
  }
}

// zjistí USER_INFO.completed_all a podle toho odemkne NFT blok
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
        // volání funkce z jiného souboru
        //mintBtn.onclick = () => mintNft(ethProvider, currentWallet);
      }
    }
  } catch (err) {
    console.error("checkCompletedAll error:", err);
  }
}
