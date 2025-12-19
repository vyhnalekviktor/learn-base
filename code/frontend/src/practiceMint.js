const CONTRACT_ADDRESS = "0x726107014C8F10d372D59882dDF126ea02c3c6d4";
const ABI = [
    "function mintTo(address _to) public",
    "function counter() public view returns (uint256)"
];

let provider = null;
let signer = null;
let userAddress = null;

async function connectWallet() {
    const connectBtn = document.getElementById('connectBtn');
    const walletInfo = document.getElementById('walletInfo');
    const statusDiv = document.getElementById('status');

    try {
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';

        if (typeof window.ethereum !== 'undefined') {
            provider = new ethers.BrowserProvider(window.ethereum);

            const accounts = await provider.send("eth_requestAccounts", []);
            userAddress = accounts[0];

            const network = await provider.getNetwork();
            if (network.chainId !== 84532n) {
                await switchToBaseSepolia();
            }

            signer = await provider.getSigner();

            document.getElementById('userAddress').textContent =
                userAddress.substring(0, 6) + '...' + userAddress.substring(userAddress.length - 4);

            connectBtn.style.display = 'none';
            walletInfo.style.display = 'block';

        } else {
            throw new Error('No wallet found. Please open in Base App or install Coinbase Wallet.');
        }

    } catch (error) {
        console.error('Connection error:', error);
        statusDiv.style.display = 'block';
        statusDiv.className = 'error-box';
        statusDiv.innerHTML = `<p><strong>Error:</strong> ${error.message}</p>`;
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect Wallet';
    }
}

async function switchToBaseSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x14a34' }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            await window.ethereum.request({
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
}

window.mintNFT = async function() {
    const mintBtn = document.getElementById('mintBtn');
    const statusDiv = document.getElementById('status');

    try {
        mintBtn.disabled = true;
        mintBtn.textContent = 'Minting...';

        statusDiv.style.display = 'block';
        statusDiv.className = 'info-box';
        statusDiv.innerHTML = '<p>Preparing your NFT mint...</p>';

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        const tx = await contract.mintTo(userAddress);

        statusDiv.innerHTML = `
            <p><strong>Transaction sent!</strong></p>
            <p>Hash: <code>${tx.hash.substring(0, 10)}...</code></p>
            <p>Waiting for confirmation...</p>
        `;

        await tx.wait();

        const totalMinted = await contract.counter();

        statusDiv.className = 'info-box';
        statusDiv.innerHTML = `
            <p><strong>Success!</strong> NFT minted!</p>
            <p><strong>Token ID:</strong> #${totalMinted.toString()}</p>
            <p><a href="https://sepolia.basescan.org/tx/${tx.hash}" target="_blank">View on BaseScan</a></p>
        `;

    } catch (error) {
        console.error('Mint error:', error);
        statusDiv.className = 'error-box';

        let errorMessage = error.message;
        if (error.code === 'ACTION_REJECTED') {
            errorMessage = 'Transaction rejected';
        }

        statusDiv.innerHTML = `<p><strong>Error:</strong> ${errorMessage}</p>`;
    } finally {
        mintBtn.disabled = false;
        mintBtn.textContent = 'Mint NFT';
    }
};

window.connectWallet = connectWallet;

if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            location.reload();
        } else {
            userAddress = accounts[0];
            document.getElementById('userAddress').textContent =
                userAddress.substring(0, 6) + '...' + userAddress.substring(userAddress.length - 4);
        }
    });

    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}
