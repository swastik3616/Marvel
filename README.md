# J.A.R.V.I.S. AI Assistant

A powerful, voice-activated desktop AI assistant inspired by Iron Man's J.A.R.V.I.S., built with a modern web stack and a high-performance Python backend. This assistant features real-time voice streaming, conversational memory, and deep native Windows integration for features like answering WhatsApp messages directly from the desktop.

## 🚀 Features

- **Conversational AI**: Powered by Groq's blazing-fast inference (Llama 3.1) for instant, intelligent responses.
- **Real-Time Voice UI**: Sleek, modern Electron + React frontend with Framer Motion animations that visualizes processing, listening, and speaking states.
- **WhatsApp Integration (Windows native)**: Uses Windows Runtime (WinRT) to intercept incoming WhatsApp desktop notifications, read them aloud, and uses automation to reply seamlessly.
- **Voice Interactions**: Fast local voice processing using SpeechRecognition and Faster Whisper, combined with pyttsx3 for voice generation.
- **Streaming WebSockets**: Fast, low-latency bidirectional communication between the app UI and the Python backend to stream LLM tokens as they are generated.
- **Personalized Context**: Time-aware greetings and contextual awareness tailored to the user.

## 🛠️ Tech Stack

### Frontend (Desktop App)
- **Electron**: Cross-platform desktop application packaging.
- **React 18**: Component-based UI framework.
- **TailwindCSS**: Utility-first CSS framework for a sleek, responsive design.
- **Framer Motion**: Smooth, dynamic UI animations reflecting the AI's state.

### Backend (AI Engine & System Integration)
- **FastAPI & Uvicorn**: High-performance asynchronous Python web backend.
- **WebSockets**: Real-time communication with the frontend.
- **Groq API**: Lightning-fast LLM inference via the `openai` Python client.
- **Python-WinRT**: Deep integration with Windows 10/11 notification centers (Toast Notifications).
- **Faster Whisper & SpeechRecognition**: High-accuracy local speech-to-text.
- **PyAutoGUI & Pyperclip**: OS-level automation for sending WhatsApp replies.

## 📂 Project Structure

```
.
├── backend/
│   ├── main.py                    # Core FastAPI server and WebSocket handler
│   ├── ai_engine.py               # Groq LLM integration
│   ├── notification_listener.py   # WinRT WhatsApp toast notification interceptor
│   ├── whatsapp_reply.py          # Automated WhatsApp reply logic
│   ├── voice.py                   # Speech-to-text and voice command handling
│   ├── tts.py                     # Text-to-speech engine
│   └── requirements.txt           # Python dependencies
│
└── frontend/
    ├── electron.js                  # Electron main process
    ├── src/                         # React UI components (Dashboard, Voice Visualizer)
    ├── tailwind.config.js           # Tailwind UI configurations
    └── package.json                 # Node dependencies
```

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)
- **Windows 10/11** (Required for native notification features)
- **Groq API Key**

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```INI
GROQ_API_KEY=your_groq_api_key_here
```

Start the Backend Server:
```bash
uvicorn main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Start the Electron App:
```bash
npm start
```

## 🧠 How it Works

1. **Wake Word & Speech**: The frontend connects to the backend via WebSockets. The system listens for voice input (or text commands).
2. **AI Processing**: Input is routed to Groq API. The response is streamed token-by-token back to the React UI, triggering "speaking" animations.
3. **WhatsApp Listener**: In the background, `notification_listener.py` hooks into the Windows Notification service. When a WhatsApp message arrives, it deduplicates it and sends it directly to the UI, allowing the user to seamlessly ask J.A.R.V.I.S. to "Reply".
4. **Automation**: If a reply is triggered, `whatsapp_reply.py` automatically handles finding the chat and sending the text via secure OS-level commands.

## 🚀 Future Roadmap

- [ ] Complete local LLM fallback support.
- [ ] Expanded integration with other desktop apps (Spotify, Calendar).
- [ ] Improved multi-turn continuous conversation mode without wake words.
