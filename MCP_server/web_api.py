# web_api.py
import os
import logging
logger = logging.getLogger(__name__)
import tempfile
import threading
import time
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi import HTTPException
import asyncio
import json
import base64

import smtplib
from typing import List
import config
import importlib

import pytesseract


# reuse your existing code
from ai_chat import AiChat
from tools import TOOL_SYSTEM_PROMPT
from pydantic import BaseModel
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from tts_piper import text_to_speech, text_to_speech_streaming

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# For PDFs in file upload
try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

app = FastAPI()

# allow browser frontend to call the API (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session store: dict[session_id] = AiChat instance
SESSIONS: dict[str, AiChat] = {}
SESSIONS_LOCK = threading.Lock()
SESSION_TTL_SECONDS = 3600  # 1 hour

def get_chat_session(session_id: str) -> AiChat:
    """Gets or creates an AiChat session for the given ID."""
    with SESSIONS_LOCK:
        if session_id not in SESSIONS:
            logger.info(f"Creating new session: {session_id}")
            SESSIONS[session_id] = AiChat(system_prompt=TOOL_SYSTEM_PROMPT)
        return SESSIONS[session_id]

def cleanup_sessions_loop():
    """Background thread to remove inactive sessions."""
    while True:
        time.sleep(600)  # check every 10 mins
        now = time.time()
        with SESSIONS_LOCK:
            to_delete = [
                sid for sid, chat_obj in SESSIONS.items()
                if now - chat_obj.updated_at > SESSION_TTL_SECONDS
            ]
            for sid in to_delete:
                logger.info(f"Cleaning up inactive session: {sid}")
                del SESSIONS[sid]

# Start cleanup thread
threading.Thread(target=cleanup_sessions_loop, daemon=True).start()


def extract_text_from_upload(file_path: str, filename: str, max_chars: int = 12000, max_pages: int = 3) -> str:
    ext = os.path.splitext(filename)[1].lower()

    if ext not in {
        ".txt",
        ".md",
        ".pdf",
        ".docx",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp"
    }:
        return f"Unsupported file type: {ext}"

    if ext == ".pdf":
        if PdfReader is None:
            return "Error: PDF support not available (install pypdf)."
        try:
            reader = PdfReader(file_path)
            pages = min(len(reader.pages), max_pages)
            parts = []
            for i in range(pages):
                parts.append(f"\n--- Page {i+1} ---\n{reader.pages[i].extract_text() or ''}")
            text = "\n".join(parts).strip()
            if not text:
                return "Error: Could not extract text from this PDF (it may be scanned images)."
            return text[:max_chars] + ("\n\n[Truncated]" if len(text) > max_chars else "")
        except Exception as e:
            return f"Error reading PDF: {e}"

    # ---- DOCX ----
    if ext == ".docx":
        try:
            from docx import Document

            doc = Document(file_path)
            lines = [para.text for para in doc.paragraphs]
            text = "\n".join(lines).strip()

            if not text:
                return "Error: Could not extract text from this Word document."

            return text[:max_chars] + (
                "\n\n[Truncated]" if len(text) > max_chars else ""
            )

        except ImportError:
            return "Error: DOCX support missing. Install: pip install python-docx"

        except Exception as e:
            return f"Error reading Word file: {e}"

    # ---- IMAGES ----
    if ext in [".png", ".jpg", ".jpeg", ".webp"]:
        try:
            import pytesseract
            from PIL import Image

            image = Image.open(file_path)
            text = pytesseract.image_to_string(image).strip()

            if not text:
                return "Image loaded successfully, but no readable text was detected."

            return text[:max_chars] + (
                "\n\n[Truncated]" if len(text) > max_chars else ""
            )

        except ImportError:
            return "Error: Image OCR support missing. Install: pip install pillow pytesseract"

        except Exception as e:
            return f"Error reading image: {e}"

    # fallback: treat as text
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            data = f.read(max_chars + 1)
        if len(data) > max_chars:
            data = data[:max_chars] + "\n\n[Truncated]"
        return data
    except Exception as e:
        return f"Error reading file: {e}"


@app.post("/api/chat")
async def api_chat(
    message: str = Form(...),
    session_id: str = Form("default_user"),
    email: str = Form(None),
    password: str = Form(None),
):
    chat_session = get_chat_session(session_id)
    def safe_ask():    
        with chat_session.lock:
            return chat_session.ask(message, email=email, password=password)
    reply = await asyncio.to_thread(safe_ask)
    return reply

@app.post("/api/chat/abort")
async def api_chat_abort(session_id: str = Form("default_user")):
    chat_session = get_chat_session(session_id)
    chat_session.is_aborted = True
    return {"ok": True}


@app.post("/api/chat/stream")
async def api_chat_stream(
    message: str = Form(...),
    session_id: str = Form("default_user"),
    email: str = Form(None),
    password: str = Form(None),
    history: str = Form(None),
):
    chat_session = get_chat_session(session_id)
    
    # If backend session is new/empty, hydrate it from frontend history
    if history and len(chat_session.messages) <= 1:
        try:
            parsed = json.loads(history)
            for msg in parsed:
                # ignore system logs or tool outputs that don't have text
                text = msg.get("text", "")
                if not text: continue
                role = "user" if msg.get("isUser") else "assistant"
                chat_session.messages.append({"role": role, "content": text})
            logger.info(f"Hydrated session {session_id} with {len(parsed)} past messages.")
        except Exception as e:
            logger.error(f"Failed to parse history: {e}")

    event_queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def on_event(event_type: str, data):
        """Called from the worker thread; safely puts an event into the asyncio queue."""
        asyncio.run_coroutine_threadsafe(
            event_queue.put({"type": event_type, "data": data}),
            loop,
        )

    def run_ask():
        with chat_session.lock:
            result = chat_session.ask(message, email=email, password=password, on_event=on_event)
        # Signal completion
        asyncio.run_coroutine_threadsafe(
            event_queue.put({"type": "done", "data": result}),
            loop,
        )

    # Start ask() in a background thread
    threading.Thread(target=run_ask, daemon=True).start()

    async def generate():
        while True:
            event = await event_queue.get()
            # Pad each event with an 8KB comment to force flush through Chrome/Antivirus buffers
            yield f"data: {json.dumps(event)}\n\n: " + (" " * 8192) + "\n\n"
            if event["type"] == "done":
                break

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Connection": "keep-alive",
        },
    )


@app.post("/api/voice/warmup")
async def api_voice_warmup():
    """Warms up the STT models before a voice session starts."""
    def warmup():
        from config import STT_CONFIDENCE_THRESHOLD_REALTIME, STT_CONFIDENCE_THRESHOLD_FINAL, STT_CONTEXT_WINDOW_WORDS, WHISPER_MODEL_STREAMING, WHISPER_MODEL_FINAL
        from voice.speech_engine import SpeechUnderstandingEngine
        logger.info("Starting on-demand warmup of AI models...")
        
        # Warmup Streaming Model
        engine_stream = SpeechUnderstandingEngine(
            confidence_threshold_realtime=STT_CONFIDENCE_THRESHOLD_REALTIME,
            confidence_threshold_final=STT_CONFIDENCE_THRESHOLD_FINAL,
            context_window_words=STT_CONTEXT_WINDOW_WORDS,
            whisper_model_name=WHISPER_MODEL_STREAMING,
        )
        engine_stream.preload_model()

        # Warmup Final Model (used by LocalVoiceProvider)
        if WHISPER_MODEL_STREAMING != WHISPER_MODEL_FINAL:
            engine_final = SpeechUnderstandingEngine(
                confidence_threshold_realtime=STT_CONFIDENCE_THRESHOLD_REALTIME,
                confidence_threshold_final=STT_CONFIDENCE_THRESHOLD_FINAL,
                context_window_words=STT_CONTEXT_WINDOW_WORDS,
                whisper_model_name=WHISPER_MODEL_FINAL,
            )
            engine_final.preload_model()

        logger.info("On-demand warmup complete! Voice is now fully ready.")

    await asyncio.to_thread(warmup)
    return {"ok": True}

@app.post("/api/voice")
async def api_voice(
    audio: UploadFile = File(...),
    session_id: str = Form("default_user")
):
    """
    DEPRECATED: Real-time voice should use /ws/voice via VoiceManager.
    Retained temporarily for testing and benchmarking STT directly.
    """
    logger.warning("Endpoint /api/voice is deprecated. Please use /ws/voice.")
    suffix = os.path.splitext(audio.filename)[1].lower() or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        tmp.write(await audio.read())

    try:
        from voice.speech_engine import SpeechUnderstandingEngine
        engine = SpeechUnderstandingEngine(
            confidence_threshold_final=config.STT_CONFIDENCE_THRESHOLD_FINAL,
            whisper_model_name=config.WHISPER_MODEL_FINAL,
        )
        result = await asyncio.to_thread(engine.transcribe_file, tmp_path)
        if result.text.startswith("Error"):
            return {"error": result.text}
        return {
            "transcript": result.text,
            "raw_transcript": result.text,
            "confidence": result.confidence,
            "corrected_words": result.corrected_words,
            "uncertain_words": result.uncertain_words,
            "is_final": True,
            "deprecated": True,
            "use": "/ws/voice"
        }
    except Exception as e:
        logger.error(f"Voice fallback error: {e}")
        return {"error": f"Error transcribing audio: {e}"}
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


@app.post("/api/tts")
async def api_tts(
    text: str = Form(...),
    background_tasks: BackgroundTasks = None,
):
    """
    Converts text to speech using Piper TTS.
    Returns a .wav audio file. (Used as fallback)
    """
    try:
        wav_path = text_to_speech(text)
        background_tasks.add_task(os.remove, wav_path)
        return FileResponse(
            wav_path,
            media_type="audio/wav",
            filename="response.wav",
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tts/stream")
async def api_tts_stream(text: str = Form(...)):
    """
    DEPRECATED: Real-time TTS streaming is handled directly inside the /ws/voice WebSocket pipeline.
    Retained temporarily in case browser tests or onboarding still call this directly.
    """
    logger.warning("Endpoint /api/tts/stream is deprecated. Please use /ws/voice.")
    import io, wave

    async def generate():
        for chunk in text_to_speech_streaming(text):
            buf = io.BytesIO()
            with wave.open(buf, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(chunk["sample_rate"])
                wf.writeframes(chunk["audio"])
            wav_bytes = buf.getvalue()

            event_data = {
                "audio": base64.b64encode(wav_bytes).decode("ascii"),
                "sentence": chunk["sentence"],
                "index": chunk["index"],
                "is_last": chunk["is_last"],
                "deprecated": True,
                "use": "/ws/voice"
            }
            yield f"data: {json.dumps(event_data)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# WebSocket: Real-time Voice Pipeline (Powered by VoiceManager)
# ---------------------------------------------------------------------------

@app.websocket("/ws/voice")
async def ws_voice(websocket: WebSocket, session_id: str = "default_user"):
    """
    Real-time bidirectional voice pipeline over WebSocket.
    Delegates all complex routing, state, and processing to VoiceManager.
    """
    await websocket.accept()
    logger.info(f"WebSocket voice connection opened: {session_id}")

    try:
        from voice.voice_manager import VoiceManager
        manager = VoiceManager(session_id, websocket, get_chat_session)
        await manager.connect()
    except Exception as e:
        logger.error(f"Failed to initialize VoiceManager: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close()
        except Exception:
            pass

#--------------------------------------------------------Read_file-------------------------------------------------------------
@app.post("/api/file")
async def api_file(
    instruction: str = Form(...),
    file: List[UploadFile] = File(...),
    session_id: str = Form("default_user")
):
    """
    Upload file + instruction -> saves file to written_files -> extracts text -> chat.ask
    """
    from config import SAFE_WRITE_DIR
    os.makedirs(SAFE_WRITE_DIR, exist_ok=True)
    
    MAX_FILE_SIZE = 10 * 1024 * 1024
    MAX_TOTAL_SIZE = 20 * 1024 * 1024
    MAX_FILES = 3

    if len(file) > MAX_FILES:
        return {"error": f"Too many files uploaded. Maximum is {MAX_FILES}."}

    total_size = 0
    file_contents = []

    for f in file:
        content_bytes = await f.read()
        total_size += len(content_bytes)

        if len(content_bytes) > MAX_FILE_SIZE:
            return {"error": f"File '{f.filename}' is too large. Maximum size is 10MB."}
        if total_size > MAX_TOTAL_SIZE:
            return {"error": "Total upload size exceeds 20MB limit."}
        
        file_contents.append((f.filename, content_bytes))

    combined_content = ""
    saved_paths = []

    try:
        for filename, content_bytes in file_contents:
            safe_filename = os.path.basename(filename)
            save_path = os.path.join(SAFE_WRITE_DIR, safe_filename)
            
            with open(save_path, "wb") as disk_file:
                disk_file.write(content_bytes)
            
            saved_paths.append(save_path)

            # Extract context for the AI
            content = extract_text_from_upload(save_path, safe_filename, max_chars=12000, max_pages=3)
            
            combined_content += f"[FILE: {safe_filename}]\n{content}\n\n"

        # Specifically tell the AI where the files went so it can attach them to emails
        paths_str = "\n".join([f"- {p}" for p in saved_paths])
        prompt = (
            f"USER REQUEST: {instruction}\n\n"
            "FILES SAVED AT (Internal Use Only):\n"
            f"{paths_str}\n\n"
            "FILES CONTENT (preview, may be truncated):\n"
            f"{combined_content}\n"
            "IMPORTANT: When responding to the user, ONLY mention the file names and types. DO NOT output or mention the local file paths. However, if the user asks you to email a file, you MUST use the exact FILE SAVED AT path internally in the attachment parameter of your email tool!"
        )

        chat_session = get_chat_session(session_id)
        reply = chat_session.ask(prompt)

        return reply
    except Exception as e:
        return {"error": str(e)}


#--------------------------------------------------------write_file------------------------------------------------------ 
from config import SAFE_WRITE_DIR

@app.get("/api/download/{filename}")
def download_file(filename: str):
    filename = os.path.basename(filename)  # prevent ../ trick
    path = os.path.join(SAFE_WRITE_DIR, filename)

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path, filename=filename, content_disposition_type="inline")

@app.get("/api/open/{filename}")
def open_file_native(filename: str):
    filename = os.path.basename(filename)
    path = os.path.join(SAFE_WRITE_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    
    import subprocess, sys
    try:
        if sys.platform == "win32":
            os.startfile(path)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", path])
        else:
            subprocess.Popen(["xdg-open", path])
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

#--------------------------------------------------------Changing_Model------------------------------------------------------ 

@app.get("/api/model")
def get_model():
    return {"model": config.CURRENT_MODEL}

@app.post("/api/model")
async def set_model(model: str = Form(...)):
    config.CURRENT_MODEL = model
    return {"ok": True, "model": config.CURRENT_MODEL}

#--------------------------------------------------------Voices------------------------------------------------------ 
from tts_piper import get_installed_voices, set_active_voice

@app.get("/api/voices")
def get_voices():
    voices = get_installed_voices()
    active_voice = getattr(config, "VOICE_MODEL", getattr(config, "VOICE_DEFAULT", "en_US-ryan-medium"))
    if active_voice not in voices:
        voices.append(active_voice)
    return {"ok": True, "voices": voices, "active": active_voice}

@app.post("/api/voices/set")
async def api_set_voice(voice: str = Form(...)):
    set_active_voice(voice)
    return {"ok": True, "active": voice}


#--------------------------------------------------------Providers------------------------------------------------------ 
@app.get("/api/providers")
def get_providers():
    return {"active": "ollama"}

@app.post("/api/providers/switch")
async def switch_provider(provider: str = Form(...)):
    return {"ok": True, "active": provider}
              
        
#--------------------------------------------------------Permission------------------------------------------------------ 
@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/permission")
async def api_permission(
    session_id: str = Form("default_user"),
    request_id: str = Form(...),
    allowed: str = Form(...),   # "true" or "false"
    dont_ask_again: str = Form("false"),
):
    chat_session = get_chat_session(session_id)
    pending = getattr(chat_session, "_pending_permissions", {})
    entry = pending.get(request_id)

    
    if not entry:
        return {"ok": False, "error": "Unknown or expired request"}
    entry["allowed"] = allowed.lower() == "true"
    entry["dont_ask_again"] = dont_ask_again.lower() == "true"
    entry["event"].set()   # unblock the waiting thread in ai_chat.py
    return {"ok": True}

@app.post("/api/permission/reset")
async def api_permission_reset(
    session_id: str = Form("default_user")
):
    chat_session = get_chat_session(session_id)
    if hasattr(chat_session, "always_allow_tools"):
        chat_session.always_allow_tools.clear()
    return {"ok": True}
 
# GET /api/permissions?session_id=...  → returns the current always-allowed set
@app.get("/api/permissions")
def get_permissions(session_id: str = "default_user"):
    chat_session = get_chat_session(session_id)
    allowed = list(getattr(chat_session, "always_allow_tools", set()))
    return {"allowed_tools": allowed}

@app.get("/api/permissions/pending")
def get_pending_permission(session_id: str = "default_user"):
    chat_session = get_chat_session(session_id)
    pending = getattr(chat_session, "_pending_permissions", {})
    for request_id, data in list(pending.items()):
        if data.get("allowed") is None:  # not yet responded to
            return {
                "has_pending": True,
                "request_id": request_id,
                "tool": data.get("tool", ""),
                "args": data.get("args", {}),
            }
    return {"has_pending": False}


# POST /api/permissions/toggle  → adds or removes a single tool from always_allow_tools
@app.post("/api/permissions/toggle")
async def toggle_permission(
    session_id: str = Form("default_user"),
    tool_name: str = Form(...),
    allowed: str = Form(...),   # "true" or "false"
):
    chat_session = get_chat_session(session_id)
    if not hasattr(chat_session, "always_allow_tools"):
        chat_session.always_allow_tools = set()

    if allowed.lower() == "true":
        chat_session.always_allow_tools.add(tool_name)
    else:
        chat_session.always_allow_tools.discard(tool_name)

    return {"ok": True, "always_allow_tools": list(chat_session.always_allow_tools)}

@app.post("/api/permissions/grant-full-access")
async def grant_full_access(
    session_id: str = Form("default_user"),
    duration_seconds: int = Form(...),
):
    chat_session = get_chat_session(session_id)
    chat_session.full_access_until = time.time() + duration_seconds
    
    # Also unblock any currently pending permissions for this session
    pending = getattr(chat_session, "_pending_permissions", {})
    for request_id, entry in list(pending.items()):
        if entry.get("allowed") is None:
            entry["allowed"] = True
            entry["dont_ask_again"] = False
            entry["event"].set()
            
    return {"ok": True, "full_access_until": chat_session.full_access_until}

#--------------------------------------------------------Editing emails------------------------------------------------------ 
from typing import Optional, Union

class EmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    attachment: Optional[Union[str, list]] = None   # single filename OR list of filenames
    email: Optional[str] = None
    password: Optional[str] = None

@app.post("/api/send-email-direct")
def send_email_direct(data: EmailRequest):
    import os
    from email.mime.base import MIMEBase
    from email import encoders

    if not data.email or not data.password:
        return {"error": "Missing credentials"}
    
    msg = MIMEMultipart()
    msg["From"] = data.email
    msg["To"] = data.to
    msg["Subject"] = data.subject
    msg.attach(MIMEText(data.body, "plain"))

    if data.attachment:
        from config import SAFE_WRITE_DIR
        # Normalise to always be a list
        attachments = [data.attachment] if isinstance(data.attachment, str) else data.attachment

        for att in attachments:
            attachment_path = att
            if not os.path.isabs(attachment_path):
                attachment_path = os.path.join(SAFE_WRITE_DIR, os.path.basename(attachment_path))

            if not os.path.exists(attachment_path):
                logger.warning(f"Attachment not found, skipping: {attachment_path}")
                continue

            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{os.path.basename(attachment_path)}"')
            msg.attach(part)
    
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as server:
            server.login(data.email, data.password)
            server.send_message(msg)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# POST /api/permissions/allow-all  → adds all tools to always_allow_tools at once
@app.post("/api/permissions/allow-all")
async def allow_all_permissions(
    session_id: str = Form("default_user"),
    tool_names: str = Form(...),   # comma-separated list of backend keys
):
    chat_session = get_chat_session(session_id)
    if not hasattr(chat_session, "always_allow_tools"):
        chat_session.always_allow_tools = set()

    for name in tool_names.split(","):
        name = name.strip()
        if name:
            chat_session.always_allow_tools.add(name)

    return {"ok": True, "always_allow_tools": list(chat_session.always_allow_tools)}

# -------------------------------------------------------- Planner ---------------------------------------------------------
@app.get("/api/planner/tasks")
def get_planner_tasks():
    try:
        planner = importlib.import_module("tools.planner")
        data = planner._load()
        return {"ok": True, "tasks": data.get("today_tasks", [])}
    except Exception as e:
        return {"ok": False, "tasks": [], "error": str(e)}

# -------------------------------------------------------- Routines ---------------------------------------------------------
@app.get("/api/routines")
def get_routines():
    try:
        from tools.routines import load_routines
        data = load_routines()
        return {"ok": True, "routines": data}
    except Exception as e:
        return {"ok": False, "routines": {}, "error": str(e)}

@app.patch("/api/routines/{name}/prompt")
async def update_routine_prompt(name: str, prompt: str = Form(...)):
    try:
        from tools.routines import load_routines, save_routines
        routines = load_routines()
        if name not in routines:
            return {"ok": False, "error": "Routine not found"}
        routines[name]["prompt"] = prompt
        save_routines(routines)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

class RoutineUpdateModel(BaseModel):
    name: str
    description: str
    prompt: str = ""
    steps: list = []

@app.put("/api/routines/{old_name}")
async def update_routine_full(old_name: str, data: RoutineUpdateModel):
    try:
        from tools.routines import load_routines, save_routines
        routines = load_routines()
        
        if old_name not in routines:
            return {"ok": False, "error": "Routine not found"}
        
        # If name is changed, delete old key
        if data.name != old_name:
            if data.name in routines:
                return {"ok": False, "error": "A routine with the new name already exists."}
            del routines[old_name]
            
        routines[data.name] = {
            "description": data.description,
            "prompt": data.prompt,
            "steps": data.steps
        }
        
        save_routines(routines)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.delete("/api/routines/{name}")
def delete_routine(name: str):
    try:
        from tools.routines import load_routines, save_routines
        routines = load_routines()
        if name in routines:
            del routines[name]
            save_routines(routines)
            return {"ok": True}
        return {"ok": False, "error": "Routine not found"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# -------------------------------------------------------- Contacts ---------------------------------------------------------
import contacts_service

class ContactCreate(BaseModel):
    full_name: str = ""
    aliases: list = []
    emails: list = []
    phones: list = []
    whatsapp: list = []
    notes: str = ""
    custom_fields: dict = {}

class ContactUpdate(BaseModel):
    full_name: str = ""
    aliases: list = []
    emails: list = []
    phones: list = []
    whatsapp: list = []
    notes: str = ""
    custom_fields: dict = {}

@app.get("/api/contacts")
def get_contacts():
    try:
        contacts = contacts_service.load_contacts()
        return {"ok": True, "contacts": contacts}
    except Exception as e:
        return {"ok": False, "contacts": [], "error": str(e)}

@app.post("/api/contacts")
def create_contact(data: ContactCreate):
    try:
        contact = contacts_service.add_contact(data.dict())
        return {"ok": True, "contact": contact}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.put("/api/contacts/{contact_id}")
def update_contact_endpoint(contact_id: str, data: ContactUpdate):
    try:
        updated = contacts_service.update_contact(contact_id, data.dict())
        if updated is None:
            return {"ok": False, "error": "Contact not found"}
        return {"ok": True, "contact": updated}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.delete("/api/contacts/{contact_id}")
def delete_contact_endpoint(contact_id: str):
    try:
        deleted = contacts_service.delete_contact(contact_id)
        if not deleted:
            return {"ok": False, "error": "Contact not found"}
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/api/contacts/search")
def search_contacts(q: str = ""):
    try:
        matches = contacts_service.find_contact(q)
        return {"ok": True, "contacts": matches}
    except Exception as e:
        return {"ok": False, "contacts": [], "error": str(e)}

