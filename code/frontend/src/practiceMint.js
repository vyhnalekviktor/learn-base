const CONTRACT_ADDRESS = "0x726107014C8F10d372D59882dDF126ea02c3c6d4";
const ABI = [
    "function mintTo(address _to) public",
    "function counter() public view returns (uint256)"
];

window.mintNFT = async function() {
    const statusDiv = document.getElementById('mintStatus');
    const button = document.getElementById('mintNftBtn');

    try {
        button.disabled = true;
        statusDiv.style.display = 'block';
        statusDiv.className = 'info-box';
        statusDiv.innerHTML = '<p>Connecting to your wallet...</p>';

        if (!window.ethereum) {
            throw new Error('Please install MetaMask or Coinbase Wallet');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);

        const network = await provider.getNetwork();
        if (network.chainId !== 84532n) {
            throw new Error('Please switch to Base Sepolia (Chain ID: 84532)');
        }

        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        statusDiv.innerHTML = '<p>Minting your NFT...</p>';

        const tx = await contract.mintTo(userAddress);

        statusDiv.innerHTML = `
            <p><strong>Transaction submitted!</strong></p>
            <p>Hash: <code>${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 8)}</code></p>
            <p>Waiting for confirmation...</p>
        `;

        await tx.wait();

        const totalMinted = await contract.counter();

        statusDiv.className = 'info-box';
        statusDiv.innerHTML = `
            <p><strong>Success!</strong> Your NFT has been minted!</p>
            <p><strong>Token ID:</strong> #${totalMinted.toString()}</p>
            <p><a href="https://sepolia.basescan.org/tx/${tx.hash}" target="_blank">View on BaseScan</a></p>
        `;

    } catch (error) {
        console.error('Error:', error);
        statusDiv.className = 'error-box';

        let errorMessage = error.message;
        if (error.code === 'ACTION_REJECTED') {
            errorMessage = 'Transaction rejected';
        } else if (error.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient ETH for gas';
        }

        statusDiv.innerHTML = `<p><strong>Error:</strong> ${errorMessage}</p>`;
    } finally {
        button.disabled = false;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const contractElement = document.getElementById('nftContract');
    if (contractElement) {
        contractElement.textContent = CONTRACT_ADDRESS;
    }
});
