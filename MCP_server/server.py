import logging
import os
import sys
import threading
import time
import subprocess
import webbrowser

# Ensure stdout supports UTF-8 for emojis
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from ai_chat import start_chat 


import uvicorn
from web_api import app



logging.basicConfig(
    level=logging.INFO,   # Show INFO logs so the user can see what's happening
    format="%(levelname)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

# --- Filter Uvicorn Polling Spam ---
class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        # Ignore annoying polling logs so they don't drown out the real tool executions
        if msg.find("/api/health") != -1 or msg.find("/api/permissions/pending") != -1 or msg.find("/api/planner/tasks") != -1:
            return False
        return True

# Apply filter to uvicorn access logs
logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

logger = logging.getLogger(__name__)



# Global reference so we can kill it on shutdown
_frontend_proc = None
_ollama_proc = None

def start_ollama():
    """Starts the Ollama engine in the background."""
    global _ollama_proc
    print("🚀 Starting Ollama engine...")
    try:
        # Create a subprocess for ollama serve.
        _ollama_proc = subprocess.Popen(
            ["ollama", "serve"],
            shell=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        time.sleep(2) # Give it a second to bind
    except Exception as e:
        print(f"❌ Failed to start Ollama: {e}")

def start_frontend():
    """Starts the React frontend (AI_Chatbot) in a separate process."""
    global _frontend_proc
    if getattr(sys, 'frozen', False):
        print("Running in PyInstaller mode. Frontend is handled by Electron.")
        return

    frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "AI_Chatbot"))
    print(f"🚀 Starting Frontend in {frontend_path}...")
    try:
        # shell=False + npm.cmd avoids the "Terminate batch job (Y/N)?" prompt on Windows
        _frontend_proc = subprocess.Popen(
            ["npm.cmd", "run", "dev"],
            cwd=frontend_path,
            shell=False,
        )
        # Give it a few seconds to start before opening the browser
        time.sleep(3)
        print("🌍 Opening AI Chatbot in browser...")
        webbrowser.open("http://localhost:5173")
    except Exception as e:
        print(f"❌ Failed to start frontend: {e}")


# -------------------------------------------------
# Main
# -------------------------------------------------
if __name__ == "__main__":
        
    def start_web_api():
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8000, 
            log_level="info",      # Show logs
            access_log=True        # Enable access logs so you see requests
        )
             
    # Start Ollama Engine
    start_ollama()
    
    web_thread = threading.Thread(target=start_web_api, daemon=True)
    web_thread.start()
    print("✅ Web API running on http://0.0.0.0:8000 (accessible on LAN)")
    
    # 2) start Frontend
    start_frontend()
    
    time.sleep(0.5)
    print()

    try:
        # Keep the main thread alive so background servers continue running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        # Kill the Vite frontend process cleanly (no "Terminate batch job?" prompt)
        if _frontend_proc and _frontend_proc.poll() is None:
            _frontend_proc.terminate()
        if _ollama_proc and _ollama_proc.poll() is None:
            _ollama_proc.terminate()
        print("\n👋 Server stopped.")
