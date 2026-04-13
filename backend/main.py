from fastapi import FastAPI, WebSocket
from faster_whisper import WhisperModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime
import tempfile
import os
import wave
import sounddevice as sd
import pyttsx3
import queue
import threading
import speech_recognition as sr

# =========================
# APP SETUP
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
model = WhisperModel("base", device="cpu", compute_type="int8")

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

# =========================
# TTS SYSTEM (FIXED)
# =========================
engine = pyttsx3.init()
engine.setProperty('rate', 180)

speech_queue = queue.Queue()

def tts_worker():
    while True:
        text = speech_queue.get()
        if text is None:
            break
        engine.say(text)
        engine.runAndWait()
        speech_queue.task_done()

threading.Thread(target=tts_worker, daemon=True).start()

def speak(text):
    while not speech_queue.empty():
        try:
            speech_queue.get_nowait()
            speech_queue.task_done()
        except:
            break
    speech_queue.put(text)

# =========================
# MIC SYSTEM (NO PYAUDIO NEEDED)
# =========================
recognizer = sr.Recognizer()
recognizer.energy_threshold = 300
recognizer.dynamic_energy_threshold = True

def listen_from_mic():
    print("\n🎤 Listening...")
    fs = 16000
    duration = 4  # seconds

    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()

    # save temporary wav file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        with wave.open(f.name, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(fs)
            wf.writeframes(recording.tobytes())

        segments, _ = model.transcribe(f.name)

        text = ""
        for segment in segments:
            text += segment.text

    if text.strip():
        print("🧑 You said:", text)
        return text
    else:
        print("❌ Couldn't understand")
        return None
# =========================
# MEMORY
# =========================
conversation_history = []
MAX_TURNS = 15
USER_NAME = "Swastik"

active_connections = set()
has_greeted = False

# =========================
# SYSTEM PROMPT
# =========================
def get_system_prompt() -> str:
    hour = datetime.now().hour

    if 5 <= hour < 12:
        time_ctx = "morning"
    elif 12 <= hour < 17:
        time_ctx = "afternoon"
    elif 17 <= hour < 21:
        time_ctx = "evening"
    else:
        time_ctx = "late night"

    return f"""You are JARVIS, a highly intelligent assistant.
User: {USER_NAME}
Time: {time_ctx}

Rules:
- Keep responses SHORT
- Be confident
- Slightly witty
"""

# =========================
# AI RESPONSE
# =========================
def get_response(user_input: str) -> str:
    global conversation_history

    conversation_history.append({
        "role": "user",
        "content": user_input
    })

    if len(conversation_history) > MAX_TURNS * 2:
        conversation_history = conversation_history[-MAX_TURNS * 2:]

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": get_system_prompt()},
            *conversation_history
        ],
    )

    reply = response.choices[0].message.content

    conversation_history.append({
        "role": "assistant",
        "content": reply
    })

    return reply

# =========================
# WEBSOCKET
# =========================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global has_greeted

    await websocket.accept()

    active_connections.add(websocket)
    print("Client connected | Active:", len(active_connections))

    try:
        greeting = f"Good day, {USER_NAME}. How can I assist you?"

        await websocket.send_json({
            "state": "SPEAKING",
            "response": greeting,
            "greeting": True
        })

        if not has_greeted:
            speak(greeting)
            has_greeted = True

        while True:
            user_input = await websocket.receive_text()
            print("User:", user_input)

            await websocket.send_json({"state": "THINKING"})

            reply = get_response(user_input)

            await websocket.send_json({
                "state": "SPEAKING",
                "response": reply
            })

            speak(reply)

    except Exception as e:
        print("WebSocket error:", e)

    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)

        print("Client disconnected | Active:", len(active_connections))


# =========================
# TERMINAL VOICE MODE (DEBUG)
# =========================
if __name__ == "__main__":
    print("🚀 JARVIS Voice Mode Started")

    greeting = f"Good day, {USER_NAME}. How can I assist you?"
    speak(greeting)

    while True:
        user_input = listen_from_mic()

        if not user_input:
            continue

        reply = get_response(user_input)

        print("🤖 JARVIS:", reply)
        speak(reply)