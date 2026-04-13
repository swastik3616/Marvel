import pyttsx3

engine = pyttsx3.init()

# Set a natural voice
voices = engine.getProperty('voices')
engine.setProperty('voice', voices[0].id)  # 0=male, 1=female
engine.setProperty('rate', 175)
engine.setProperty('volume', 1.0)

def speak(text: str):
    print(f"[JARVIS] {text}")
    engine.say(text)
    engine.runAndWait()