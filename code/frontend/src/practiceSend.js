import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';
import { pay, getPaymentStatus } from 'https://esm.sh/@base-org/account';

const RECIPIENT_ADDRESS = '0xFdFB687dbb55734F8926290778BfD8f50EDf4e35';
//const RECIPIENT_ADDRESS = '0x02D6cB44CF2B0539B5d5F72a7a0B22Ac73031117'; real
const AMOUNT_USDC = '1';

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
        statusDiv.innerHTML = '⏳ Preparing USDC payment...';

        statusDiv.innerHTML = '🔐 Please confirm the payment in your wallet...';

        // Použití Base Pay podle guide
        const payment = await pay({
            amount: AMOUNT_USDC,
            to: RECIPIENT_ADDRESS,
            testnet: true
        });

        console.log('Payment sent! ID:', payment.id);

        statusDiv.innerHTML = '⏳ Checking payment status...';

        // Kontrola statusu
        const { status } = await getPaymentStatus({
            id: payment.id,
            testnet: true
        });

        if (status === 'completed') {
            console.log('Payment confirmed!');

            statusDiv.className = 'info-box';
            statusDiv.innerHTML = `
                ✅ <strong>Payment Confirmed!</strong><br><br>
                <strong>Amount:</strong> ${AMOUNT_USDC} USDC<br>
                <strong>To:</strong> ${RECIPIENT_ADDRESS.substring(0, 6)}...${RECIPIENT_ADDRESS.substring(38)}<br>
                <strong>Payment ID:</strong> ${payment.id}<br><br>
                <small style="color: #666;">Payment successfully processed on Base Sepolia testnet</small>
            `;
        } else {
            statusDiv.innerHTML = `⏳ Payment status: ${status}. Waiting for confirmation...`;
        }

    } catch (error) {
        console.error('Payment error:', error);

        statusDiv.className = 'error-box';
        if (error.message.includes('User rejected') || error.message.includes('rejected')) {
            statusDiv.innerHTML = '❌ Payment rejected by user';
        } else if (error.message.includes('insufficient')) {
            statusDiv.innerHTML = '❌ Insufficient USDC balance. Get testnet USDC from <a href="https://faucet.circle.com" target="_blank" class="learn-more">Circle Faucet</a>.';
        } else {
            statusDiv.innerHTML = `❌ Payment failed: ${error.message}`;
        }
    }
};

initApp();
