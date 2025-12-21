import { createThirdwebClient, getContract, claimTo, sendTransaction } from "thirdweb";
import { defineChain } from "thirdweb/chains";

const BASE = defineChain(8453); // Base mainnet
const NFT_CONTRACT = "0xA76F456f6FbaB161069fc891c528Eb56672D3e69";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913";
const USDC_DECIMALS = 6;
const PRICE_USDC = 4; // 4 USDC
const QUANTITY = 1;
const TOKEN_ID = 0; // první NFT z dropu

// Thirdweb client (bez clientId funguje pro basic operace)
const client = createThirdwebClient({});

export async function mintNft(ethProvider, walletAddress) {
  try {
    if (!ethProvider || !walletAddress) {
      console.error("Missing provider or wallet");
      return;
    }

    // Přepni na Base mainnet
    const chainId = await ethProvider.request({ method: "eth_chainId" });
    if (chainId !== "0x2105") {
      await ethProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
    }

    // NFT Drop kontrakt
    const contract = getContract({
      client,
      chain: BASE,
      address: NFT_CONTRACT,
    });

    // 1) APPROVE USDC (použijeme raw transaction)
    const usdcAmount = (PRICE_USDC * QUANTITY * 10 ** USDC_DECIMALS).toString();

    console.log("Approving USDC...");
    const approveTx = await ethProvider.request({
      method: "eth_sendTransaction",
      params: [{
        from: walletAddress,
        to: USDC_ADDRESS,
        data: `0x095ea7b3000000000000000000000000${NFT_CONTRACT.slice(2)}${usdcAmount.padStart(64, '0')}`
      }]
    });
    await ethProvider.once("block", () => {}); // čekej na potvrzení
    console.log("USDC approved:", approveTx);

    // 2) CLAIM NFT přes thirdweb
    console.log("Claiming NFT...");
    const transaction = claimTo({
      contract,
      to: walletAddress,
      tokenId: TOKEN_ID,
      amount: QUANTITY,
    });

    const { transactionHash } = await sendTransaction({
      transaction,
      account: ethProvider,
    });

    console.log("NFT minted! Tx:", transactionHash);
    return transactionHash;
  } catch (e) {
    console.error("mintNft error:", e);
  }
}
