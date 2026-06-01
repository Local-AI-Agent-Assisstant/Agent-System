import asyncio
import json
import logging
import io
import wave
import base64
import threading
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from voice.vad import VoiceActivityDetector
from voice.speech_engine import SpeechUnderstandingEngine
from tts_piper import text_to_speech_streaming

logger = logging.getLogger(__name__)

class VoiceManager:
    def __init__(self, session_id: str, websocket: WebSocket, get_chat_session_fn):
        self.session_id = session_id
        self.websocket = websocket
        self.get_chat_session = get_chat_session_fn
        self.vad = VoiceActivityDetector()
        self.speech_engine = SpeechUnderstandingEngine()
        
        self.audio_buffer = bytearray()
        self._is_processing = False
        self._request_id = 0
        self.voice_interrupt_enabled = False
        
        self._last_transcript = ""
        self._last_transcript_time = 0
        
        self.send_queue = asyncio.Queue()
        self.loop = asyncio.get_running_loop()

    async def connect(self):
        # Start the sender task
        sender_task = asyncio.create_task(self._sender_loop())
        
        try:
            while True:
                message = await self.websocket.receive()
                
                if message.get("type") == "websocket.disconnect":
                    logger.info(f"WebSocket cleanly disconnected by client for {self.session_id}")
                    break
                    
                if "bytes" in message:
                    # Audio data from microphone
                    if not self._is_processing:
                        await self._handle_audio(message["bytes"])
                elif "text" in message:
                    # Control messages from client
                    try:
                        data = json.loads(message["text"])
                        await self._handle_control(data)
                    except Exception as e:
                        logger.error(f"Error parsing control message: {e}")
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for {self.session_id}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            sender_task.cancel()

    async def _sender_loop(self):
        try:
            while True:
                msg = await self.send_queue.get()
                if not msg:
                    continue
                await self.websocket.send_json(msg)
                self.send_queue.task_done()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in sender loop: {e}")

    def emit(self, event_type: str, **kwargs):
        """Thread-safe way to emit messages to the client."""
        msg = {"type": event_type}
        msg.update(kwargs)
        asyncio.run_coroutine_threadsafe(self.send_queue.put(msg), self.loop)

    async def _handle_control(self, data: dict):
        action = data.get("type")
        if action == "interrupt":
            logger.info("Voice interrupted by user")
            self._request_id += 1
            self.emit("idle")
            
            # Unblock any pending permissions for this session
            chat = self.get_chat_session(self.session_id)
            if hasattr(chat, "_pending_permissions"):
                for req_id, p_data in list(chat._pending_permissions.items()):
                    p_data["allowed"] = False
                    if "event" in p_data:
                        p_data["event"].set()
            self.audio_buffer.clear()
            self.vad.reset()
            self._is_processing = False
        elif action == "force_speech":
            self.vad.force_speech()
            self.emit("vad", state="speech_start")
            self.audio_buffer.clear()
            self._is_processing = False
        elif action == "toggle_voice_interrupt":
            self.voice_interrupt_enabled = data.get("enabled", False)
            logger.info(f"Voice interrupt set to {self.voice_interrupt_enabled} for {self.session_id}")

    async def _handle_audio(self, pcm_bytes: bytes):
        vad_state = self.vad.process_frame(pcm_bytes)
        
        if vad_state == "speech_start":
            self.emit("vad", state="speech_start")
            self.audio_buffer.clear()
            self.audio_buffer.extend(pcm_bytes)
            
        elif vad_state == "speech_continue" or self.vad._is_speaking:
            self.audio_buffer.extend(pcm_bytes)
            
        elif vad_state == "speech_end":
            self.emit("vad", state="speech_end")
            self._is_processing = True
            
            # Extract the audio we gathered
            audio_data = bytes(self.audio_buffer)
            self.audio_buffer.clear()
            self.vad.reset()
            
            # Start processing in a background thread to unblock websocket loop
            threading.Thread(
                target=self._process_utterance, 
                args=(audio_data,), 
                daemon=True
            ).start()

    def _process_utterance(self, audio_data: bytes):
        req_id = self._request_id
        
        def is_interrupted():
            return self._request_id != req_id
            
        try:
            # 1. Speech to Text
            # Convert bytes to numpy int16 array
            audio_np = np.frombuffer(audio_data, dtype=np.int16)
            
            # Process chunk using speech engine
            result = self.speech_engine.process_chunk(audio_np, speech_state="FINAL")
            transcript = result.text.strip()
            
            # Filter out common Whisper silence hallucinations
            hallucinations = [
                "thank you.", "thanks for watching.", "thanks.", 
                "you're welcome.", "subscribe.", "bye.", 
                "thank you for watching."
            ]
            
            if not transcript or transcript.lower() in hallucinations:
                if not is_interrupted():
                    self.emit("idle")
                    self._is_processing = False
                return
                
            import time
            import string
            current_time = time.time()
            
            def normalize_text(t):
                return t.translate(str.maketrans('', '', string.punctuation)).lower().strip()
                
            def is_noise_hallucination(text: str) -> bool:
                # 1. Check for single repeated word: "bum bum bum", "no no no"
                words = [w.strip() for w in normalize_text(text).split() if w.strip()]
                if len(words) >= 3 and len(set(words)) == 1:
                    return True
                
                # 2. Check for single repeated letter: "S-S-S-S", "L-L-L-L", "aaaaa"
                alpha = [c.lower() for c in text if c.isalpha()]
                if len(alpha) >= 4 and len(set(alpha)) == 1:
                    return True
                    
                return False

            if is_noise_hallucination(transcript):
                logger.info(f"Discarding hallucination (noise pattern): '{transcript}'")
                if not is_interrupted():
                    self.emit("idle")
                    self._is_processing = False
                return
            
            # If it's the exact same transcript, and it's either recent (<15s) or a longer phrase (>3 words),
            # it is almost certainly Whisper hallucinating the previous context due to noise.
            is_recent = (current_time - self._last_transcript_time) < 15
            word_count = len(transcript.split())
            
            if normalize_text(transcript) == normalize_text(self._last_transcript) and len(transcript) > 0:
                if is_recent or word_count >= 1:
                    logger.info(f"Discarding likely Whisper hallucination (repeated text): '{transcript}'")
                    if not is_interrupted():
                        self.emit("idle")
                        self._is_processing = False
                    return
                
            self._last_transcript = transcript
            self._last_transcript_time = current_time
            
            # --- INTERRUPT LOGIC ---
            # If the AI was already processing/speaking, and voice interrupt is enabled,
            # we cancel the previous thread by incrementing the request ID, but update
            # this thread's req_id so it survives!
            if self.voice_interrupt_enabled and self._is_processing and not is_interrupted():
                self._request_id += 1
                req_id = self._request_id
                self.emit("interrupt")
                
            self.emit("final_transcript", text=transcript)
            
            if is_interrupted():
                self._is_processing = False
                return
                
            # 2. Get chat session and generate response
            chat = self.get_chat_session(self.session_id)
            
            def chat_event_handler(event_type: str, value):
                # Forward agent events to client
                if event_type == "thinking":
                    self.emit("agent_thinking")
                elif event_type == "chunk":
                    self.emit("agent_chunk", text=str(value))
                elif event_type == "tool":
                    # Emit tool usage inside <think> tags so the UI routes it to the reasoning panel.
                    # This lets the user see what tools are running during voice mode.
                    self.emit("agent_chunk", text=f"\n<think>Running tool: {value}</think>\n")
            
            with chat.lock:
                # Append instruction for brief, conversational voice responses, but preserve tool strictness
                prompt = transcript + "\n\n(NOTE: We are in Voice Chat mode. If replying in text, keep it very short and conversational. However, if a tool is needed, you MUST still output ONLY the raw JSON tool call, just like normal.)"
                answer = chat.ask(prompt, on_event=chat_event_handler, is_interrupted=is_interrupted)
            
            if is_interrupted():
                self._is_processing = False
                return
                
            answer_text = ""
            if isinstance(answer, dict):
                answer_text = answer.get("response", answer.get("message", ""))
            elif isinstance(answer, str):
                answer_text = answer
                
            if not answer_text:
                self._is_processing = False
                self.emit("idle")
                return
                
            # Notify frontend of the final agent response
            # (Reasoning parsing could be done if needed, but we rely on chunking)
            self.emit("agent_response", text=answer_text)
                
            # 3. Text to Speech Streaming
            answer_text = answer_text.strip()
            
            # Strip reasoning tags before sending to TTS
            import re
            clean_text = re.sub(r'<think>.*?</think>', '', answer_text, flags=re.DOTALL).strip()
            
            # Clean up the text for TTS: remove markdown links, raw URLs, file paths, and special symbols
            clean_text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', clean_text) # markdown links -> just text
            clean_text = re.sub(r'http[s]?://\S+', '', clean_text)           # raw URLs
            clean_text = re.sub(r'/[a-zA-Z0-9_./-]+', '', clean_text)        # linux paths
            clean_text = re.sub(r'[A-Za-z]:\\[^\s]+', '', clean_text)        # windows paths
            clean_text = clean_text.replace('*', '').replace('#', '').replace('`', '').replace('~', '')
            
            if clean_text:
                for chunk in text_to_speech_streaming(clean_text):
                    if is_interrupted():
                        break
                        
                    if not chunk.get("audio"):
                        continue
                        
                    # Package raw audio into wav buffer for client
                    buf = io.BytesIO()
                    with wave.open(buf, "wb") as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(chunk["sample_rate"])
                        wf.writeframes(chunk["audio"])
                    wav_bytes = buf.getvalue()
                    
                    self.emit("tts_audio", 
                        audio=base64.b64encode(wav_bytes).decode("ascii"),
                        sentence=chunk["sentence"],
                        index=chunk["index"],
                        is_last=chunk["is_last"]
                    )
            
        except Exception as e:
            logger.error(f"Error processing utterance: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.emit("error", message=str(e))
        finally:
            # We ONLY emit idle and reset if we were NOT interrupted.
            # If we were interrupted, a new process might already be running.
            if not is_interrupted():
                self.emit("idle")
                self._is_processing = False
