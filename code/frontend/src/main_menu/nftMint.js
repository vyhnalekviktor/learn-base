import { NFT_ABI } from "./nftABI.js";

const BASE_MAINNET_CHAIN_ID = "0x2105";
const NFT_CONTRACT = "0xA76F456f6FbaB161069fc891c528Eb56672D3e69";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913";
const USDC_DECIMALS = 6;
const PRICE_USDC = 4;
const QUANTITY = 1;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
];

export async function mintNft(ethProvider, wallet) {
  try {
    if (!ethProvider || !wallet) {
      console.error("Missing provider or wallet for mintNft");
      return;
    }

    const chainId = await ethProvider.request({ method: "eth_chainId" });
    if (chainId !== BASE_MAINNET_CHAIN_ID) {
      await ethProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_MAINNET_CHAIN_ID }],
      });
    }

    const provider = new ethers.providers.Web3Provider(ethProvider);
    const signer = provider.getSigner();

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const amount = ethers.utils.parseUnits(
      PRICE_USDC.toString(),
      USDC_DECIMALS
    );

    console.log("Approving USDC...");
    const approveTx = await usdc.approve(NFT_CONTRACT, amount);
    await approveTx.wait();
    console.log("USDC approved");

    const drop = new ethers.Contract(NFT_CONTRACT, NFT_ABI, signer);
    console.log("Calling claim...");
    const claimTx = await drop.claim(wallet, QUANTITY);
    await claimTx.wait();
    console.log("Claim confirmed");
  } catch (e) {
    console.error("mintNft error:", e);
  }
}
