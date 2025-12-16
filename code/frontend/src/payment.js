import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

const BACKEND_URL = 'https://learn-base-backend.vercel.app';

const YOUR_WALLET = '0x02D6cB44CF2B0539B5d5F72a7a0B22Ac73031117';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = 8453;

let userAccount = null;
let isPaid = false;

// ✅ Initialize with Base App context
async function initApp() {
    try {
        console.log('Initializing Base App...');

        // Get user wallet from Base App
        const context = await sdk.context;

        if (context?.user?.wallet?.address) {
            userAccount = context.user.wallet.address;
            console.log('User wallet:', userAccount);

            // Update UI - already connected!
            document.getElementById('connectBtn').style.display = 'none';
            document.getElementById('walletInfo').style.display = 'block';
            document.getElementById('address').textContent =
                userAccount.substring(0, 6) + '...' + userAccount.substring(38);

            // Enable payment buttons
            document.getElementById('paymentButtons').style.opacity = '1';
            document.getElementById('paymentButtons').style.pointerEvents = 'auto';
            document.getElementById('customPayment').style.opacity = '1';
            document.getElementById('customPayment').style.pointerEvents = 'auto';
        } else {
            console.log('⚠No wallet in context');
            alert('Please open this app in Base App to use wallet features');
        }

        // Signal ready
        await sdk.actions.ready();

    } catch (error) {
        console.error('Init error:', error);
    }
}

// ✅ No need for connectBaseWallet - Base App provides wallet automatically!

async function donate(amount) {
    if (!userAccount) {
        alert('Wallet not available. Please open in Base App.');
        return;
    }

    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = 'Processing payment...';

    try {
        // Amount in smallest unit (USDC has 6 decimals)
        const amountInWei = Math.floor(parseFloat(amount) * 1000000).toString(16);

        // Prepare USDC transfer transaction data
        const transferData = '0xa9059cbb' + // transfer(address,uint256) function selector
            YOUR_WALLET.substring(2).padStart(64, '0') + // recipient address
            amountInWei.padStart(64, '0'); // amount

        // Send transaction via Base App wallet
        const txHash = await sdk.wallet.sendTransaction({
            to: USDC_ADDRESS,
            data: transferData,
            chainId: BASE_CHAIN_ID
        });

        console.log('Transaction sent:', txHash);
        statusDiv.innerHTML = '⏳ Verifying transaction...';

        // Verify with backend
        const response = await fetch(`${BACKEND_URL}/api/sme/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address_from: userAccount,
                tx_hash: txHash,
                token: 'USDC',
                amount: parseFloat(amount)
            })
        });

        const result = await response.json();

        if (result.success) {
            statusDiv.innerHTML = `Thank you for ${amount} USDC support! 🙏`;
            unlockMessageField();
        } else {
            statusDiv.innerHTML = `Verification failed: ${result.msg}`;
        }

    } catch (error) {
        console.error('Payment error:', error);
        statusDiv.innerHTML = `Payment failed: ${error.message}`;
    }
}

function unlockMessageField() {
    isPaid = true;
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
        const response = await fetch(`${BACKEND_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_address: userAccount,
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

// Initialize on load
initApp();
