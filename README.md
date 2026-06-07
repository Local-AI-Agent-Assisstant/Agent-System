<div align="center">

<h1> Agent System </h1>

<p><em>A fully local, privacy-first AI assistant with voice, vision, and deep system control</em></p>

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.120-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-28-47848F?style=for-the-badge&logo=electron&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

</div>

---

## 📌 Overview

**Agent System** is an integrated, fully local AI agent platform that combines a Python-based MCP (Model Context Protocol) server with a modern React + Electron frontend. It gives you a powerful conversational AI that can see, hear, speak, and control your entire computer — all without sending a single byte to the cloud.

The system is built around [Ollama](https://ollama.com/) for local LLM inference and is designed to be extended with custom tools, routines, and voice providers.

---

## ✨ Key Features

### 🧠 AI & Reasoning
- **Local LLM inference** via Ollama — runs entirely on your machine
- **Streaming responses** with Server-Sent Events (SSE) for a fluid, real-time experience
- **Deep Thinking** (`deep_think`) — triggers extended chain-of-thought reasoning for complex tasks
- **Deep Search** — web-aware research tool powered by DuckDuckGo

### 🎙️ Full Voice Pipeline
- **Real-time Speech-to-Text** using OpenAI Whisper (streaming `tiny.en` + final `small.en` pass)
- **Voice Activity Detection (VAD)** via Silero for precise speech boundary detection
- **Neural Text-to-Speech** via Piper TTS with multiple voice models
- **Bidirectional WebSocket voice stream** (`/ws/voice`) — send audio, receive speech back
- **On-demand model warmup** to eliminate cold-start latency

### 🖥️ System Control & Automation
| Tool | Capability |
|------|-----------|
| `system_commands_windows` | Run shell commands, scripts, and terminal operations |
| `open_program` / `close_program` | Launch and terminate any application |
| `computer_control` | GUI automation via UI Automation (click, type, navigate) |
| `filesystem` | Read, write, and manage files within a safe sandbox directory |

### 📋 Productivity Tools
| Tool | Capability |
|------|-----------|
| `manage_planner` | Create, update, and query a persistent daily task planner |
| `create_new_routine` / `execute_routine` | Define and trigger named automation routines |
| `send_email_gmail` | Compose and send emails with file attachments via Gmail SMTP |
| `get_current_weather` | Fetch live weather data for any location |
| `calculate` | Safe expression evaluator for mathematical computations |

### 📄 Document & Vision Understanding
- **File Upload & OCR** — supports PDF, DOCX, TXT, MD, PNG, JPG, WebP
- **Tesseract OCR** for extracting text from images
- **pypdf** for multi-page PDF text extraction

### 🔐 Permission & Safety System
- **Per-tool permission gates** — sensitive tools prompt the user before executing
- **"Always Allow" toggles** per tool — grant trust once, never be asked again
- **Timed Full Access mode** — grant blanket access for a configurable duration
- **Safe write directory sandbox** — all file writes are contained in a safe folder

### 🎨 Modern Frontend (React + Vite + Electron)
- **Dark / Light mode** toggle
- **Online / Offline API status** indicator
- **Streaming chat UI** with Markdown rendering and syntax highlighting
- **Voice chat interface** with real-time transcription display
- **File attachment support** in chat
- **Model selector** — switch LLMs on the fly
- **Voice model selector** — choose your TTS voice
- **Daily planner panel** — view and manage tasks from the sidebar
- **Packagable as a desktop app** via Electron

---

## 🏗️ Architecture

```
Agent-System/
├── MCP_server/                  # Python backend
│   ├── server.py                # Entry point: starts Ollama, API, and frontend
│   ├── web_api.py               # FastAPI REST + WebSocket endpoints
│   ├── config.py                # All configurable constants & model settings
│   ├── tts_piper.py             # Piper TTS integration
│   ├── ai_chat/                 # Core LLM chat engine (Ollama client)
│   ├── voice/                   # Voice pipeline
│   │   ├── voice_manager.py     # WebSocket orchestrator
│   │   ├── speech_engine.py     # Whisper STT + confidence scoring
│   │   ├── vad.py               # Silero Voice Activity Detection
│   │   ├── providers/           # Local & cloud voice providers
│   │   └── models/              # Cached model weights
│   └── tools/                   # Pluggable tool modules
│       ├── calculator.py
│       ├── deep_search.py
│       ├── email.py
│       ├── filesystem.py
│       ├── planner.py
│       ├── routines.py
│       ├── system_commands.py
│       ├── system_action_commands.py
│       ├── thinker.py
│       ├── ui_control.py
│       └── weather.py
│
├── AI_Chatbot/                  # React + Vite + Electron frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/          # UI components
│   │   ├── hooks/               # Custom React hooks (useVoiceChat, etc.)
│   │   ├── pages/               # Route-level pages
│   │   ├── api/                 # API client helpers
│   │   └── utils/               # Shared utilities
│   ├── electron/                # Electron shell for desktop packaging
│   └── package.json
│
└── build.ps1                    # One-click Windows build script
```

### Communication Flow

```
┌─────────────────────┐        REST / SSE / WebSocket        ┌──────────────────────────┐
│   React Frontend    │ ◄──────────────────────────────────► │  FastAPI Server (:8000)   │
│  (Vite :5173 / App) │                                       │     web_api.py            │
└─────────────────────┘                                       └────────────┬─────────────┘
                                                                           │
                                                              ┌────────────▼─────────────┐
                                                              │      ai_chat Engine       │
                                                              │  (Ollama LLM + Tools)    │
                                                              └────────────┬─────────────┘
                                                                           │
                                          ┌────────────────────────────────▼──────────────────────────────┐
                                          │                         Tool Registry                          │
                                          │  calculate · weather · email · filesystem · system_commands   │
                                          │  planner · routines · deep_think · open/close_program         │
                                          │  computer_control · deep_search                               │
                                          └───────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Python 3.10+** | Required for the backend |
| **Node.js 18+** | Required for the frontend |
| **Ollama** | [Download here](https://ollama.com/download) — must be installed and on PATH |
| **Tesseract OCR** | [Download here](https://github.com/UB-Mannheim/tesseract/wiki) — install to `C:\Program Files\Tesseract-OCR\` |
| **FFmpeg** *(optional)* | For audio processing; can be installed via WinGet |
| **GPU** *(recommended)* | CUDA-capable GPU greatly accelerates Whisper and Ollama inference |

---

### 1. Clone the Repository

```bash
git clone https://github.com/amrokld/Agent-System.git
cd Agent-System
```

### 2. Pull Your Ollama Model

```bash
ollama pull gpt-oss:120b-cloud
# or any other compatible model
```

### 3. Install Python Dependencies

```bash
cd MCP_server
pip install -r requirements.txt
```

### 4. Install Frontend Dependencies

```bash
cd ../AI_Chatbot
npm install
```

### 5. Run the System

```bash
# From the MCP_server directory
python server.py
```

This single command will:
1. 🚀 Start the Ollama engine
2. 🌐 Launch the FastAPI server on `http://0.0.0.0:8000`
3. ⚛️ Start the Vite dev server for the React frontend
4. 🌍 Open the chat UI in your browser at `http://localhost:5173`

---

## 📦 Building for Production (Desktop App)

Run the included PowerShell build script from the project root:

```powershell
.\build.ps1
```

This will:
1. Bundle the Python backend into a standalone `server.exe` via PyInstaller
2. Build the React frontend with Vite
3. Package everything into a Windows desktop installer via Electron Builder

The final installer is placed in `AI_Chatbot/release/`.

---

## ⚙️ Configuration

All backend settings are centralized in [`MCP_server/config.py`](./MCP_server/config.py):

| Setting | Default | Description |
|---------|---------|-------------|
| `OLLAMA_MODEL` | `gpt-oss:120b-cloud` | The LLM model served by Ollama |
| `OLLAMA_KEEP_ALIVE` | `10m` | How long to keep the model loaded in memory |
| `WHISPER_MODEL_STREAMING` | `tiny.en` | Fast Whisper model for real-time STT |
| `WHISPER_MODEL_FINAL` | `small.en` | Higher-accuracy model for final transcription |
| `VOICE_MODEL` | `en_US-ryan-medium` | Default Piper TTS voice |
| `VAD_SILENCE_TIMEOUT_MS` | `4000` | Silence threshold to end a voice turn (ms) |
| `STT_CONFIDENCE_THRESHOLD_FINAL` | `0.75` | Below this, words are marked as uncertain |
| `SAFE_WRITE_DIR` | `./written_files` | Sandboxed directory for all file output |
| `GMAIL_USER` | `env var` | Gmail address for the email tool |
| `GMAIL_APP_PASSWORD` | `env var` | Gmail app password for the email tool |

You can override most settings using environment variables.

---

## 🔌 API Reference

The backend exposes a RESTful API plus WebSocket endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Synchronous chat (returns full reply) |
| `POST` | `/api/chat/stream` | Streaming chat via SSE |
| `POST` | `/api/voice` | Upload audio → get transcript (deprecated) |
| `WS`   | `/ws/voice` | Real-time bidirectional voice pipeline |
| `POST` | `/api/voice/warmup` | Pre-load STT models |
| `POST` | `/api/tts` | Text → WAV audio file |
| `POST` | `/api/file` | Upload file + instruction → AI response |
| `GET`  | `/api/download/{filename}` | Download a generated file |
| `GET`  | `/api/model` | Get current active model |
| `POST` | `/api/model` | Switch active model |
| `GET`  | `/api/voices` | List installed TTS voices |
| `POST` | `/api/voices/set` | Set active TTS voice |
| `GET`  | `/api/permissions/pending` | Check for a pending permission request |
| `POST` | `/api/permission` | Respond to a permission request |
| `POST` | `/api/permissions/grant-full-access` | Grant timed full access |
| `GET`  | `/api/planner/tasks` | Get today's planner tasks |
| `GET`  | `/api/routines` | List all saved routines |
| `GET`  | `/api/health` | Health check |

---

## 🛠️ Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — High-performance async REST framework
- **[Uvicorn](https://www.uvicorn.org/)** — ASGI server
- **[Ollama](https://ollama.com/)** — Local LLM inference engine
- **[OpenAI Whisper](https://github.com/openai/whisper)** — Speech recognition
- **[Piper TTS](https://github.com/rhasspy/piper)** — Neural text-to-speech
- **[PyTorch](https://pytorch.org/)** — ML inference backend (Whisper + Silero VAD)
- **[FastMCP](https://github.com/jlowin/fastmcp)** — Model Context Protocol integration
- **[PyInstaller](https://pyinstaller.org/)** — Python bundling for distribution

### Frontend
- **[React 19](https://react.dev/)** — UI library
- **[Vite 7](https://vitejs.dev/)** — Lightning-fast bundler & dev server
- **[Electron 28](https://www.electronjs.org/)** — Desktop app wrapper
- **[TailwindCSS 3](https://tailwindcss.com/)** — Utility-first styling
- **[React Router 7](https://reactrouter.com/)** — Client-side routing
- **[react-markdown](https://github.com/remarkjs/react-markdown)** — Markdown rendering
- **[Highlight.js](https://highlightjs.org/)** — Code syntax highlighting
- **[Lucide React](https://lucide.dev/)** — Icon library

---

## 📁 Project Structure Highlights

```
MCP_server/tools/          ← Add new tools here
MCP_server/voice/          ← Voice pipeline (VAD, STT, TTS, WebSocket)
MCP_server/ai_chat/        ← Core chat engine & Ollama client
AI_Chatbot/src/components/ ← React UI components
AI_Chatbot/src/hooks/      ← Custom hooks (useVoiceChat, etc.)
AI_Chatbot/electron/       ← Desktop app entry point
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

## 👥 Authors

This project was designed and built by:

| Name | Role |
|------|------|
| **Abdalla Dawoud** | Co-Developer & Architect |
| **Amro Khaled** | Co-Developer & Architect |

---

<div align="center">

Made with ❤️ and a lot of ☕

*"The night is darkest just before the dawn."*

</div>
