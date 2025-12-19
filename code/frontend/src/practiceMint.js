import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const CONTRACT_ADDRESS = '0x726107014C8F10d372D59882dDF126ea02c3c6d4';
const ABI = [
    'function mintTo(address _to) public',
    'function counter() public view returns (uint256)'
];

let ethProvider = null;
let signer = null;

async function initApp() {
    try {
        console.log('Initializing Base App...');
        ethProvider = await sdk.wallet.ethProvider;
        await sdk.actions.ready();
        console.log('Base App ready');

        document.getElementById('nftContract').textContent = CONTRACT_ADDRESS;
    } catch (error) {
        console.error('Init error:', error);
    }
}

window.toggleAccordion = function(id) {
    const content = document.getElementById('content-' + id);
    const icon = document.getElementById('icon-' + id);

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.textContent = '▼';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.textContent = '▲';
    }
};

window.mintNFT = async function() {
    console.log('Mint NFT clicked!');
    const statusDiv = document.getElementById('mintStatus');

    try {
        statusDiv.style.display = 'block';
        statusDiv.className = 'info-box';
        statusDiv.innerHTML = '<p>Preparing to mint your NFT...</p>';

        if (!ethProvider) {
            throw new Error('Base App not initialized');
        }

        const { BrowserProvider, Contract } = await import('https://esm.sh/ethers@6.9.0');
        const provider = new BrowserProvider(ethProvider);
        signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        console.log('User address:', userAddress);

        statusDiv.innerHTML = '<p>Please confirm the transaction in your wallet...</p>';

        const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);
        const tx = await contract.mintTo(userAddress);

        console.log('Transaction sent!', tx.hash);

        statusDiv.innerHTML = `
            <p><strong>Transaction Submitted!</strong></p>
            <p>Hash: <code>${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 8)}</code></p>
            <p>Waiting for confirmation...</p>
        `;

        const receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);

        const totalMinted = await contract.counter();

        statusDiv.className = 'info-box';
        statusDiv.innerHTML = `
            <strong>NFT Minted Successfully!</strong><br><br>
            <strong>Token ID:</strong> #${totalMinted.toString()}<br>
            <strong>Contract:</strong> ${CONTRACT_ADDRESS.substring(0, 6)}...${CONTRACT_ADDRESS.substring(38)}<br><br>
            <button onclick="window.open('https://sepolia.basescan.org/tx/${tx.hash}', '_blank')"
                    style="padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; margin-right: 8px;">
                View on BaseScan
            </button>
            <button onclick="window.open('https://account.base.app/activity', '_blank')"
                    style="padding: 8px 16px; background: #0052FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
                View in Wallet
            </button><br><br>
            <small style="color: #666;">Your NFT has been minted on Base Sepolia testnet</small>
        `;

    } catch (error) {
        console.error('Mint error:', error);

        statusDiv.className = 'error-box';
        if (error.message.includes('User rejected') || error.message.includes('rejected')) {
            statusDiv.innerHTML = '<p>Transaction rejected by user</p>';
        } else if (error.message.includes('insufficient funds')) {
            statusDiv.innerHTML = '<p>Insufficient ETH for gas fees. Get testnet ETH from <a href="https://faucet.quicknode.com/base/sepolia" target="_blank" class="learn-more">QuickNode Faucet</a>.</p>';
        } else {
            statusDiv.innerHTML = `<p>Mint failed: ${error.shortMessage || error.message}</p>`;
        }
    }
};

initApp();
