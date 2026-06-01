import os
import platform
import sys

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "BatmanAI")
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SAFE_WRITE_DIR = os.path.join(BASE_DIR, "written_files")
os.makedirs(SAFE_WRITE_DIR, exist_ok=True)

# --- Model Configuration ---
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gpt-oss:120b-cloud")

CURRENT_MODEL = OLLAMA_MODEL

# Keep the selected local model warm so normal chat messages do not pay the
# full Ollama load/unload cost every time.
_OLLAMA_KEEP_ALIVE_RAW = os.environ.get("OLLAMA_KEEP_ALIVE", "10m")
try:
    OLLAMA_KEEP_ALIVE = int(_OLLAMA_KEEP_ALIVE_RAW)
except ValueError:
    OLLAMA_KEEP_ALIVE = _OLLAMA_KEEP_ALIVE_RAW

UNLOAD_OLLAMA_AFTER_RESPONSE = os.environ.get("UNLOAD_OLLAMA_AFTER_RESPONSE", "false").lower() in {"1", "true", "yes", "on"}

# --- Tool Configuration (optional defaults, not required anymore) ---
GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")

# FFmpeg path for specialized Windows environments (Microsoft Store Python)
# It is safer not to hard crash if this path doesn't exist, but we keep it available if the user relies on it.
MICROSOFT_FFMPEG_PATH = r"C:\Users\isc\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin"



def setup_ffmpeg_path():
    """Adds local ffmpeg to PATH if it exists (Windows only)."""
    if platform.system() == "Windows" and os.path.exists(MICROSOFT_FFMPEG_PATH):
        if MICROSOFT_FFMPEG_PATH not in os.environ.get("PATH", ""):
            os.environ["PATH"] = MICROSOFT_FFMPEG_PATH + os.pathsep + os.environ.get("PATH", "")


# --- Voice Pipeline Configuration ---
VOICE_SAMPLE_RATE = 16000                       # Hz — Whisper expects 16kHz
VOICE_CHANNELS = 1                              # mono
VOICE_CHUNK_MS = 700                            # STT chunk interval in ms

# VAD (Voice Activity Detection)
VAD_SILENCE_TIMEOUT_MS = 4000                    # silence duration to trigger end-of-speech
VAD_SPEECH_THRESHOLD = 0.5                      # probability threshold for Silero VAD
VAD_MIN_SPEECH_MS = 250                         # minimum speech duration to avoid false triggers

# STT Confidence
STT_CONFIDENCE_THRESHOLD_REALTIME = 0.65        # below this → mark uncertain during streaming
STT_CONFIDENCE_THRESHOLD_FINAL = 0.75           # below this → mark uncertain on final pass
STT_CONTEXT_WINDOW_WORDS = 15                   # sliding window size for context merge

# TTS
TTS_CROSSFADE_MS = 40                           # crossfade between TTS sentence chunks
TTS_SAMPLE_RATE = 22050                         # Piper native output rate

# Whisper model
WHISPER_MODEL_STREAMING = os.environ.get("WHISPER_MODEL_STREAMING", "tiny.en")
WHISPER_MODEL_FINAL = os.environ.get("WHISPER_MODEL_FINAL", "small.en")

# Piper TTS Configuration
VOICE_PROVIDER = "piper"
VOICE_DEFAULT = "en_US-ryan-medium"
VOICE_MODEL = os.environ.get("VOICE_MODEL", VOICE_DEFAULT)
VOICE_SAMPLE_RATE = 24000
