import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const BACKEND_URL = 'https://learn-base-backend.vercel.app';
const YOUR_WALLET = '0x02D6cB44CF2B0539B5d5F72a7a0B22Ac73031117';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = '0x2105';

let ethProvider = null;

async function initApp() {
    try {
        console.log('Initializing Base App...');

        ethProvider = await sdk.wallet.ethProvider;
        console.log('Provider:', ethProvider);

        document.getElementById('paymentButtons').style.opacity = '1';
        document.getElementById('paymentButtons').style.pointerEvents = 'auto';
        document.getElementById('customPayment').style.opacity = '1';
        document.getElementById('customPayment').style.pointerEvents = 'auto';

        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) connectBtn.style.display = 'none';

        await sdk.actions.ready();
        console.log('Base App ready');

    } catch (error) {
        console.error('Init error:', error);
    }
}

async function donate(amount) {
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = 'Processing payment...';

    try {
        if (!ethProvider) {
            throw new Error('Provider not available');
        }

        const accounts = await ethProvider.request({
            method: 'eth_accounts'
        });

        if (!accounts || accounts.length === 0) {
            throw new Error('No account connected');
        }

        const userAddress = accounts[0];
        console.log('User address:', userAddress);

        const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1000000));

        const transferFunctionSelector = '0xa9059cbb';
        const recipientPadded = YOUR_WALLET.substring(2).padStart(64, '0');
        const amountPadded = amountInWei.toString(16).padStart(64, '0');
        const data = transferFunctionSelector + recipientPadded + amountPadded;

        console.log('Sending USDC transaction...');

        const txHash = await ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: USDC_ADDRESS,
                data: data,
                chainId: BASE_CHAIN_ID
            }]
        });

        console.log('Transaction sent:', txHash);
        statusDiv.innerHTML = 'Verifying transaction...';

        const response = await fetch(`${BACKEND_URL}/api/sme/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address_from: userAddress,
                tx_hash: txHash,
                token: 'USDC',
                amount: parseFloat(amount)
            })
        });

        const verifyResult = await response.json();

        if (verifyResult.success) {
            statusDiv.innerHTML = `Thank you for ${amount} USDC support!`;
            document.getElementById('walletInfo').style.display = 'block';
            document.getElementById('address').textContent =
                userAddress.substring(0, 6) + '...' + userAddress.substring(38);
        } else {
            statusDiv.innerHTML = `Verification failed: ${verifyResult.msg}`;
        }

    } catch (error) {
        console.error('Payment error:', error);
        statusDiv.innerHTML = `Payment failed: ${error.message}`;
    }
}

function donateCustom() {
    const amount = document.getElementById('customAmount').value;
    if (amount && parseFloat(amount) >= 0.50) {
        donate(amount);
    } else {
        alert('Minimum amount is $0.50');
    }
}

window.donate = donate;
window.donateCustom = donateCustom;

initApp();
