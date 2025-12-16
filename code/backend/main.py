from fastapi import FastAPI, Request, HTTPException
from web3 import Web3
import os
import json
from dotenv import load_dotenv
import functions_testnet, functions_mainnet

load_dotenv()
app = FastAPI()

#setup enviroment
NETWORK = os.getenv("NETWORK")

if NETWORK == "mainnet":
    RPC_URL = "https://base.publicnode.com"
    USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

if NETWORK == "testnet":
    RPC_URL = "https://sepolia.base.org"
    USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
if not NETWORK:
    raise ValueError("Network must be set to mainnet or testnet")
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
w3 = Web3(Web3.HTTPProvider(RPC_URL))

#ENDPOINTS
@app.get("/")
def hello_world():
    return {"message": "API up :)"}

@app.get("/api/debug/network")
def debug_network():
    return {
        "connected": w3.is_connected(),
        "chain_id": w3.eth.chain_id,
        "block_number": w3.eth.block_number,
        "provider": str(w3.provider)
    }

usdc_contract = w3.eth.contract(address=Web3.to_checksum_address(USDC_ADDRESS), abi=USDC_ABI)
@app.post("/api/sme/verify")
async def sme_verify(request: Request):
    data = await request.json()
    address_from = data.get("address_from")
    tx_hash = data.get("tx_hash")
    amount = data.get("amount")
    token = data.get("token", "ETH").upper()  # "ETH" or "USDC"

    result = functions_mainnet.verify_mainnet_transaction(address_from, tx_hash, token, amount)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("msg"))
    return result