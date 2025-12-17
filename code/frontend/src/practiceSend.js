import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

// Hardcoded hodnoty z HTML
const RECIPIENT_ADDRESS = '0x02D6cB44CF2B0539B5d5F72a7a0B22Ac73031117';
const AMOUNT_ETH = '0.001';
const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // Base Sepolia chain ID (84532 v hex)

let ethProvider = null;

// Inicializace aplikace
async function initApp() {
    try {
        console.log('Initializing Base App...');
        ethProvider = await sdk.wallet.ethProvider;
        console.log('Provider:', ethProvider);
        await sdk.actions.ready();
        console.log('Base App ready');
    } catch (error) {
        console.error('Init error:', error);
        showStatus('Failed to initialize app', 'error');
    }
}

// Funkce pro accordion
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

// Hlavní funkce pro odeslání transakce
async function sendTransaction() {
    const statusDiv = document.getElementById('txStatus');

    try {
        showStatus('Connecting to wallet...', 'processing');

        if (!ethProvider) {
            throw new Error('Provider not available. Please make sure you are using Coinbase Wallet.');
        }

        // Získání uživatelovy adresy
        const accounts = await ethProvider.request({
            method: 'eth_accounts'
        });

        if (!accounts || accounts.length === 0) {
            throw new Error('No wallet connected. Please connect your wallet first.');
        }

        const userAddress = accounts[0];
        console.log('User address:', userAddress);

        // Konverze částky na Wei (1 ETH = 10^18 Wei)
        const amountInWei = '0x' + (parseFloat(AMOUNT_ETH) * Math.pow(10, 18)).toString(16);

        showStatus('Please confirm the transaction in your wallet...', 'processing');

        // Odeslání transakce
        const txHash = await ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: RECIPIENT_ADDRESS,
                value: amountInWei,
                chainId: BASE_SEPOLIA_CHAIN_ID
            }]
        });

        console.log('Transaction sent:', txHash);
        showStatus(`Success! Transaction sent: ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`, 'success');

        // Zobrazení odkazu na block explorer
        const explorerLink = `https://sepolia.basescan.org/tx/${txHash}`;
        statusDiv.innerHTML += `<br><a href="${explorerLink}" target="_blank" style="color: #0052FF; text-decoration: underline;">View on BaseScan →</a>`;

    } catch (error) {
        console.error('Transaction error:', error);

        if (error.code === 4001) {
            showStatus('Transaction rejected by user', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showStatus('Insufficient funds. Please get testnet ETH from faucet first.', 'error');
        } else {
            showStatus(`Transaction failed: ${error.message}`, 'error');
        }
    }
}

// Pomocná funkce pro zobrazení statusu
function showStatus(message, type) {
    const statusDiv = document.getElementById('txStatus');
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
}

// Exportování funkcí pro použití v HTML
window.toggleAccordion = toggleAccordion;
window.sendTransaction = sendTransaction;

// Inicializace při načtení stránky
initApp();
