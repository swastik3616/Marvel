from fastapi import FastAPI, WebSocket
from faster_whisper import WhisperModel
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketDisconnect
from openai import OpenAI
import numpy as np
from dotenv import load_dotenv
from datetime import datetime
import tempfile
import os
import time
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
is_speaking = False

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)
print(sd.query_devices())
# =========================
# TTS SYSTEM (FIXED)
# =========================
engine = pyttsx3.init()
engine.setProperty('rate', 180)

speech_queue = queue.Queue()

def tts_worker():
    global is_speaking

    while True:
        text = speech_queue.get()
        if text is None:
            break

        try:
            is_speaking = True

            engine.say(text)
            engine.runAndWait()

        except Exception as e:
            print("TTS error:", e)

        finally:
            is_speaking = False   # 🔥 ALWAYS RESET

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
    global is_speaking

    time.sleep(0.5)

    print("\n🎤 Listening...")
    device_info = sd.query_devices(16, 'input')
    fs = int(device_info['default_samplerate'])

    print("Using sample rate:", fs)

    fs = 44100
    duration = 6

    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='float32',device=9)
    sd.wait()
    print("⏹️ Recording complete")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        with wave.open(f.name, 'wb') as wf:
            wf.setnchannels(1)
            audio_int16 = (recording * 32767).astype(np.int16)
            wf.setsampwidth(2)
            wf.setframerate(fs)
            wf.writeframes(audio_int16.tobytes())


        segments, _ = model.transcribe(f.name, beam_size=5)

        text = ""
        for segment in segments:
            text += segment.text

        print("RAW TEXT:", text)

    return text if text.strip() else None

    text = text.strip().lower()

    if text in ["", "you", "yeah", "uh", "hmm"]:
        return None

    print("🧑 You said:", text)
    return text
# =========================
# MEMORY
# =========================
conversation_history = []
MAX_TURNS = 15
USER_NAME = "Swastik"


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
has_greeted = False   # ✅ GLOBAL

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global has_greeted

    await websocket.accept()
    print("Client connected")

    try:
        greeting = f"Good day, Swastik. How can I assist you?"

        if not has_greeted:
            await websocket.send_json({
                "state": "SPEAKING",
                "response": greeting,
                "greeting": True
            })
            has_greeted = True

        while True:
            user_input = await websocket.receive_text()

            print("User:", user_input)

            reply = get_response(user_input)

            await websocket.send_json({
                "state": "SPEAKING",
                "response": reply
            })

    except WebSocketDisconnect:
        print("🔌 Client disconnected (normal)")

    except Exception as e:
        print("❌ Error:", e)
# =========================
# TERMINAL VOICE MODE (DEBUG)
# =========================
if __name__ == "__main__":
    print("🚀 JARVIS Voice Mode Started")

    greeting = f"Good day, {USER_NAME}. How can I assist you?"

    while True:
        print("🔁 Loop running...")
        print("is_speaking:", is_speaking)

        user_input = listen_from_mic()

        if not user_input:
            time.sleep(0.5)
            continue

        reply = get_response(user_input)

        print("🤖 JARVIS:", reply)

        time.sleep(0.3)