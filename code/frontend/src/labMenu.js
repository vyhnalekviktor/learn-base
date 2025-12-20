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

    const progress = data.progress;
    if (!progress) {
      console.error("No progress object in response");
      return;
    }

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

    const percent = (completed / parts.length) * 100;

    console.log("Progress percent:", percent);

    const label = document.getElementById("progress-percent");
    if (label) {
      label.textContent = `${percent}%`;
    }

    const bar = document.getElementById("progress-bar-fill");
    if (bar) {
      bar.style.width = `${percent}%`;
    }

    if (progress.faucet === true) {
      const el = document.getElementById("item-faucet");
      if (el) el.classList.add("completed");
    }
    if (progress.send === true || progress.send === true) {
      const el = document.getElementById("item-send");
      if (el) el.classList.add("completed");
    }
    if (progress.receive === true || progress.receive === true) {
      const el = document.getElementById("item-receive");
      if (el) el.classList.add("completed");
    }
    if (progress.mint === true) {
      const el = document.getElementById("item-mint");
      if (el) el.classList.add("completed");
    }
    if (progress.launch === true) {
      const el = document.getElementById("item-launch");
      if (el) el.classList.add("completed");
    }
  } catch (err) {
    console.error("getProgress error:", err);
  }
}
