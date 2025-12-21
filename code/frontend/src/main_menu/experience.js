import { NFT_ABI } from "./nftABI.js";
import { sdk } from "https://esm.sh/@farcaster/miniapp-sdk";

const API_BASE = "https://learn-base-backend.vercel.app";

const BASE_MAINNET_CHAIN_ID = "0x2105"; // Base mainnet 8453
const NFT_CONTRACT = "0xA76F456f6FbaB161069fc891c528Eb56672D3e69";

// USDC na Base mainnetu
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913";
const USDC_DECIMALS = 6;
const PRICE_USDC = 4; // 4 USDC
const QUANTITY = 1;

let ethProvider = null;
let currentWallet = null;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
];

// Hlavní init
window.addEventListener("load", async () => {
  try {
    console.log("Page loaded, calling sdk.actions.ready()...");
    await sdk.actions.ready();
    console.log("BaseCamp mini app is ready!");

    ethProvider = await sdk.wallet.ethProvider;

    const accounts = await ethProvider.request({
      method: "eth_requestAccounts",
    });

    const wallet = accounts && accounts.length > 0 ? accounts[0] : null;
    if (!wallet) {
      console.warn("Wallet address not found from ethProvider.request()");
      return;
    }
    currentWallet = wallet;

    console.log("Connected wallet from SDK:", wallet);
    const span = document.getElementById("wallet-address");
    if (span) span.textContent = wallet;

    await initUser(wallet);       // vytvoř USER_INFO / USER_PROGRESS, pokud chybí
    await loadUserState(wallet);  // načti vše z get-user
    await initApp();              // init NFT části (zobrazení adresy kontraktu)
  } catch (error) {
    console.error("Error during MiniApp wallet init:", error);
  }
});

// Inicializace uživatele v DB
async function initUser(wallet) {
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
    console.log("init-user:", data);
  } catch (e) {
    console.error("initUser error:", e);
  }
}

// Jediný get-user call – progress + completed_all + claimed_nft
async function loadUserState(wallet) {
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
    const info = data.info;       // USER_INFO
    const progress = data.progress; // USER_PROGRESS

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
    const baseParts = [
      progress.faucet,
      progress.send,
      progress.receive,
      progress.mint,
      progress.launch,
    ];
    let baseCompleted = 0;
    for (const part of baseParts) {
      if (part === true) baseCompleted += 1;
    }
    const basePercent = Math.round(
      (baseCompleted / baseParts.length) * 100
    );
    console.log("Base Chain Lab percent:", basePercent);
    const baseBar = document.getElementById("baseLabProgressBar");
    const baseText = document.getElementById("baseLabProgressText");
    if (baseBar) baseBar.style.width = `${basePercent}%`;
    if (baseText) baseText.textContent = `${basePercent} / 100 %`;

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
      if (part === true) securityCompleted += 1;
    }
    const securityPercent = Math.round(
      (securityCompleted / securityParts.length) * 100
    );
    console.log("Security Lab percent:", securityPercent);
    const secBar = document.getElementById("securityProgressBar");
    const secText = document.getElementById("securityProgressText");
    if (secBar) secBar.style.width = `${securityPercent}%`;
    if (secText) secText.textContent = `${securityPercent} / 100 %`;

    // completed_all → odemknutí NFT sekce
    const nftSection = document.getElementById("nftSection");
    const mintBtn = document.getElementById("mintNftBtn");
    if (info.completed_all === true) {
      if (nftSection) nftSection.classList.remove("locked");
      if (mintBtn) {
        mintBtn.disabled = false;
        mintBtn.onclick = window.claimNFT;
      }
    }

    // claimed_nft → přepnutí na „Your NFT“
    if (info.claimed_nft === true) {
      showOwnedNftSection();
    }
  } catch (err) {
    console.error("loadUserState error:", err);
  }
}

// Sekce s vlastněným NFT
function showOwnedNftSection() {
  const nftSection = document.getElementById("nftSection");
  const ownedSection = document.getElementById("ownedNftSection");

  if (nftSection) {
    nftSection.style.display = "none";
  }

  if (ownedSection) {
    ownedSection.style.display = "block";
    const img = ownedSection.querySelector("img");
    const link = ownedSection.querySelector("a");

    const httpUrl =
      "https://ipfs.io/ipfs/QmY7R8XrMLGcNTXLPyUkq5z5c4c9jhmvf5UiqPk4Ww2AeH/0.png";

    if (img) img.src = httpUrl;
    if (link) {
      link.href = httpUrl;
      link.textContent = "View your NFT";
    }
  }
}

// Inicializace NFT části
async function initApp() {
  try {
    if (!ethProvider) {
      ethProvider = await sdk.wallet.ethProvider;
    }

    const addrSpan = document.getElementById("nftContract");
    if (addrSpan) {
      addrSpan.textContent = NFT_CONTRACT;
    }
  } catch (error) {
    console.error("NFT Init error:", error);
  }
}

// Přepnutí na Base mainnet
async function ensureBaseMainnet() {
  const chainId = await ethProvider.request({ method: "eth_chainId" });
  if (chainId !== BASE_MAINNET_CHAIN_ID) {
    await ethProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_MAINNET_CHAIN_ID }],
    });
  }
}

// Mint přes USDC + claim
window.claimNFT = async function () {
  try {
    if (!ethProvider) {
      ethProvider = await sdk.wallet.ethProvider;
    }
    if (!currentWallet) {
      console.error("No wallet set for claimNFT");
      return;
    }

    await ensureBaseMainnet();

    const provider = new ethers.providers.Web3Provider(ethProvider);
    const signer = provider.getSigner();

    // 1) Approve 4 USDC pro drop kontrakt
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const amount = ethers.utils.parseUnits(
      PRICE_USDC.toString(),
      USDC_DECIMALS
    );

    console.log("Approving USDC...");
    const approveTx = await usdc.approve(NFT_CONTRACT, amount);
    console.log("USDC approve tx:", approveTx.hash);
    await approveTx.wait();
    console.log("USDC approved");

    // 2) Claim 1 NFT (uprav signaturu dle ABI, pokud je jiná)
    const drop = new ethers.Contract(NFT_CONTRACT, NFT_ABI, signer);
    console.log("Calling claim...");
    const claimTx = await drop.claim(currentWallet, QUANTITY);
    console.log("Claim tx hash:", claimTx.hash);
    await claimTx.wait();
    console.log("Claim confirmed");

    // 3) Update USER_INFO.claimed_nft = true
    const res = await fetch(`${API_BASE}/api/database/update_field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: currentWallet,
        table_name: "USER_INFO",
        field_name: "claimed_nft",
        value: true,
      }),
    });

    if (!res.ok) {
      let msg = "Unknown backend error";
      try {
        const err = await res.json();
        msg = err.detail || JSON.stringify(err);
      } catch (_) {}
      console.error("update_field claimed_nft error:", msg);
    } else {
      console.log("claimed_nft flag updated in DB");
    }

    // 4) Zobraz sekci s NFT
    showOwnedNftSection();
  } catch (e) {
    console.error("Mint / claim error:", e);
  }
};
