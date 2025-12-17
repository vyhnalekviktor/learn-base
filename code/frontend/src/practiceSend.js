import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

// Hardcoded hodnoty z HTML
const RECIPIENT_ADDRESS = '0x02D6cB44CF2B0539B5d5F72a7a0B22Ac73031117';
const AMOUNT_USDC = '1';

// Base Sepolia Testnet
const USDC_TESTNET_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // 84532 in hex

let ethProvider = null;

// Inicializace aplikace
async function initApp() {
    try {
        console.log('Initializing Base App...');
        ethProvider = await sdk.wallet.ethProvider;
        console.log('Provider initialized:', ethProvider);

        await sdk.actions.ready();
        console.log('Base App ready');
    } catch (error) {
        console.error('Init error:', error);
        showStatus('Failed to initialize app: ' + error.message, 'error');
    }
}

// Funkce pro accordion (zachováno z původního kódu)
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

// Hlavní funkce pro odeslání USDC transakce (stejně jako payment.js)
async function sendTransaction() {
    console.log('Send transaction clicked!');
    const statusDiv = document.getElementById('txStatus');

    try {
        showStatus('Preparing USDC transaction...', 'processing');

        if (!ethProvider) {
            throw new Error('Provider not available. Please reload the app.');
        }

        // Získání účtu
        const accounts = await ethProvider.request({
            method: 'eth_accounts'
        });

        if (!accounts || accounts.length === 0) {
            throw new Error('No account connected');
        }

        const userAddress = accounts[0];
        console.log('User address:', userAddress);

        // Konverze USDC na nejmenší jednotku (6 decimals pro USDC)
        const amountInSmallestUnit = BigInt(Math.floor(parseFloat(AMOUNT_USDC) * 1000000));

        // ERC-20 transfer function signature: transfer(address,uint256)
        const transferFunctionSelector = '0xa9059cbb';
        const recipientPadded = RECIPIENT_ADDRESS.substring(2).padStart(64, '0');
        const amountPadded = amountInSmallestUnit.toString(16).padStart(64, '0');
        const data = transferFunctionSelector + recipientPadded + amountPadded;

        console.log('Sending USDC transaction:', {
            from: userAddress,
            to: USDC_TESTNET_ADDRESS,
            amount: AMOUNT_USDC + ' USDC',
            recipient: RECIPIENT_ADDRESS
        });

        showStatus('Please confirm the transaction in your wallet...', 'processing');

        // Odeslání USDC transakce
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
        showStatus(`✅ Success! Sending ${AMOUNT_USDC} USDC...`, 'success');

        // Zobrazení odkazu na block explorer
        const explorerLink = `https://sepolia.basescan.org/tx/${txHash}`;
        statusDiv.innerHTML = `
            ✅ <strong>Transaction Sent!</strong><br>
            Amount: ${AMOUNT_USDC} USDC<br>
            To: ${RECIPIENT_ADDRESS.substring(0, 6)}...${RECIPIENT_ADDRESS.substring(38)}<br>
            <br>
            <strong>TX Hash:</strong> ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}<br>
            <a href="${explorerLink}" target="_blank" style="color: #0052FF; text-decoration: underline; font-weight: bold;">
                View on BaseScan →
            </a>
            <br><br>
            <small style="color: #666;">Transaction is processing on Base Sepolia testnet...</small>
        `;

        // Zobrazení informace o uživateli
        const walletInfo = document.getElementById('walletInfo');
        if (walletInfo) {
            walletInfo.style.display = 'block';
            const addressSpan = document.getElementById('userAddress');
            if (addressSpan) {
                addressSpan.textContent = userAddress.substring(0, 6) + '...' + userAddress.substring(38);
            }
        }

    } catch (error) {
        console.error('Transaction error:', error);

        if (error.code === 4001 || error.message.includes('User rejected')) {
            showStatus('❌ Transaction rejected by user', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showStatus('❌ Insufficient USDC balance. Get testnet USDC from Circle Faucet first.', 'error');
        } else {
            showStatus(`❌ Transaction failed: ${error.message}`, 'error');
        }
    }
}

// Pomocná funkce pro zobrazení statusu
function showStatus(message, type) {
    const statusDiv = document.getElementById('txStatus');
    if (!statusDiv) {
        console.warn('Status div not found');
        return;
    }
    statusDiv.innerHTML = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
}

// Exportování funkcí pro použití v HTML
window.toggleAccordion = toggleAccordion;
window.sendTransaction = sendTransaction;

// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    initApp();
});

// Export pro případné použití jako modul
export { sendTransaction, toggleAccordion };
