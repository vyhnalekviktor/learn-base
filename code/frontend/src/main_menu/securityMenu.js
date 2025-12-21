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

    // cekujeme lab1–lab5 misto faucet/send/...
    const parts = [
      progress.lab1,
      progress.lab2,
      progress.lab3,
      progress.lab4,
      progress.lab5,
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

    // oznaceni hotovych labu podle id v security.html
    if (progress.lab1 === true) {
      const el = document.getElementById("item-lab1");
      if (el) el.classList.add("completed");
    }

    if (progress.lab2 === true) {
      const el = document.getElementById("item-lab2");
      if (el) el.classList.add("completed");
    }

    if (progress.lab3 === true) {
      const el = document.getElementById("item-lab3");
      if (el) el.classList.add("completed");
    }

    if (progress.lab4 === true) {
      const el = document.getElementById("item-lab4");
      if (el) el.classList.add("completed");
    }

    if (progress.lab5 === true) {
      const el = document.getElementById("item-lab5");
      if (el) el.classList.add("completed");
    }
  } catch (err) {
    console.error("getProgress error:", err);
  }
}
