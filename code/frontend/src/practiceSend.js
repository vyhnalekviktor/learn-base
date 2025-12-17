import { sdk } from 'https://esm.sh/@farcaster/miniapp-sdk';

// Hardcoded hodnoty z HTML
const RECIPIENT_ADDRESS = '0x02D6cB44CF2B0539B5d5F72a7a0B22Ac73031117';
const AMOUNT_ETH = '0.001';
const BASE_SEPOLIA_CHAIN_ID = 84532; // Base Sepolia chain ID (decimal)

let ethProvider = null;

// Inicializace aplikace
async function initApp() {
    try {
        console.log('Initializing Base App...');
        ethProvider = await sdk.wallet.ethProvider;
        console.log('Provider initialized:', ethProvider);

        // Zkontroluj síť
        const chainId = await ethProvider.request({ method: 'eth_chainId' });
        console.log('Current chain ID:', chainId, '(decimal:', parseInt(chainId, 16), ')');

        await sdk.actions.ready();
        console.log('Base App ready');
    } catch (error) {
        console.error('Init error:', error);
        showStatus('Failed to initialize app: ' + error.message, 'error');
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
    console.log('Send transaction clicked!');
    const statusDiv = document.getElementById('txStatus');

    try {
        showStatus('Preparing transaction...', 'processing');

        if (!ethProvider) {
            throw new Error('Provider not available. Please reload the app.');
        }

        // Zkontroluj aktuální síť
        const currentChainId = await ethProvider.request({ method: 'eth_chainId' });
        const currentChainDecimal = parseInt(currentChainId, 16);

        console.log('Current chain:', currentChainDecimal, 'Target chain:', BASE_SEPOLIA_CHAIN_ID);

        // Přepni na Base Sepolia pokud nejsi na správné síti
        if (currentChainDecimal !== BASE_SEPOLIA_CHAIN_ID) {
            showStatus('Switching to Base Sepolia testnet...', 'processing');

            try {
                await ethProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x' + BASE_SEPOLIA_CHAIN_ID.toString(16) }],
                });
                console.log('Switched to Base Sepolia');
            } catch (switchError) {
                // Pokud síť neexistuje, přidej ji
                if (switchError.code === 4902) {
                    await ethProvider.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x' + BASE_SEPOLIA_CHAIN_ID.toString(16),
                            chainName: 'Base Sepolia',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://sepolia.base.org'],
                            blockExplorerUrls: ['https://sepolia.basescan.org']
                        }]
                    });
                } else {
                    throw switchError;
                }
            }
        }

        // Získání uživatelovy adresy
        showStatus('Connecting to wallet...', 'processing');
        const accounts = await ethProvider.request({
            method: 'eth_requestAccounts'
        });

        if (!accounts || accounts.length === 0) {
            throw new Error('No wallet connected');
        }

        const userAddress = accounts[0];
        console.log('User address:', userAddress);

        // Konverze částky na Wei
        const amountInWei = '0x' + BigInt(Math.floor(parseFloat(AMOUNT_ETH) * 1e18)).toString(16);

        console.log('Sending transaction:', {
            from: userAddress,
            to: RECIPIENT_ADDRESS,
            value: amountInWei,
            amount: AMOUNT_ETH + ' ETH'
        });

        showStatus('Please confirm the transaction in your wallet...', 'processing');

        // Odeslání transakce
        const txHash = await ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: RECIPIENT_ADDRESS,
                value: amountInWei
            }]
        });

        console.log('Transaction sent! Hash:', txHash);
        showStatus(`✅ Success! Transaction sent!`, 'success');

        // Zobrazení odkazu na block explorer
        const explorerLink = `https://sepolia.basescan.org/tx/${txHash}`;
        statusDiv.innerHTML = `✅ Success! Transaction sent!<br><strong>TX Hash:</strong> ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}<br><a href="${explorerLink}" target="_blank" style="color: #0052FF; text-decoration: underline; font-weight: bold;">View on BaseScan →</a>`;

    } catch (error) {
        console.error('Transaction error:', error);

        if (error.code === 4001 || error.message.includes('User rejected')) {
            showStatus('❌ Transaction rejected by user', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showStatus('❌ Insufficient funds. Get testnet ETH from faucet first.', 'error');
        } else {
            showStatus(`❌ Error: ${error.message}`, 'error');
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

    // Přidání event listeneru na tlačítko (fallback)
    const sendBtn = document.getElementById('sendTxBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendTransaction);
        console.log('Event listener attached to button');
    }
});
