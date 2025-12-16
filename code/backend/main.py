from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv
import functions_testnet, functions_mainnet

load_dotenv()
app = FastAPI()

# ✅ CORS pro Vercel - povolí requesty z frontendu
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Pro production omez na svou doménu
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (při restartu se vymažou)
messages = []

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

@app.post("/api/messages")
async def save_message(request: Request):
    data = await request.json()
    from_address = data.get("from_address")
    message = data.get("message")
    timestamp = data.get("timestamp")

    if not from_address or not message:
        raise HTTPException(status_code=400, detail="Missing from_address or message")

    messages.append({
        "from": from_address,
        "message": message,
        "timestamp": timestamp or datetime.utcnow().isoformat()
    })

    print(f"New message from {from_address}: {message}")

    return {"success": True, "message_count": len(messages)}

@app.get("/api/messages")
def get_messages():
    return {"messages": messages, "count": len(messages)}

from mangum import Mangum
handler = Mangum(app)
