from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv
import functions_testnet, functions_mainnet

load_dotenv()
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ENDPOINTS (všechny stejné jako předtím)
@app.get("/")
@app.get("/api")
def is_up():
    return {
        "message": "BaseCamp API",
        "status": "running",
        "endpoints": {
            "mainnet_verify": "/api/sme/verify",
            "testnet_verify": "/api/testnet/verify-transaction",
            "messages": "/api/messages"
        }
    }

@app.post("/api/sme/verify")
async def sme_verify(request: Request):
    data = await request.json()
    address_from = data.get("address_from")
    tx_hash = data.get("tx_hash")
    amount = data.get("amount")
    token = data.get("token", "ETH").upper()

    result = functions_mainnet.verify_mainnet_transaction(address_from, tx_hash, token, amount)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("msg"))
    return result

@app.post("/api/testnet/verify-transaction")
async def testnet_verify(request: Request):
    data = await request.json()
    address_from = data.get("address_from")
    address_to = data.get("address_to")
    tx_hash = data.get("tx_hash")
    token = data.get("token", "ETH").upper()
    amount = data.get("amount")

    result = functions_testnet.verify_testnet_transaction(address_from, tx_hash, token, amount)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("msg"))
    return result

@app.post("api/testnet/send-test")
async def testnet_send(request: Request):
    '''
    todo check available funds:
        if 0: return {"success": False, "msg": "Donate testnet funds, i am empty!"}
    check user sent status in DB - true/false
        if false : return {"success": False, "msg": "Already sent you!"}
    connect to wallet
    send 1 USDC on sepolia
    '''

    data = await request.json()
    user_address = data.get("user_address")

    result = functions_testnet.validateAddress(user_address)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("msg"))

    send = functions_testnet.send_testnet(user_address)
    if not send.get("success"):
        raise HTTPException(status_code=400, detail=send.get("msg"))
    #default:
    return {"success": False, "msg": "Not enough funds!"}
    #after getting wallet
    #return send
