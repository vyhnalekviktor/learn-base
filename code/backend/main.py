from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import functions_testnet, functions_mainnet, database
import requests, time

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
BOT_WALLET = os.getenv("BOT_WALLET")

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

    result = functions_testnet.verify_testnet_transaction(address_from, address_to, tx_hash, token, amount)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("msg"))
    return result


#is user eligible for receiving USDC on testnet? did he pay more than withdraw?
# return 0 - ok, 1 - limit reached, 2- error
def eligible_rec(wallet: str):
    sent = database.get_field("USER_INFO", "practice_sent", wallet)
    received = database.get_field("USER_INFO", "practice_received", wallet)

    if sent is None or received is None:
        return 2

    if received >= sent:
       return 1
    return 0

def update_tx(wallet):
    received = database.get_field("USER_INFO", "practice_received", wallet)
    if received is None:
        return False
    status = database.update_field("USER_INFO", "practice_received", wallet, received+1)
    if status is None:
        return False

    bot_bal = database.get_field("MY_WALLET", "balance-USDC", BOT_WALLET)
    if bot_bal is None:
        return False
    status = database.update_field("MY_WALLET", "balance-USDC", BOT_WALLET, bot_bal-1)
    if status is None:
        return False
    return True

@app.post("/api/testnet/send-test")
async def testnet_send(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet!")

    my_wallet_bal = database.get_field("MY_WALLET", "balance-USDC", BOT_WALLET)
    if my_wallet_bal is None:
        return {"success": False, "msg": "Bot wallet row not found in MY_WALLET table"}
    is_eligible = eligible_rec(wallet)

    if is_eligible == 1 or my_wallet_bal < 1:
        return {"success": False, "msg": "Send test USDC first, then withdraw!"}
    elif is_eligible == 2:
        raise HTTPException(status_code=400, detail="Error checking status!")

    result = functions_testnet.validateAddress(wallet)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("msg"))

    result = functions_testnet.try_sending(wallet)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("msg"))

    result = update_tx(wallet)
    if not result:
        raise HTTPException(status_code=400, detail="Error updating trans. count!")

    return {"success": True}

@app.post("/api/database/init-user")
async def api_init_user(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet!")

    result = database.get_user(wallet)
    if result is not None:
        return {"success": True, "created": False}

    response = database.add_user(wallet)
    if response is None:
        raise HTTPException(status_code=500, detail="Error adding user to DB.")

    return {"success": True, "created": True}

@app.post("/api/database/delete-user")
async def api_del_user(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet!")
    response = database.delete_user(wallet)
    if not response:
        raise HTTPException(status_code=500, detail="Error deleting user from DB.")
    return {"success": True}

#returns: ({'wallet': 'test_user', 'id': 18, 'created_at': '2025-12-20T20:16:41.898289+00:00', 'practice_sent': 0, 'practice_received': 0, 'completed_all': False, 'completed_theory': False, 'completed_practice': False}, {'id': 11, 'wallet': 'test_user', 'created_at': '2025-12-20T20:16:41.997225+00:00', 'theory': False, 'faucet': False, 'send': False, 'receive': False, 'mint': False, 'launch': False})
@app.post("/api/database/get-user")
async def get_user(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet!")

    response = database.get_user(wallet)
    if response is None:
        raise HTTPException(status_code=500, detail="Error getting user from DB.")
    info = response[0]
    progress = response[1]
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

    if table_name == "USER_PROGRESS":
        response = database.check_completion(wallet)
        if response is None:
            raise HTTPException(status_code=500, detail="Error checking completion from DB.")

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

#user sent practice USDC to my bot wallet
@app.post("/api/database/practice-sent")
async def practice_sent(request: Request):
    data = await request.json()
    wallet = data.get("wallet")
    if not wallet:
        raise HTTPException(status_code=400, detail="No wallet!")

    u = database.get_field("USER_INFO", "practice_sent", wallet)
    b = database.get_field("MY_WALLET", "balance-USDC", BOT_WALLET)

    if u is None or b is None:
        raise HTTPException(status_code=400, detail="Error getting data from DB.")

    user = database.update_field("USER_INFO", "practice_sent", wallet, u+1)
    bot = database.update_field("MY_WALLET", "balance-USDC", BOT_WALLET, b+1)

    if user is None or bot is None:
        raise HTTPException(status_code=400, detail="Error updating data to DB.")

    return {"success": True}
