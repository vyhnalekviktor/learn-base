from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv
import functions_testnet, functions_mainnet, database

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

# ENDPOINTS
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

@app.post("/api/testnet/send-test")
async def testnet_send(request: Request):
    # default:
    return {"success": False, "msg": "Friend is busy (not ready)!"}
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

    #after getting wallet
    #return send

@app.post("/api/database/init-user")
async def api_init_user(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet!")

    exists = database.get_user(wallet)[0].get("wallet")
    if exists:
        return {"success": True}

    response = database.add_user(wallet)
    if response.get("message"):
        raise HTTPException(status_code=400, detail="Error adding user to DB.")

    return {"success": True}

@app.post("/api/database/delete-user")
async def api_del_user(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet!")
    response = database.remove_user(wallet)
    if not response:
        raise HTTPException(status_code=400, detail="Error deleting user from DB.")
    return {"success": True}

#returns: ({'wallet': 'test_user', 'id': 18, 'created_at': '2025-12-20T20:16:41.898289+00:00', 'practice_sent': 0, 'practice_received': 0, 'completed_all': False, 'completed_theory': False, 'completed_practice': False}, {'id': 11, 'wallet': 'test_user', 'created_at': '2025-12-20T20:16:41.997225+00:00', 'theory': False, 'faucet': False, 'sending': False, 'receiving': False, 'mint': False, 'launch': False})
@app.post("/api/database/get-user")
async def get_user(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet!")

    info, progress = database.get_user(wallet)
    if not info or not progress:
        raise HTTPException(status_code=400, detail="Error getting user from DB.")
    return {"success": True, "info": info, "progress": progress}

@app.post("/api/database/update_field")
async def update_field(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    table_name = data.get("table_name")
    field_name = data.get("field_name")
    value = data.get("value")

    if not wallet or not table_name or not field_name or value is None:
        raise HTTPException(status_code=400, detail="Invalid parameters!")

    response = database.update_field(table_name, field_name, wallet, value)
    if not response:
        raise HTTPException(status_code=400, detail="Error updating field in DB.")
    return {"success": True}

@app.post("/api/database/get-field")
async def get_field(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    table_name = data.get("table_name")
    field_name = data.get("field_name")
    if not wallet or not table_name or not field_name:
        raise HTTPException(status_code=400, detail="Invalid parameters!")

    response = database.get_field(table_name, field_name, wallet)
    if response is None:
        raise HTTPException(status_code=400, detail="Error getting field from DB.")
    return {"success": True, "value": response}


#is user eligible for receiving USDC on testnet? did he pay more than withdraw?
@app.post("/api/database/eligible-rec")
async def eligible_rec(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet!")

    sent = database.get_field("USER_INFO", "practice_sent", "wallet")
    received = database.get_field("USER_INFO", "practice_received", "wallet")

    if not sent or not received:
        raise HTTPException(status_code=400, detail="Error getting user data from DB.")

    if received >= sent:
       return {"success":True, "eligible": False}
    return {"success":True, "eligible":True}

