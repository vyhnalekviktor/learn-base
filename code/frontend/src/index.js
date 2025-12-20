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

    await initUserOnBackend(wallet);
  } catch (error) {
    console.error("Error during MiniApp wallet init:", error);
  }
});

async function initUserOnBackend(wallet) {
  try {
    const res = await fetch(`${API_BASE}/api/database/init-user`, {
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
      console.error("init-user error:", msg);
      return;
    }

    const data = await res.json();
    console.log("init-user result:", data);
  } catch (err) {
    console.error("initUserOnBackend error:", err);
  }
}
