const BACKEND_URL = 'http://localhost:8000';
const YOUR_WALLET = '0xYOUR_WALLET_ADDRESS';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = 8453; // Base mainnet

let userAccount = null;
let isPaid = false;
let coinbaseWallet = null;
let web3 = null;

// Initialize Coinbase Wallet SDK (Base Smart Wallet)
function initCoinbaseWallet() {
    coinbaseWallet = new CoinbaseWalletSDK({
        appName: 'Base Support App',
        appLogoUrl: 'https://your-logo-url.com/logo.png', // Optional
        darkMode: false
    });

    // Connect to Base mainnet
    const ethereum = coinbaseWallet.makeWeb3Provider(
        `https://mainnet.base.org`,
        BASE_CHAIN_ID
    );

    web3 = new Web3(ethereum);

    return ethereum;
}

// Connect Base Wallet (Smart Wallet - no seed phrase!)
async function connectBaseWallet() {
    try {
        const ethereum = initCoinbaseWallet();

        // Request accounts (triggers Base Wallet login)
        const accounts = await ethereum.request({
            method: 'eth_requestAccounts'
        });

        userAccount = accounts[0];

        // Check if on Base network
        const chainId = await ethereum.request({ method: 'eth_chainId' });
        if (parseInt(chainId, 16) !== BASE_CHAIN_ID) {
            // Switch to Base
            await switchToBase(ethereum);
        }

        // Update UI
        document.getElementById('connectBtn').style.display = 'none';
        document.getElementById('walletInfo').style.display = 'block';
        document.getElementById('address').textContent =
            userAccount.substring(0, 6) + '...' + userAccount.substring(38);

        // Enable payment buttons
        document.getElementById('paymentButtons').style.opacity = '1';
        document.getElementById('paymentButtons').style.pointerEvents = 'auto';
        document.getElementById('customPayment').style.opacity = '1';
        document.getElementById('customPayment').style.pointerEvents = 'auto';

        console.log('Base Wallet connected:', userAccount);

        // Listen for disconnection
        ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                userAccount = accounts[0];
                updateAddressDisplay();
            }
        });

    } catch (error) {
        console.error('Connection error:', error);
        alert('Failed to connect Base Wallet');
    }
}

// Switch to Base network
async function switchToBase(ethereum) {
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }], // Base mainnet = 8453 = 0x2105
        });
    } catch (switchError) {
        // Chain not added, add it
        if (switchError.code === 4902) {
            await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x2105',
                    chainName: 'Base',
                    nativeCurrency: {
                        name: 'Ethereum',
                        symbol: 'ETH',
                        decimals: 18
                    },
                    rpcUrls: ['https://mainnet.base.org'],
                    blockExplorerUrls: ['https://basescan.org']
                }]
            });
        }
    }
}

function disconnectWallet() {
    userAccount = null;
    isPaid = false;
    coinbaseWallet = null;
    web3 = null;

    document.getElementById('connectBtn').style.display = 'block';
    document.getElementById('walletInfo').style.display = 'none';

    document.getElementById('paymentButtons').style.opacity = '0.5';
    document.getElementById('paymentButtons').style.pointerEvents = 'none';
    document.getElementById('customPayment').style.opacity = '0.5';
    document.getElementById('customPayment').style.pointerEvents = 'none';

    lockMessageField();
    document.getElementById('status').innerHTML = '';
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

async function donate(amount) {
    if (!userAccount || !web3) {
        alert('Please connect your Base Wallet first!');
        return;
    }

    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = 'Processing payment...';

    try {
        const usdcABI = [{
            "constant": false,
            "inputs": [
                {"name": "_to", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }];

        const usdcContract = new web3.eth.Contract(usdcABI, USDC_ADDRESS);
        const amountInSmallestUnit = Math.floor(parseFloat(amount) * 1000000);

        const tx = await usdcContract.methods
            .transfer(YOUR_WALLET, amountInSmallestUnit)
            .send({ from: userAccount });

        statusDiv.innerHTML = '⏳ Verifying transaction...';

        const response = await fetch(`${BACKEND_URL}/api/sme/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address_from: userAccount,
                tx_hash: tx.transactionHash,
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

function donateCustom() {
    const amount = document.getElementById('customAmount').value;
    if (amount && parseFloat(amount) >= 0.50) {
        donate(amount);
    } else {
        alert('Minimum amount is $0.50');
    }
}

function updateAddressDisplay() {
    if (userAccount) {
        document.getElementById('address').textContent =
            userAccount.substring(0, 6) + '...' + userAccount.substring(38);
    }
}
