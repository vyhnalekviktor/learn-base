from web3 import Web3
import os
from dotenv import load_dotenv
from eth_account import Account

load_dotenv()

#web3 setup
RPC_URL = "https://base.publicnode.com"
USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

w3 = Web3(Web3.HTTPProvider(RPC_URL))
MY_WALLET = os.getenv("MY_WALLET")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
NFT_CONTRACT_ADDRESS = os.getenv("BATCH1_NFT_ADDRESS")

# Minimalistické ABI jen pro funkci airdrop
NFT_ABI = [{
    "inputs": [{"internalType": "address", "name": "to", "type": "address"}],
    "name": "airdrop",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}]

#USDC transaction requirements
USDC_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
    }
]
usdc_contract = w3.eth.contract(address=Web3.to_checksum_address(USDC_ADDRESS), abi=USDC_ABI)

def verify_mainnet_transaction(address_from, tx_hash, token, amount):
    # catch errors
    if not address_from  or not tx_hash or not token or not amount:
        return {"success": False, "msg": "Missing parameters"}

    if not MY_WALLET:
        return {"success": False, "msg": "MY_WALLET not configured in .env"}

    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if receipt["status"] != 1:
            return {"success": False, "msg": "Transaction failed"}

        # Get transaction details
        tx = w3.eth.get_transaction(tx_hash)

        if token == "ETH":
            if tx['to'].lower() != MY_WALLET.lower():
                return {"success": False, "msg": f"Wrong recipient wallet {tx['to'].lower()}"}

            if tx['from'].lower() != address_from.lower():
                return {"success": False, "msg": "Sender address mismatch"}

            #todo amount check

        elif token == "USDC":
            if tx['to'].lower() != USDC_ADDRESS.lower():
                return {"success": False, "msg": "Not a USDC transaction"}

            # Parse Transfer event from logs
            transfer_events = usdc_contract.events.Transfer().process_receipt(receipt)
            if not transfer_events:
                return {"success": False, "msg": "No USDC transfer found"}

            # Find the right transfer event (to your wallet)
            found = False
            for event in transfer_events:
                if event['args']['to'].lower() == MY_WALLET.lower():
                    # Verify sender
                    if event['args']['from'].lower() != address_from.lower():
                        return {"success": False, "msg": "Sender mismatch"}

                    if event['args']['value'] < int(amount):
                        return {"success": False,
                                "msg": f"Insufficient amount: sent {event['args']['value']}, expected {amount}"}

                    found = True
                    break

            if not found:
                return {"success": False, "msg": "Transfer not to your wallet"}
        else:
            return {"success": False, "msg": "Unsupported token (use ETH or USDC)"}

        return {
            "success": True,
            "verified": True,
            "tx_hash": tx_hash,
            "token": token,
            "block": receipt["blockNumber"]
        }
    except Exception as e:
        return {"success": False, "msg": str(e)}


def mint_nft_to_user(user_address):
    """
    Tato funkce zavolá smart kontrakt a pošle NFT uživateli.
    Gas platí admin (ty), uživatel neplatí nic (už zaplatil USDC bokem).
    """
    if not PRIVATE_KEY or not NFT_CONTRACT_ADDRESS:
        return {"success": False, "msg": "Chybí konfigurace serveru (PK nebo Address)"}

    try:
        # Inicializace kontraktu
        # w3 objekt už v souboru máš definovaný nahoře
        contract = w3.eth.contract(address=Web3.to_checksum_address(NFT_CONTRACT_ADDRESS), abi=NFT_ABI)

        # Admin účet z privátního klíče
        admin_account = Account.from_key(PRIVATE_KEY)

        # Sestavení transakce
        tx = contract.functions.airdrop(user_address).build_transaction({
            'chainId': 8453,  # Base Mainnet
            'gas': 200000,  # Odhad, airdrop je levný
            'maxPriorityFeePerGas': w3.to_wei('0.05', 'gwei'),
            'maxFeePerGas': w3.to_wei('0.05', 'gwei'),
            'nonce': w3.eth.get_transaction_count(admin_account.address),
            'from': admin_account.address
        })

        # Podpis transakce
        signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)

        # Odeslání do sítě
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        # Čekání na potvrzení (aby backend vrátil success až když je hotovo)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        if receipt.status == 1:
            return {"success": True, "tx_hash": tx_hash.hex()}
        else:
            return {"success": False, "msg": "Mint transakce selhala na blockchainu"}

    except Exception as e:
        print(f"Mint Error: {e}")
        return {"success": False, "msg": str(e)}