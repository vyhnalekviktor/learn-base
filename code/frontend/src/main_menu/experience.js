import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

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
    await checkCompletedAll(wallet);
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

    // THEORY: jednoduchý 0 / 100 % na základě info.completed_theory
    const theoryBar = document.getElementById("theoryProgressBar");
    const theoryText = document.getElementById("theoryProgressText");
    const theoryPercent = info.completed_theory ? 100 : 0;

    if (theoryBar) {
      theoryBar.style.width = `${theoryPercent}%`;
    }
    if (theoryText) {
      theoryText.textContent = `${theoryPercent} / 100 %`;
    }

    // BASE CHAIN LAB: faucet, send, receive, mint, launch
    const parts = [
      progress.faucet,
      progress.send,
      progress.receive,
      progress.mint,
      progress.launch,
    ];

    let completed = 0;
    for (const part of parts) {
      if (part === true) {
        completed += 1;
      }
    }

    const basePercent = (completed / parts.length) * 100;
    console.log("Base Chain Lab percent:", basePercent);

    const baseBar = document.getElementById("baseLabProgressBar");
    const baseText = document.getElementById("baseLabProgressText");

    if (baseBar) {
      baseBar.style.width = `${basePercent}%`;
    }
    if (baseText) {
      baseText.textContent = `${completed} / ${parts.length} steps`;
    }

    // SECURITY LAB: zatím placeholder 0 %
    const secBar = document.getElementById("securityProgressBar");
    const secText = document.getElementById("securityProgressText");
    if (secBar) secBar.style.width = "0%";
    if (secText) secText.textContent = "0 / 100 %";
  } catch (err) {
    console.error("getProgress error:", err);
  }
}

// zjistí USER_INFO.completed_all a podle toho odemkne NFT blok
async function checkCompletedAll(wallet) {
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
      if (mintBtn) mintBtn.disabled = false;
    }
  } catch (err) {
    console.error("checkCompletedAll error:", err);
  }
}
