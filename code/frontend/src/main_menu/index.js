import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

window.addEventListener("load", async () => {
  try {
    console.log("Page loaded, calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log('BaseCamp mini app is ready!')
    const profile = await sdk.cast.profile()
    console.log('User profile:', profile)

    if (profile) {
        const userInfo = document.getElementById('user-info')
        const placeholder = document.getElementById('user-avatar-placeholder')
        const nameEl = document.getElementById('user-name')
        const fidEl = document.getElementById('user-fid')

        userInfo.style.display = 'flex'
        if (profile.imageUrl) {
            placeholder.style.backgroundImage = `url(${profile.imageUrl})`
            placeholder.style.backgroundSize = 'cover'
            placeholder.style.backgroundPosition = 'center'
        }
        nameEl.textContent = profile.displayName || 'Farcaster User'
        fidEl.textContent = `@${profile.fid}`
    }


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

    // pokud backend vrátí { success: true, created: true } → zobraz welcome
    if (data.success === true && data.created === true) {
      showWelcomeModal();
    }
  } catch (err) {
    console.error("initUserOnBackend error:", err);
  }
}

// jednoduché welcome okno přes DOM
function showWelcomeModal() {
  // wrapper přes celou obrazovku
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(15,23,42,0.75)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  const modal = document.createElement("div");
  modal.style.maxWidth = "420px";
  modal.style.width = "90%";
  modal.style.background = "linear-gradient(145deg,#0f172a,#020617)";
  modal.style.border = "1px solid rgba(148,163,184,0.4)";
  modal.style.borderRadius = "18px";
  modal.style.padding = "20px 22px";
  modal.style.color = "white";
  modal.style.boxShadow = "0 20px 45px rgba(15,23,42,0.8)";
  modal.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";

  modal.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 10px 0;display: flex;align-items: center; gap: 8px;">
      <span>Welcome to BaseCamp</span>
    </h2>
    <p style="font-size: 14px; line-height: 1.5; margin: 0 0 10px 0; color: #e5e7eb;">
      BaseCamp is an interactive MiniApp for learning blockchain on Base (Ethereum L2).
    </p>
    <p style="font-size: 14px; line-height: 1.5; margin: 0 0 10px 0; color: #e5e7eb;">
      Complete hands-on labs to earn an NFT completion badge! Read theory, try your first test operations and then test yourself for scam recognition.
    </p>
    <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px 0; color: #bbf7d0;">
      You can complete all the steps for free!!
    </p>
    <button id="welcome-close-btn" style="
      width: 100%;
      margin-top: 4px;
      padding: 10px 14px;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      background: #0052ff;
      color: white;
      font-weight: 600;
      font-size: 14px;
    ">
      Let’s start learning
    </button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeBtn = modal.querySelector("#welcome-close-btn");
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });
}
