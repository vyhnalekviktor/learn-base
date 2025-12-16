// Configuration
const BACKEND_URL = 'http://localhost:8000';
const NETWORK = 'testnet';
const BASE_SEPOLIA_CHAIN_ID = 84532;
const RECIPIENT_ADDRESS = '0x02D6cB44CF2B0539B5d5F72a7a0B22Ac73031117';
const SEND_AMOUNT = '0.001';

// Global state
let web3 = null;
let userAccount = null;

// Update recipient address in HTML on page load
window.addEventListener('load', () => {
    const recipientEl = document.getElementById('recipientAddress');
    if (recipientEl) {
        recipientEl.textContent = RECIPIENT_ADDRESS;
    }
});

function toggleAccordion(id) {
    const content = document.getElementById('content-' + id);
    const icon = document.getElementById('icon-' + id);

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.textContent = '▼';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.textContent = '▲';
    }
}

async function sendTransaction() {
    const statusDiv = document.getElementById('statusMessage');
    const sendBtn = document.getElementById('sendBtn');

    // Helper function for status updates
    function showStatus(html, isError = false) {
        if (statusDiv) {
            statusDiv.innerHTML = html;
            statusDiv.className = isError ? 'error-box' : 'info-box';
        }
    }

    if (!window.ethereum) {
        showStatus('Wallet provider not found. Open this app in Base / Coinbase Wallet.', true);
        return;
    }

    // Disable button during transaction
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Processing...';
    }

    try {
        // Initialize Web3
        web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();

        if (!accounts || accounts.length === 0) {
            showStatus('No wallet connected', true);
            return;
        }

        userAccount = accounts[0];

        // Check network
        const chainId = await web3.eth.getChainId();
        if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
            showStatus(`Wrong network! Please switch to Base Sepolia (Chain ID: ${BASE_SEPOLIA_CHAIN_ID})`, true);
            return;
        }

        showStatus('⏳ Sending transaction...');

        // Send transaction
        const tx = await web3.eth.sendTransaction({
            from: userAccount,
            to: RECIPIENT_ADDRESS,
            value: web3.utils.toWei(SEND_AMOUNT, 'ether')
        });

        const txHash = tx.transactionHash;
        console.log('Transaction sent:', tx);

        showStatus(`Transaction sent!<br>Verifying on backend...`);

        // Verify on backend
        const resp = await fetch(`${BACKEND_URL}/api/testnet/verify-transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address_from: userAccount,
                address_to: RECIPIENT_ADDRESS,
                tx_hash: txHash,
                amount: parseFloat(SEND_AMOUNT),
                token: 'ETH'
            })
        });

        if (!resp.ok) {
            const error = await resp.json();
            throw new Error(error.detail || 'Verification failed');
        }

        const data = await resp.json();
        console.log('Backend verify result:', data);

        // Show success with explorer link
        if (data.success && data.verified) {
            const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;
            showStatus(`
                <p><strong>Transaction Verified!</strong></p>
                <p>Block: ${data.block}</p>
                <p>Hash: <code style="font-size: 11px; word-break: break-all;">${txHash}</code></p>
                <a href="${explorerUrl}" target="_blank" class="cta-button" style="margin-top: 10px; display: inline-block;">
                    View on BaseScan 🔍
                </a>
            `);
        } else {
            showStatus('Transaction sent but verification failed', true);
        }

    } catch (e) {
        console.error('Transaction error:', e);
        showStatus(`<strong>Transaction failed:</strong><br>${e.message}`, true);
    } finally {
        // Re-enable button
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Transaction';
        }
    }
}
