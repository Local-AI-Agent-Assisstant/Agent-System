import json
import requests
import queue
import threading
import config
from config import OLLAMA_URL
from .base_provider import BaseProvider

class OllamaProvider(BaseProvider):
    
    def _keep_alive_unloads_immediately(self) -> bool:
        return str(config.OLLAMA_KEEP_ALIVE).strip().lower() in {"0", "0s"}

    def load(self, model_name: str, settings: dict = None):
        """Warm the selected Ollama model and keep it resident for quick chats."""
        try:
            requests.post(
                OLLAMA_URL,
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": "Reply with OK."}],
                    "stream": False,
                    "keep_alive": config.OLLAMA_KEEP_ALIVE,
                    "options": {"num_predict": 1},
                },
                timeout=120,
            ).raise_for_status()
        except Exception:
            pass

    def generate(self, messages: list, settings: dict = None) -> str:
        # Assuming generate is just stream without an event loop.
        # But we will route everything through stream to reuse the logic.
        return self.stream(messages, settings=settings)

    def stream(self, messages: list, on_event=None, is_interrupted=None, settings: dict = None):
        q = queue.Queue()
        
        def _run_request():
            response = None
            try:
                response = requests.post(
                    OLLAMA_URL,
                    json={
                        "model": config.CURRENT_MODEL,
                        "messages": messages,
                        "stream": True,
                        "keep_alive": config.OLLAMA_KEEP_ALIVE,
                        "options": {
                            "num_ctx": 16384
                        }
                    },
                    stream=True,
                    timeout=300,
                )
                response.raise_for_status()
                q.put(("response_obj", response))
                for line in response.iter_lines():
                    q.put(("line", line))
                q.put(("done", None))
            except Exception as e:
                q.put(("error", e))
            finally:
                if response:
                    try:
                        response.close()
                    except Exception:
                        pass
                if config.UNLOAD_OLLAMA_AFTER_RESPONSE and not self._keep_alive_unloads_immediately():
                    self.cancel()

        t = threading.Thread(target=_run_request)
        t.daemon = True
        t.start()
        
        full_reply = ""
        active_response = None
        
        while True:
            # Check interrupt frequently
            if is_interrupted and is_interrupted():
                if active_response:
                    try:
                        active_response.close()
                    except Exception:
                        pass
                return {"error": True, "message": "Interrupted by user."}
                
            try:
                item_type, item = q.get(timeout=0.5)
            except queue.Empty:
                if not t.is_alive():
                    break
                continue
                
            if item_type == "response_obj":
                active_response = item
                continue
                
            if item_type == "error":
                if full_reply:
                    return full_reply
                return {"error": True, "message": f"Could not reach the AI model or streaming error: {type(item).__name__} - {item}"}
                
            if item_type == "done":
                break
                
            if item_type == "line":
                if not item:
                    continue
                try:
                    chunk = json.loads(item.decode("utf-8"))
                except (ValueError, json.JSONDecodeError):
                    continue

                token = chunk.get("message", {}).get("content", "")
                if token:
                    full_reply += token
                    if on_event:
                        on_event("chunk", token)
                
                if chunk.get("done"):
                    break

        if not isinstance(full_reply, str) or not full_reply.strip():
            return {"error": True, "message": "The AI returned an empty response. Please try again."}

        return full_reply

    def cancel(self):
        """Unloads the model to immediately free CPU/RAM and abort any ongoing generation."""
        try:
            requests.post(OLLAMA_URL, json={"model": config.CURRENT_MODEL, "keep_alive": 0}, timeout=2)
        except Exception:
            pass

    def unload(self):
        self.cancel()

    def get_models(self) -> list:
        # Placeholder if needed, but the original implementation relies on config.CURRENT_MODEL.
        # Could query /api/tags if needed.
        return []
