import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const RECIPIENT_ADDRESS = '0xFdFB687dbb55734F8926290778BfD8f50EDf4e35';
// todo add my real wallet
const AMOUNT_USDC = '1';
const USDC_TESTNET_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const BASE_SEPOLIA_CHAIN_ID = '0x14a34';

let ethProvider = null;

async function initApp() {
    try {
        console.log('Initializing Base App...');
        ethProvider = await sdk.wallet.ethProvider;
        await sdk.actions.ready();
        console.log('Base App ready');
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

window.sendTransaction = async function() {
    console.log('Send transaction clicked!');
    const statusDiv = document.getElementById('txStatus');

    try {
        statusDiv.style.display = 'block';
        statusDiv.className = 'info-box';
        statusDiv.innerHTML = '⏳ Preparing USDC transaction...';

        if (!ethProvider) {
            throw new Error('Provider not available. Please reload the app.');
        }

        const accounts = await ethProvider.request({
            method: 'eth_requestAccounts'
        });

        if (!accounts || accounts.length === 0) {
            throw new Error('No account connected');
        }

        const userAddress = accounts[0];
        console.log('User address:', userAddress);

        // ERC-20 transfer encoding
        const amountInSmallestUnit = BigInt(Math.floor(parseFloat(AMOUNT_USDC) * 1000000));
        const transferFunctionSelector = '0xa9059cbb';
        const recipientPadded = RECIPIENT_ADDRESS.substring(2).padStart(64, '0');
        const amountPadded = amountInSmallestUnit.toString(16).padStart(64, '0');
        const data = transferFunctionSelector + recipientPadded + amountPadded;

        console.log('Transaction data:', {
            from: userAddress,
            to: USDC_TESTNET_ADDRESS,
            data: data,
            chainId: BASE_SEPOLIA_CHAIN_ID
        });

        statusDiv.innerHTML = 'Please confirm the transaction in your wallet...';

        // Odeslání transakce
        const txHash = await ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: USDC_TESTNET_ADDRESS,
                data: data,
                chainId: BASE_SEPOLIA_CHAIN_ID
            }]
        });

        console.log('Transaction sent! Hash:', txHash);

        const explorerLink = `https://sepolia.basescan.org/tx/${txHash}`;
        statusDiv.className = 'info-box';
        statusDiv.innerHTML = `
            <strong>Transaction Sent!</strong><br><br>
            <strong>Amount:</strong> ${AMOUNT_USDC} USDC<br>
            <strong>To:</strong> ${RECIPIENT_ADDRESS.substring(0, 6)}...${RECIPIENT_ADDRESS.substring(38)}<br>
            <strong>TX Hash:</strong> ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}<br><br>
            <a href="${explorerLink}" target="_blank" class="learn-more">View on BaseScan →</a><br><br>
            <small style="color: #666;">Transaction is processing on Base Sepolia testnet...</small>
        `;

    } catch (error) {
        console.error('Transaction error:', error);

        statusDiv.className = 'error-box';
        if (error.code === 4001 || error.message.includes('User rejected')) {
            statusDiv.innerHTML = 'Transaction rejected by user';
        } else if (error.message.includes('insufficient')) {
            statusDiv.innerHTML = 'Insufficient USDC balance or ETH for gas. Get testnet USDC from <a href="https://faucet.circle.com" target="_blank" class="learn-more">Circle Faucet</a>.';
        } else {
            statusDiv.innerHTML = `Transaction failed: ${error.message}`;
        }
    }
};

initApp();
