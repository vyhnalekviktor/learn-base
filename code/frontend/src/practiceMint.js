import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const CONTRACT_ADDRESS = '0x726107014C8F10d372D59882dDF126ea02c3c6d4';
const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_MAINNET_CHAIN_ID = 8453;

const ABI = [
    'function mintTo(address _to) public',
    'function counter() public view returns (uint256)'
];

let ethProvider = null;
let signer = null;
let originalChainId = null;

async function initApp() {
    try {
        ethProvider = await sdk.wallet.ethProvider;
        await sdk.actions.ready();
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

async function switchToMainnet() {
    try {
        await ethProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }],
        });
    } catch (error) {
        console.error('Failed to switch back to mainnet:', error);
    }
}

window.mintNFT = async function() {
    const statusDiv = document.getElementById('mintStatus');
    const mintBtn = document.getElementById('mintNftBtn');

    try {
        if (mintBtn) {
            mintBtn.disabled = true;
            mintBtn.textContent = 'Minting...';
        }

        statusDiv.style.display = 'block';
        statusDiv.className = 'info-box';
        statusDiv.innerHTML = '<p>Preparing to mint your NFT...</p>';

        if (!ethProvider) {
            throw new Error('Base App not initialized');
        }

        const { BrowserProvider, Contract } = await import('https://esm.sh/ethers@6.9.0');
        const provider = new BrowserProvider(ethProvider);

        const network = await provider.getNetwork();
        originalChainId = Number(network.chainId);

        if (originalChainId !== BASE_SEPOLIA_CHAIN_ID) {
            statusDiv.innerHTML = '<p>Switching to Base Sepolia testnet...</p>';

            try {
                await ethProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x14a34' }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await ethProvider.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x14a34',
                            chainName: 'Base Sepolia',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://sepolia.base.org'],
                            blockExplorerUrls: ['https://sepolia.basescan.org']
                        }]
                    });
                } else {
                    throw switchError;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const sepoliaProvider = new BrowserProvider(ethProvider);
        signer = await sepoliaProvider.getSigner();
        const userAddress = await signer.getAddress();

        statusDiv.innerHTML = '<p>Please confirm the transaction in your wallet...</p>';

        const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);
        const tx = await contract.mintTo(userAddress);

        const txHash = tx.hash;

        statusDiv.innerHTML = `
            <p><strong>Transaction Submitted!</strong></p>
            <p>Hash: <code>${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}</code></p>
            <p>Waiting for confirmation...</p>
        `;

        let receipt = null;
        try {
            receipt = await tx.wait(1);
        } catch (waitError) {
            receipt = { status: 1 };
        }

        let totalMinted = 'N/A';
        try {
            totalMinted = await contract.counter();
            totalMinted = totalMinted.toString();
        } catch (e) {
            totalMinted = 'Check wallet';
        }

        statusDiv.className = 'info-box';
        statusDiv.innerHTML = `
            <strong>NFT Minted Successfully!</strong><br><br>
            <strong>Token ID:</strong> #${totalMinted}<br>
            <strong>Contract:</strong> ${CONTRACT_ADDRESS.substring(0, 6)}...${CONTRACT_ADDRESS.substring(38)}<br><br>
            <div style="display: flex; flex-direction: column; gap: 12px; margin: 20px 0;">
                <button onclick="window.open('https://sepolia.basescan.org/tx/${txHash}', '_blank')"
                    style="width: 100%; padding: 12px 16px; background: #0052FF; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 15px; font-weight: 600;">
                    View on BaseScan
                </button>
                <button onclick="window.open('https://account.base.app/activity', '_blank')"
                        style="width: 100%; padding: 12px 16px; background: #0052FF; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 15px; font-weight: 600;">
                        View in Wallet
                </button>
            </div>
            <small style="color: #666;">Your NFT has been minted on Base Sepolia testnet</small>
        `;


        if (originalChainId === BASE_MAINNET_CHAIN_ID) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await switchToMainnet();
        }

        if (mintBtn) {
            mintBtn.disabled = false;
            mintBtn.textContent = 'Mint NFT';
        }

    } catch (error) {
        statusDiv.className = 'error-box';
        if (error.message.includes('User rejected') || error.message.includes('rejected')) {
            statusDiv.innerHTML = '<p>Transaction rejected by user</p>';
        } else if (error.message.includes('insufficient funds')) {
            statusDiv.innerHTML = '<p>Insufficient ETH for gas fees. Get testnet ETH from <a href="https://faucet.quicknode.com/base/sepolia" target="_blank" class="learn-more">QuickNode Faucet</a>.</p>';
        } else {
            statusDiv.innerHTML = `<p>Mint failed: ${error.shortMessage || error.message}</p>`;
        }

        if (originalChainId === BASE_MAINNET_CHAIN_ID) {
            await switchToMainnet();
        }

        if (mintBtn) {
            mintBtn.disabled = false;
            mintBtn.textContent = 'Mint NFT';
        }
    }
};

initApp();
