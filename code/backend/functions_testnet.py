from fastapi import FastAPI, Request, HTTPException
from web3 import Web3
import os
import json
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

# todo sent addresses DB
sent_addresses = set()

def validateAddress(user_address):
    if not user_address:
        return {"success": False, "msg": "Address is required"}

    if not user_address.startswith("0x") or len(user_address) != 42:
        return {"success": False, "msg": "Invalid address format"}

    try:
        user_address = w3.to_checksum_address(user_address)
    except:
        return {"success": False, "msg": "Invalid address"}

    if user_address in sent_addresses:
        return {"success": False, "msg": "Already sent you USDC! Try sending something in previous step :)."}

    return {"success": True}

def try_sending(user_address):
    try:
        account = w3.eth.account.from_key(PRIVATE_KEY)
        faucet_address = account.address

        usdc_contract = w3.eth.contract(address=USDC_ADDRESS, abi=ERC20_ABI)

        balance = usdc_contract.functions.balanceOf(faucet_address).call()

        amount = 1_000000

        if balance < amount:
            return {"success": False, "msg": "Faucet is empty! Please donate testnet USDC."}

        nonce = w3.eth.get_transaction_count(faucet_address)

        transfer_function = usdc_contract.functions.transfer(user_address, amount)

        transaction = transfer_function.build_transaction({
            "from": faucet_address,
            "nonce": nonce,
            "gas": 100000,
            "maxFeePerGas": w3.to_wei("2", "gwei"),
            "maxPriorityFeePerGas": w3.to_wei("1", "gwei"),
            "chainId": 84532
        })

        signed_tx = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        sent_addresses.add(user_address)

        return {
            "success": True,
            "msg": "USDC sent successfully!",
            "txHash": w3.to_hex(tx_hash)
        }

    except Exception as e:
        return {"success": False, "msg": f"Transaction failed: {str(e)}"}