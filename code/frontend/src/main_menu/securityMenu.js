import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await sdk.actions.ready();

    let wallet = null;
    if (window.BaseCampTheme?.waitForWallet) {
        try {
            const cache = await window.BaseCampTheme.waitForWallet();
            wallet = cache.wallet;
        } catch (e) {}
    }

    if (!wallet) {
      console.warn("No wallet found");
      return;
    }

    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;

    renderSecurityProgress(wallet);

  } catch (error) {
    console.error("Error:", error);
  }
});

async function renderSecurityProgress(wallet) {
    let data = window.BaseCampTheme?.getUserData();
    if (!data) {
        await window.BaseCampTheme.initUserData(wallet);
        data = window.BaseCampTheme.getUserData();
    }

    if (!data || !data.progress) return;
    const progress = data.progress;

    const parts = ['lab1', 'lab2', 'lab3', 'lab4', 'lab5'];
    let completed = 0;

    parts.forEach(part => {
        if (progress[part]) {
            completed++;
            const el = document.getElementById(`item-${part}`);
            if (el) el.classList.add("completed");
        }
    });

    const percent = (completed / parts.length) * 100;

    const label = document.getElementById("progress-percent");
    if (label) label.textContent = `${percent}%`;

    const bar = document.getElementById("progress-bar-fill");
    if (bar) bar.style.width = `${percent}%`;
}