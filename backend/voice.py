import sounddevice as sd
import numpy as np
import tempfile
import wave
from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu", compute_type="int8")

SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 0.01   # Tuned for strong Intel mic signal
SILENCE_DURATION = 1.5
MAX_RECORD_SECONDS = 15
MIC_DEVICE = 3             # Intel Microphone Array — confirmed working
GAIN = 1.5                 # Mild boost only, signal already strong

def is_silent(audio_chunk: np.ndarray) -> bool:
    rms = np.sqrt(np.mean(audio_chunk**2))
    return rms < SILENCE_THRESHOLD

def listen() -> str:
    print("[JARVIS] Listening...")

    recorded_chunks = []
    silent_chunks = 0
    started_speaking = False

    chunk_size = int(SAMPLE_RATE * 0.1)
    max_chunks = int(MAX_RECORD_SECONDS / 0.1)

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1,
                        dtype='float32', device=MIC_DEVICE) as stream:
        for _ in range(max_chunks):
            chunk, _ = stream.read(chunk_size)
            chunk = chunk.flatten()

            # Mild boost and clamp
            chunk = np.clip(chunk * GAIN, -1.0, 1.0)

            rms = np.sqrt(np.mean(chunk**2))
            print(f"[MIC RMS] {rms:.5f}", end="\r")

            if not is_silent(chunk):
                started_speaking = True
                silent_chunks = 0
                recorded_chunks.append(chunk)
            else:
                if started_speaking:
                    silent_chunks += 1
                    recorded_chunks.append(chunk)
                    if silent_chunks >= int(SILENCE_DURATION / 0.1):
                        print("\n[JARVIS] Speech ended, transcribing...")
                        break

    if not recorded_chunks or not started_speaking:
        print("\n[JARVIS] No speech detected")
        return ""

    audio_data = np.concatenate(recorded_chunks)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
        with wave.open(tmp_path, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes((audio_data * 32767).astype(np.int16).tobytes())

    segments, _ = model.transcribe(tmp_path, language="en")
    text = " ".join([seg.text for seg in segments]).strip()

    if text:
        print(f"[USER] {text}")
    else:
        print("[JARVIS] Couldn't understand, please speak again")

    return text