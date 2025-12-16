import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const BACKEND_URL = 'https://learn-base-backend.vercel.app';
const YOUR_WALLET = '0x02D6cB44CF2B0539B5d5F72a7a0B22Ac73031117';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = 8453;

let isPaid = false;

async function initApp() {
    try {
        console.log('Initializing Base App...');

        // Aktivuj tlacitka - wallet je automaticky pripojena v Base App
        document.getElementById('paymentButtons').style.opacity = '1';
        document.getElementById('paymentButtons').style.pointerEvents = 'auto';
        document.getElementById('customPayment').style.opacity = '1';
        document.getElementById('customPayment').style.pointerEvents = 'auto';

        // Skryj connect button - nepotrebujes ho
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
        // Amount in wei (USDC has 6 decimals)
        const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1000000));

        // Encode transfer function call
        const transferFunctionSelector = '0xa9059cbb';
        const recipientPadded = YOUR_WALLET.substring(2).padStart(64, '0');
        const amountPadded = amountInWei.toString(16).padStart(64, '0');
        const data = transferFunctionSelector + recipientPadded + amountPadded;

        console.log('Sending USDC transaction...');

        // Send transaction using Base Account
        const result = await sdk.wallet.sendTransaction({
            to: USDC_ADDRESS,
            data: data,
            chainId: BASE_CHAIN_ID
        });

        console.log('Transaction result:', result);
        statusDiv.innerHTML = 'Verifying transaction...';

        // Get user address from result or context
        const context = await sdk.context;
        const userAddress = context?.user?.wallet?.address || result.from || 'unknown';

        // Verify with backend
        const response = await fetch(`${BACKEND_URL}/api/sme/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address_from: userAddress,
                tx_hash: result.hash || result,
                token: 'USDC',
                amount: parseFloat(amount)
            })
        });

        const verifyResult = await response.json();

        if (verifyResult.success) {
            statusDiv.innerHTML = `Thank you for ${amount} USDC support!`;
            unlockMessageField(userAddress);
        } else {
            statusDiv.innerHTML = `Verification failed: ${verifyResult.msg}`;
        }

    } catch (error) {
        console.error('Payment error:', error);
        statusDiv.innerHTML = `Payment failed: ${error.message}`;
    }
}

function unlockMessageField(userAddress) {
    isPaid = true;

    // Show user address if we have it
    if (userAddress && userAddress !== 'unknown') {
        document.getElementById('walletInfo').style.display = 'block';
        document.getElementById('address').textContent =
            userAddress.substring(0, 6) + '...' + userAddress.substring(38);
    }

    document.getElementById('lockedOverlay').style.display = 'none';
    document.getElementById('messageField').disabled = false;
    document.getElementById('sendMessageBtn').disabled = false;
    document.getElementById('messageField').focus();
}

function lockMessageField() {
    isPaid = false;
    document.getElementById('lockedOverlay').style.display = 'flex';
    document.getElementById('messageField').disabled = true;
    document.getElementById('sendMessageBtn').disabled = true;
    document.getElementById('messageField').value = '';
}

async function sendMessage() {
    const message = document.getElementById('messageField').value.trim();

    if (!message) {
        alert('Please write a message');
        return;
    }

    if (!isPaid) {
        alert('Please send a payment first');
        return;
    }

    try {
        const context = await sdk.context;
        const userAddress = context?.user?.wallet?.address || 'anonymous';

        const response = await fetch(`${BACKEND_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_address: userAddress,
                message: message,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            alert('Message sent! Thank you!');
            document.getElementById('messageField').value = '';
        } else {
            alert('Failed to send message');
        }

    } catch (error) {
        console.error('Send message error:', error);
        alert('Failed to send message');
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

// Make functions global for onclick handlers
window.donate = donate;
window.donateCustom = donateCustom;
window.sendMessage = sendMessage;

initApp();
