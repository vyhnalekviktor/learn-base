from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()

#web3 setup
RPC_URL = "https://sepolia.base.org"
USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

w3 = Web3(Web3.HTTPProvider(RPC_URL))
MY_WALLET = os.getenv("MY_WALLET")

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

def verify_testnet_transaction(address_from, address_to, tx_hash, token, amount):
    # catch errors
    if not address_from or not address_to or not tx_hash or not token or not amount:
        return {"success": False, "msg": "Missing parameters"}

    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if receipt["status"] != 1:
            return {"success": False, "msg": "Transaction failed"}

        # Get transaction details
        tx = w3.eth.get_transaction(tx_hash)

        if token == "ETH":
            if tx['to'].lower() != address_to.lower():
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


# MetaMask sending
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
BOT_WALLET = os.getenv("BOT_WALLET")

ERC20_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
]


def validateAddress(user_address):
    if not user_address:
        return {"success": False, "msg": "Address is required"}

    if not user_address.startswith("0x") or len(user_address) != 42:
        return {"success": False, "msg": "Invalid address format"}

    try:
        w3.to_checksum_address(user_address)
    except:
        return {"success": False, "msg": "Invalid address"}

    return {"success": True}


def try_sending(user_address):
    try:
        # ✅ FIX: Převod na checksum address (vyřeší type error)
        user_checksum = w3.to_checksum_address(user_address)

        account = w3.eth.account.from_key(PRIVATE_KEY)
        faucet_address = account.address

        usdc_contract = w3.eth.contract(address=USDC_ADDRESS, abi=ERC20_ABI)

        # Zkontroluj balance BOT walletu
        balance = usdc_contract.functions.balanceOf(faucet_address).call()
        amount = 1_000000  # 1 USDC (6 decimals)

        if balance < amount:
            return {"success": False, "msg": "Faucet is empty! Please donate testnet USDC."}

        nonce = w3.eth.get_transaction_count(faucet_address)

        # ✅ FIX: Použití checksum address
        transfer_function = usdc_contract.functions.transfer(user_checksum, amount)

        transaction = transfer_function.build_transaction({
            "from": faucet_address,
            "nonce": nonce,
            "gas": 100000,
            "maxFeePerGas": w3.to_wei("2", "gwei"),
            "maxPriorityFeePerGas": w3.to_wei("1", "gwei"),
            "chainId": 84532  # Base Sepolia
        })

        signed_tx = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        return {
            "success": True,
            "msg": "1 USDC sent successfully to Base Sepolia testnet!",
            "txHash": w3.to_hex(tx_hash),
            "from": faucet_address,
            "to": user_checksum,
            "amount": "1 USDC"
        }

    except Exception as e:
        return {"success": False, "msg": f"Transaction failed: {str(e)}"}
