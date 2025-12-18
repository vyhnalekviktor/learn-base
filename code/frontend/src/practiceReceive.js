import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

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

window.requestTestUSDC = async function() {
    const walletInput = document.getElementById('walletInput');
    const statusDiv = document.getElementById('receiveStatus');
    const receiveBtn = document.getElementById('receiveBtn');
    const address = walletInput.value.trim();

    if (!address) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'error-box';
        statusDiv.innerHTML = '<p>Please enter your wallet address</p>';
        return;
    }

    if (!address.startsWith('0x') || address.length !== 42) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'error-box';
        statusDiv.innerHTML = '<p>Invalid wallet address. Must start with 0x and be 42 characters long.</p>';
        return;
    }

    try {
        receiveBtn.disabled = true;
        statusDiv.style.display = 'block';
        statusDiv.className = 'info-box';
        statusDiv.innerHTML = '<p>Asking your friend to send you USDC...</p>';

        await new Promise(resolve => setTimeout(resolve, 1000));

        statusDiv.innerHTML = '<p>Your friend confirmed! Sending 1 USDC...</p>';

        const response = await fetch('https://learn-base-backend.vercel.app/api/testnet/send-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address: address })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.msg || 'Failed to send USDC');
        }

        statusDiv.className = 'info-box';
        statusDiv.innerHTML = `
            <p><strong>Payment Received!</strong></p>
            <p>Your friend sent you <strong>1 USDC</strong> on Base Sepolia!</p>
            <p><strong>To:</strong> ${address.substring(0, 6)}...${address.substring(38)}</p>
            <p>Check your wallet now!</p>
            <p><a href="https://sepolia.basescan.org/address/${address}" target="_blank" class="learn-more">View on BaseScan</a></p>
            <p style="margin-top: 15px;"><small style="color: #666;">Transaction should appear in your wallet within 10-30 seconds</small></p>
        `;

    } catch (error) {
        console.error('Error:', error);
        statusDiv.className = 'error-box';
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<p>${error.message || 'Failed to send USDC. Please try again later.'}</p>`;
    } finally {
        receiveBtn.disabled = false;
    }
};

initApp();
