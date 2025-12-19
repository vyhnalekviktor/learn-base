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
            console.log('Current network:', network.chainId);

            if (network.chainId !== 84532n) {
                await switchToBaseSepolia();
                return;
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

        setTimeout(() => {
            connectWallet();
        }, 1000);

    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
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

                setTimeout(() => {
                    connectWallet();
                }, 1000);

            } catch (addError) {
                console.error('Error adding chain:', addError);
                throw addError;
            }
        } else {
            throw switchError;
        }
    }
}

async function mintNFT() {
    const mintBtn = document.getElementById('mintBtn');
    const statusDiv = document.getElementById('status');

    try {
        if (!signer || !userAddress) {
            throw new Error('Please connect wallet first');
        }

        mintBtn.disabled = true;
        mintBtn.textContent = 'Minting...';

        statusDiv.style.display = 'block';
        statusDiv.className = 'info-box';
        statusDiv.innerHTML = '<p>Preparing your NFT mint...</p>';

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        console.log('Minting to:', userAddress);
        const tx = await contract.mintTo(userAddress);

        statusDiv.innerHTML = `
            <p><strong>Transaction sent!</strong></p>
            <p>Hash: <code>${tx.hash.substring(0, 10)}...</code></p>
            <p>Waiting for confirmation...</p>
        `;

        const receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);

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
        } else if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient ETH for gas fees';
        }

        statusDiv.innerHTML = `<p><strong>Error:</strong> ${errorMessage}</p>`;
    } finally {
        mintBtn.disabled = false;
        mintBtn.textContent = 'Mint NFT';
    }
}

window.connectWallet = connectWallet;
window.mintNFT = mintNFT;

if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length === 0) {
            document.getElementById('connectBtn').style.display = 'block';
            document.getElementById('walletInfo').style.display = 'none';
            userAddress = null;
            signer = null;
        } else {
            userAddress = accounts[0];
            const addressEl = document.getElementById('userAddress');
            if (addressEl) {
                addressEl.textContent =
                    userAddress.substring(0, 6) + '...' + userAddress.substring(userAddress.length - 4);
            }
        }
    });

    window.ethereum.on('chainChanged', (chainId) => {
        console.log('Chain changed to:', chainId);
    });
}
