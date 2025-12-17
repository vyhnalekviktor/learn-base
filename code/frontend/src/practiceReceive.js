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

        await new Promise(resolve => setTimeout(resolve, 1500));

        statusDiv.innerHTML = '<p>Your friend confirmed! Sending 1 USDC...</p>';

        await new Promise(resolve => setTimeout(resolve, 2000));

        statusDiv.className = 'info-box';
        statusDiv.innerHTML = `
            <p><strong>USDC is on the way!</strong></p>
            <p>Your friend sent you <strong>1 USDC</strong> on Base Sepolia.</p>
            <p><strong>Your address:</strong><br>
            <code style="font-size: 11px; word-break: break-all; display: block; background: #f1f3f5; padding: 8px; border-radius: 6px; margin: 10px 0;">${address}</code></p>
            <p>Check your wallet in 10-30 seconds!</p>
            <p><a href="https://sepolia.basescan.org/address/${address}" target="_blank" class="learn-more">View on BaseScan</a></p>
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 6px; font-size: 13px;">
                <strong>Note:</strong> For practice purposes, you can get testnet USDC from
                <a href="https://www.alchemy.com/faucets/base-sepolia" target="_blank" style="color: #0052FF; text-decoration: underline;">Alchemy Faucet</a>
                or ask a friend who has Base Sepolia USDC.
            </div>
        `;

    } catch (error) {
        console.error('Error:', error);
        statusDiv.className = 'error-box';
        statusDiv.innerHTML = '<p>Something went wrong. Please try again.</p>';
    } finally {
        receiveBtn.disabled = false;
    }
};

initApp();
