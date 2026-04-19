from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketDisconnect
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import tzlocal
from datetime import datetime
import time
import requests
import os
import asyncio
import hashlib
from location import get_geolocation

# =========================
# SETUP
# =========================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

# =========================
# GEOLOCATION STATE
# =========================
current_location = "Unknown (Fetching...)"

@app.on_event("startup")
async def startup_event():
    global current_location
    current_location = await asyncio.to_thread(get_geolocation)
    print(f"[JARVIS] Startup complete. Location: {current_location}")

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

# =========================
# MEMORY
# =========================
conversation_history = []
MAX_TURNS = 8  # smaller = faster API calls
USER_NAME = "Swastik"

# =========================
# CONNECTED CLIENTS REGISTRY
# (used by /notification to broadcast to all WebSocket clients)
# =========================
connected_clients: set[WebSocket] = set()

# =========================
# NOTIFICATION STATE
# (stores the latest WhatsApp notification)
# =========================
latest_notification: dict = {
    "sender": None,
    "message": None,
    "id": None,          # SHA-256 hash for deduplication
    "timestamp": None,
}

# =========================
# PYDANTIC MODELS
# =========================
class NotificationPayload(BaseModel):
    sender: str
    message: str
    app: str = "WhatsApp"

class ReplyPayload(BaseModel):
    message: str

# =========================
# GREETING
# =========================
def get_greeting() -> str:
    hour = datetime.now().hour
    greetings = {
        "morning": [
            f"Good morning, {USER_NAME}! Hope you slept well. What are we building today?",
            f"Rise and shine, {USER_NAME}. All systems are online. What's the plan?",
            f"Morning, {USER_NAME}. I've been waiting. What do you need from me today?",
        ],
        "afternoon": [
            f"Good afternoon, {USER_NAME}. Hope the day's treating you well. What do you need?",
            f"Hey {USER_NAME}, afternoon check-in. What are we working on?",
            f"Good afternoon. Systems running smooth, {USER_NAME}. What's up?",
        ],
        "evening": [
            f"Good evening, {USER_NAME}. Long day? What can I do for you?",
            f"Evening, {USER_NAME}. Still going strong I see. What do you need?",
            f"Hey {USER_NAME}, good evening. Ready when you are.",
        ],
        "night": [
            f"Burning the midnight oil again, {USER_NAME}? What do you need?",
            f"Late night session, {USER_NAME}. I'm here. What's on your mind?",
            f"Still up, {USER_NAME}? Alright, I've got you. What do you need?",
        ],
    }

    import random
    if 5 <= hour < 12:
        return random.choice(greetings["morning"])
    elif 12 <= hour < 17:
        return random.choice(greetings["afternoon"])
    elif 17 <= hour < 21:
        return random.choice(greetings["evening"])
    else:
        return random.choice(greetings["night"])

# =========================
# SYSTEM PROMPT
# =========================
def get_system_prompt() -> str:
    now = datetime.now().astimezone()
    
    exact_time = now.strftime("%I:%M:%S %p")
    timezone_name = str(now.tzinfo)
    full_date = now.strftime("%d %B %Y")

    return f"""
You are JARVIS, a highly intelligent AI assistant.

User's name: Swastik
Current Date: {full_date}
Current Exact Time: {exact_time}
Current Timezone: {timezone_name}
Current Location: {current_location}

Rules:
- Give accurate time when asked
- Never guess another timezone
- Keep replies short and smart
- Use real current location and time only
"""
    hour = datetime.now().hour
    if 5 <= hour < 12:
        time_ctx = "morning"
    elif 12 <= hour < 17:
        time_ctx = "afternoon"
    elif 17 <= hour < 21:
        time_ctx = "evening"
    else:
        time_ctx = "late night"

    return f"""You are JARVIS, a highly intelligent, witty, and loyal AI assistant inspired by Iron Man's JARVIS.
User's name: {USER_NAME}
Current time: {time_ctx}
Current Location: {current_location}

Personality rules:
- Address {USER_NAME} by name occasionally — naturally, not every sentence
- Keep responses SHORT and punchy — max 2-3 sentences for voice output
- Be confident, sharp, slightly witty — like a genius butler
- Reference time of day naturally when relevant
- Never say "As an AI" — just handle it like JARVIS would
- If asked what's new or for updates, give a brief helpful summary"""

# =========================
# AI RESPONSE (STREAMING)
# =========================
async def stream_response(user_input: str, websocket: WebSocket):
    global conversation_history

    conversation_history.append({"role": "user", "content": user_input})
    if len(conversation_history) > MAX_TURNS * 2:
        conversation_history = conversation_history[-MAX_TURNS * 2:]

    # Run the blocking Groq streaming call in a thread
    def make_stream():
        return client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": get_system_prompt()},
                *conversation_history
            ],
            max_tokens=120,
            temperature=0.7,
            stream=True,
        )

    stream = await asyncio.to_thread(make_stream)

    full_reply = ""
    buffer = ""
    first_chunk = True

    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if not delta:
            continue

        buffer += delta
        full_reply += delta

        # On the very first chunk, switch UI to SPEAKING immediately
        if first_chunk:
            first_chunk = False
            await websocket.send_json({"state": "SPEAKING"})

        # Send a sentence as soon as we hit a punctuation boundary
        while True:
            sent_end = -1
            for punct in ['. ', '! ', '? ', '.\n', '!\n', '?\n']:
                idx = buffer.find(punct)
                if idx != -1 and (sent_end == -1 or idx < sent_end):
                    sent_end = idx + len(punct)

            if sent_end == -1:
                break  # No complete sentence yet, keep buffering

            sentence = buffer[:sent_end].strip()
            buffer = buffer[sent_end:]
            if sentence:
                await websocket.send_json({
                    "state": "SPEAKING",
                    "response": sentence,
                })

    # Send any remaining text that didn't end with punctuation
    if buffer.strip():
        await websocket.send_json({
            "state": "SPEAKING",
            "response": buffer.strip(),
        })

    conversation_history.append({"role": "assistant", "content": full_reply})
    print(f"[JARVIS] {full_reply}")

# =========================
# BROADCAST HELPER
# =========================
async def broadcast(payload: dict):
    """Send a JSON message to all connected WebSocket clients."""
    dead = set()
    for ws in connected_clients:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.add(ws)
    connected_clients.difference_update(dead)

# =========================
# NOTIFICATION ENDPOINT
# Called by notification_listener.py
# =========================
@app.post("/notification")
async def receive_notification(payload: NotificationPayload):
    global latest_notification

    # Deduplication — hash of sender+message
    notif_id = hashlib.sha256(
        f"{payload.sender.strip().lower()}|{payload.message.strip().lower()}".encode()
    ).hexdigest()

    if notif_id == latest_notification.get("id"):
        return {"status": "duplicate", "skipped": True}

    # Store latest notification
    latest_notification = {
        "sender": payload.sender,
        "message": payload.message,
        "id": notif_id,
        "timestamp": datetime.now().isoformat(),
    }

    print(f"[NOTIF] New: {payload.sender}: {payload.message[:60]}")

    # Broadcast to all connected frontend clients
    await broadcast({
        "type": "whatsapp_notification",
        "sender": payload.sender,
        "message": payload.message,
        "timestamp": latest_notification["timestamp"],
    })

    return {"status": "ok", "notif_id": notif_id}

# =========================
# REPLY ENDPOINT
# Called when user says "reply ..."
# =========================
@app.post("/reply")
async def send_reply(payload: ReplyPayload):
    try:
        from whatsapp_reply import send_whatsapp_reply
        result = await asyncio.to_thread(send_whatsapp_reply, payload.message)
        if result.get("success"):
            print(f"[REPLY] Sent: {payload.message}")
            return {"status": "sent"}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Reply failed"))
    except ImportError:
        raise HTTPException(status_code=500, detail="whatsapp_reply module not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# NOTIFICATION STATE ENDPOINT
# Lets frontend fetch current notification
# =========================
@app.get("/notification/latest")
async def get_latest_notification():
    return latest_notification

# =========================
# WEBSOCKET
# =========================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    has_greeted = False
    await websocket.accept()
    connected_clients.add(websocket)
    print("[JARVIS] Client connected")

    try:
        if not has_greeted:
            greeting_text = get_greeting()
            has_greeted = True
            await websocket.send_json({
                "state": "SPEAKING",
                "response": greeting_text,
                "greeting": True
            })
            print(f"[JARVIS] Greeting sent: {greeting_text}")

        while True:
            try:
                user_input = await websocket.receive_text()
                print(f"[USER] {user_input}")

                # ── Notification command handling ──────────────────────────
                if user_input.startswith("__notification_cmd__"):
                    cmd = user_input[len("__notification_cmd__"):]

                    if cmd == "read":
                        # Speak the stored message
                        msg = latest_notification.get("message")
                        sender = latest_notification.get("sender")
                        if msg and sender:
                            await websocket.send_json({
                                "state": "SPEAKING",
                                "response": f"{sender} says: {msg}",
                                "notification_action": "read",
                            })
                        else:
                            await websocket.send_json({
                                "state": "SPEAKING",
                                "response": "I don't have a notification stored right now.",
                                "notification_action": "read",
                            })

                    elif cmd == "ignore":
                        # Acknowledge and clear
                        await websocket.send_json({
                            "state": "SPEAKING",
                            "response": "Notification ignored. I'll let it slide.",
                            "notification_action": "ignored",
                        })

                    elif cmd.startswith("reply:"):
                        reply_text = cmd[len("reply:"):]
                        if reply_text.strip():
                            try:
                                from whatsapp_reply import send_whatsapp_reply
                                result = await asyncio.to_thread(
                                    send_whatsapp_reply, reply_text.strip()
                                )
                                if result.get("success"):
                                    await websocket.send_json({
                                        "state": "SPEAKING",
                                        "response": f"Reply sent: \"{reply_text.strip()}\"",
                                        "notification_action": "replied",
                                    })
                                else:
                                    await websocket.send_json({
                                        "state": "SPEAKING",
                                        "response": "I couldn't send that reply. WhatsApp Desktop may not be open.",
                                        "notification_action": "reply_failed",
                                    })
                            except Exception as e:
                                await websocket.send_json({
                                    "state": "SPEAKING",
                                    "response": "Reply failed due to a system error.",
                                    "notification_action": "reply_failed",
                                })
                        else:
                            await websocket.send_json({
                                "state": "SPEAKING",
                                "response": "What should I reply?",
                            })
                    continue  # don't send notification cmds to AI
                # ──────────────────────────────────────────────────────────

                await websocket.send_json({
                    "state": "PROCESSING",
                    "user": user_input
                })

                await stream_response(user_input, websocket)

            except WebSocketDisconnect:
                print("[JARVIS] Client disconnected")
                break
            except Exception as e:
                print(f"[API ERROR] {e}")
                await websocket.send_json({
                    "state": "SPEAKING",
                    "response": "I encountered an error processing that. My apologies."
                })

    except Exception as e:
        print(f"[FATAL ERROR] {e}")
    finally:
        connected_clients.discard(websocket)

# =========================
# HEALTH CHECK
# =========================
@app.get("/health")
def health():
    return {
        "status": "JARVIS online",
        "user": USER_NAME,
        "notification_active": latest_notification.get("sender") is not None,
    }