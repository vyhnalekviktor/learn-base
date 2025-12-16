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

def verify_testnet_transaction(address_from, tx_hash, token, amount):
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

                    found = True
                    break
x
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
