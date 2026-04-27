<div align="center">
  <img src="https://img.shields.io/badge/JARVIS-AI%20Assistant-00e5ff?style=for-the-badge&logo=openai" alt="JARVIS AI" />
  <h1>J.A.R.V.I.S. AI Assistant</h1>
  <p><i>A powerful, voice-activated desktop AI assistant inspired by Iron Man's J.A.R.V.I.S.</i></p>

  [![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
</div>

<br />

J.A.R.V.I.S. is a next-generation desktop AI assistant built with a modern web stack and a high-performance Python backend. It features **real-time voice streaming**, **conversational memory**, and **deep native Windows integration**, allowing you to interact seamlessly with your desktop applications like WhatsApp directly through voice.

---

## ✨ Key Features

- 🧠 **Lightning-Fast Conversational AI**: Powered by **Groq's LLaMA 3.1 8B**, delivering instant, intelligent responses.
- 🎙️ **Real-Time Voice UI**: A sleek, modern **Electron + React** frontend featuring dynamic Framer Motion animations that visualize processing, listening, and speaking states.
- 💬 **Native WhatsApp Integration**: Utilizes Windows Runtime (WinRT) to intercept incoming WhatsApp desktop notifications, read them aloud, and use intelligent automation to reply seamlessly without lifting a finger.
- 🗣️ **Local Voice Processing**: Fast, high-accuracy speech-to-text using `SpeechRecognition` and `Faster Whisper`, combined with real-time text-to-speech generation via `pyttsx3`.
- ⚡ **Streaming WebSockets**: Low-latency, bidirectional WebSocket connection ensures the UI remains responsive, streaming LLM tokens live as they are generated.
- 🌍 **Personalized Context & Awareness**: Time-aware greetings, timezone tracking, and dynamic geolocation awareness built right in.

---

## 🏗️ Architecture & Tech Stack

### Frontend (Desktop Client)
- **Frameworks:** Electron, React 18
- **Styling & UI:** TailwindCSS, Vanilla CSS, Canvas API (for performance-critical data visualizations)
- **Animations:** Framer Motion

### Backend (AI Engine & OS Integrations)
- **Core Server:** FastAPI & Uvicorn (Asynchronous Python)
- **Communication:** WebSockets
- **AI / LLM:** Groq API (via `openai` Python client)
- **OS Integration:** Python-WinRT (Windows 10/11 Toast Notifications), PyAutoGUI, Pyperclip
- **Audio Processing:** Faster Whisper, SpeechRecognition, Pyttsx3

---

## 📂 Project Structure

```text
.
├── backend/
│   ├── main.py                    # Core FastAPI server and WebSocket handler
│   ├── ai_engine.py               # Groq LLM integration logic
│   ├── notification_listener.py   # WinRT WhatsApp toast notification interceptor
│   ├── whatsapp_reply.py          # OS-level automated WhatsApp reply logic
│   ├── voice.py                   # Speech-to-text and voice command handling
│   ├── location.py                # Geolocation fetcher
│   ├── tts.py                     # Text-to-speech engine wrapper
│   └── requirements.txt           # Python dependencies
│
└── frontend/
    ├── electron.js                  # Electron main process entry point
    ├── src/                         # React UI components (Dashboard, Visualizers)
    ├── tailwind.config.js           # Tailwind UI configurations
    └── package.json                 # Node dependencies
```

---

## 🚀 Getting Started

### Prerequisites

To run this application locally, you'll need the following installed:
- **Node.js** (v18 or higher)
- **Python** (3.10 or higher)
- **Windows 10/11** (Required for WinRT native notification features)
- **Groq API Key** (Get one at [Groq's Console](https://console.groq.com/))

### 1. Backend Setup

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory and configure your Groq API Key:
```ini
GROQ_API_KEY=your_groq_api_key_here
```

Start the backend API server:
```bash
uvicorn main:app --reload
```

### 2. Frontend Setup

Open a new terminal window and navigate to the `frontend/` directory:

```bash
cd frontend
npm install
```

Start the Electron React application:
```bash
npm start
```

---

## 🧠 How It Works

1. **Wake & Listen:** The frontend connects to the backend via WebSockets. It constantly listens for the wake word using localized native speech recognition.
2. **AI Inference & Streaming:** Once triggered, the voice query is resolved and routed to the Groq API. The response is streamed token-by-token back to the React UI, instantly animating the visualizer.
3. **Deep OS Hooks:** In the background, `notification_listener.py` hooks directly into the Windows Notification service. When a WhatsApp message arrives, it intercepts the toast notification, deduplicates it, and relays it to the frontend via the WebSocket connection.
4. **Seamless Automation:** If the user opts to "Reply," `whatsapp_reply.py`, `gmail_reply` automatically pinpoints the chat window and relays the dictated text via secure OS-level macro commands.

---

## 🗺️ Roadmap

- [ ] Add explicit local LLM fallback support (e.g., Ollama or Llama.cpp) when internet is unavailable.
- [ ] Expand desktop integrations (Spotify controls, Outlook Calendar syncing).
- [ ] Improve continuous conversation multi-turn mode without requiring the wake word every time.
- [ ] Mac/Linux support for basic interaction (excluding WinRT-specific modules).

---

<div align="center">
  <p>Built with ❤️ by Swastik</p>
</div>
