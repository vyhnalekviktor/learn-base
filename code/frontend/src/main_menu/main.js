# Import na začátku souboru
from datetime import datetime

# Messages storage (v produkci použij databázi)
messages = []

@app.post("/api/messages")
async def save_message(request: Request):
    data = await request.json()
    from_address = data.get("from_address")
    message = data.get("message")
    timestamp = data.get("timestamp")

    if not from_address or not message:
        raise HTTPException(status_code=400, detail="Missing fields")

    messages.append({
        "from": from_address,
        "message": message,
        "timestamp": timestamp
    })

    print(f"📩 New message from {from_address}: {message}")

    return {"success": True, "message_count": len(messages)}

@app.get("/api/messages")
def get_messages():
    return {"messages": messages}
