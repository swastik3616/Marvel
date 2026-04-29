<div align="center">
  <img src="https://img.shields.io/badge/JARVIS-AI%20Assistant-00e5ff?style=for-the-badge&logo=openai" alt="JARVIS AI" />
  <h1>J.A.R.V.I.S. AI Assistant</h1>
  <p><i>"The most advanced voice-activated desktop AI assistant, inspired by Stark Industries."</i></p>

  [![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
</div>

---

J.A.R.V.I.S. (Just A Rather Very Intelligent System) is a state-of-the-art desktop AI assistant. Built with a high-performance Python backend and a futuristic Electron + React frontend, it offers real-time voice interaction, deep Windows integration, and a sophisticated command center for your digital life.

## ✨ Key Features

- 🧠 **LLaMA 3.1 Powered Intelligence**: Lightning-fast responses via Groq's high-speed inference engine.
- 🎙️ **Holographic Voice UI**: A stunning dashboard with dynamic visualizations that react to your voice.
- 💬 **Native WhatsApp Integration**: Intercepts, reads, and replies to WhatsApp messages via voice and automated OS macros.
- 📧 **Gmail Monitoring**: Real-time email notifications with voice-based "Read/Ignore" capabilities.
- 📊 **System Insight**: Live telemetry of your PC’s CPU, RAM, Disk, and Battery health.
- 🔔 **Voice Reminders**: Set time-based alerts using natural language (e.g., *"Remind me to check the oven in 10 minutes"*).
- 🎵 **Spotify Dashboard**: Integrated music control with live track metadata and playback synchronization.
- 🌍 **Context Aware**: Automatic timezone, location, and weather updates.

---

## 🏗️ Tech Stack

### Frontend
- **Frameworks:** Electron, React 18
- **Styling:** Vanilla CSS (Glassmorphism), Framer Motion
- **Visuals:** HTML5 Canvas API (Orb & Wave visualizers)

### Backend
- **Server:** FastAPI (Asynchronous Python 3.10+)
- **AI/LLM:** Groq LLaMA 3.1 8B / 70B
- **Automation:** Python-WinRT, PyAutoGUI, Pyperclip
- **Hardware Stats:** psutil
- **Audio:** Faster Whisper (STT), pyttsx3 (TTS), SpeechRecognition

---

## 📂 Project Structure

```text
.
├── backend/
│   ├── main.py                    # FastAPI server & WebSocket orchestration
│   ├── ai_engine.py               # LLM integration & memory management
│   ├── reminders.py               # Background timer & notification loop
│   ├── spotify.py                 # Spotify Web API playback controls
│   ├── notification_listener.py   # WinRT Toast notification interceptor
│   ├── whatsapp_reply.py          # OS-level automated messaging logic
│   ├── voice.py                   # Speech-to-text pipeline
│   ├── weather.py                 # Real-time meteorological data
│   └── location.py                # Geolocation services
│
└── frontend/
    ├── electron.js                  # Desktop container entry point
    └── src/                         # React Application (Dashboard & Panels)
```

---

## 🚀 Installation & Setup

### 1. Backend Configuration
1. Navigate to `backend/` and create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
2. Configure your `.env` file:
   ```ini
   GROQ_API_KEY=your_key_here
   SPOTIPY_CLIENT_ID=your_spotify_id
   SPOTIPY_CLIENT_SECRET=your_spotify_secret
   SPOTIPY_REDIRECT_URI=http://localhost:8888/callback
   ```
3. Launch the server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend Launch
1. Navigate to `frontend/`:
   ```bash
   npm install
   npm start
   ```

---

## 🗣️ Voice Commands

| Feature | Commands |
| :--- | :--- |
| **Assistant** | *"Hey Jarvis..."*, *"Are you there?"* |
| **WhatsApp** | *"Read it"*, *"Ignore"*, *"Reply [message]"* |
| **Gmail** | *"Read the email"*, *"Dismiss"* |
| **Reminders** | *"Remind me to [task] in [X] minutes/seconds"* |
| **Spotify** | *"Play music"*, *"Pause"*, *"Next song"*, *"Previous"* |
| **Weather** | *"What's the weather like?"*, *"Is it raining?"* |

---

## 🗺️ Roadmap & Future
- [ ] **Local LLM Support**: Support for Ollama/Llama.cpp fallbacks.
- [ ] **Calendar Integration**: Outlook & Google Calendar sync.
- [ ] **Multi-Turn Voice**: Continuous conversation without repeating the wake word.
- [ ] **Cross-Platform**: Expansion to macOS and Linux.

<div align="center">
  <p>Built with ❤️ by <b>Swastik</b></p>
</div>
