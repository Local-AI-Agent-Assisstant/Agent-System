import asyncio
import base64
import json
import logging
import numpy as np
import time
from fastapi import WebSocket, WebSocketDisconnect

import config
from voice.tts_streaming import StreamingTTS
from voice.providers.base_provider import VoiceProvider

logger = logging.getLogger(__name__)

class LocalVoiceProvider(VoiceProvider):
    """
    Manages the real-time voice pipeline for a single WebSocket connection locally.
    Handles VAD, STT buffering, interacting with the Agent, and streaming Piper TTS.
    """
    def __init__(self, session_id: str, websocket: WebSocket, get_chat_session_fn):
        super().__init__(session_id, websocket, get_chat_session_fn)
        
        # State
        self.speech_active = False
        self.is_agent_busy = False
        self.agent_task = None
        self.last_stt_time = 0
        self.last_audio_time = time.time()
        self.finalizing = False
        self.stt_chunk_buffer = np.array([], dtype=np.int16)
        self.audio_buffer = np.array([], dtype=np.int16)
        self.pre_speech_buffer = np.array([], dtype=np.int16)
        self.MAX_PREBUFFER = int(config.VOICE_SAMPLE_RATE * 1.0)
        self.tts_cancel_event = asyncio.Event()
        
        # Lazy loading components
        self.vad = None
        self.engine = None
        self.preprocessor = None
        self._init_components()

    def _init_components(self):
        try:
            from voice.audio_preprocessor import AudioPreprocessor
            from voice.vad import VoiceActivityDetector
            from voice.speech_engine import SpeechUnderstandingEngine
        except ImportError as e:
            logger.error(f"Failed to load voice components: {e}")
            raise

        self.preprocessor = AudioPreprocessor(sample_rate=config.VOICE_SAMPLE_RATE)
        self.vad = VoiceActivityDetector(
            speech_threshold=config.VAD_SPEECH_THRESHOLD,
            silence_timeout_ms=config.VAD_SILENCE_TIMEOUT_MS,
        )
        self.engine = SpeechUnderstandingEngine(
            confidence_threshold_realtime=config.STT_CONFIDENCE_THRESHOLD_REALTIME,
            confidence_threshold_final=config.STT_CONFIDENCE_THRESHOLD_FINAL,
            context_window_words=config.STT_CONTEXT_WINDOW_WORDS,
            whisper_model_name=config.WHISPER_MODEL_FINAL,
        )
        
        # Fire model warmup in the background so it's ready instantly when they speak
        asyncio.create_task(asyncio.to_thread(self.engine.preload_model))

    async def connect(self):
        """Main connection setup (called by ProviderManager)."""
        pass

    async def handle_message(self, cmd: dict):
        cmd_type = cmd.get("type")

        if cmd_type == "finalize":
            await self._finalize_speech()
        elif cmd_type in ("cancel", "reset", "interrupt"):
            await self.interrupt()
        elif cmd_type == "force_speech":
            self.vad.force_speech()
            self.speech_active = True
            self.stt_chunk_buffer = self.pre_speech_buffer.copy()
            self.engine.reset_audio_only()
            await self.websocket.send_json({"type": "vad", "state": "speech_start"})

    async def send_audio(self, raw_bytes: bytes):
        if not raw_bytes:
            return

        self.last_audio_time = time.time()
        audio_chunk = np.frombuffer(raw_bytes, dtype=np.int16)
        
        if not hasattr(self, 'audio_buffer'):
            self.audio_buffer = np.array([], dtype=np.int16)
        self.audio_buffer = np.concatenate([self.audio_buffer, audio_chunk])

        frame_size = 480
        while len(self.audio_buffer) >= frame_size:
            frame = self.audio_buffer[:frame_size]
            self.audio_buffer = self.audio_buffer[frame_size:]

            try:
                frame = self.preprocessor.process(frame)
            except Exception:
                pass

            self.pre_speech_buffer = np.concatenate([self.pre_speech_buffer, frame])
            if len(self.pre_speech_buffer) > self.MAX_PREBUFFER:
                self.pre_speech_buffer = self.pre_speech_buffer[-self.MAX_PREBUFFER:]

            vad_event = self.vad.process_frame(frame)

            if vad_event == "speech_start":
                self.speech_active = True
                self.stt_chunk_buffer = self.pre_speech_buffer.copy()
                self.pre_speech_buffer = np.array([], dtype=np.int16)
                
                if self.is_agent_busy:
                    await self.interrupt()
                await self.websocket.send_json({"type": "vad", "state": "speech_start"})

            elif vad_event == "speech_end":
                self.speech_active = False
                await self.websocket.send_json({"type": "vad", "state": "speech_end"})
                await self._finalize_speech()

            if self.speech_active:
                self.stt_chunk_buffer = np.concatenate([self.stt_chunk_buffer, frame])

        if self.speech_active:
            now = time.time()
            if (now - self.last_stt_time) >= (config.VOICE_CHUNK_MS / 1000) and self.stt_chunk_buffer.size > 0:
                if not getattr(self, 'is_partial_transcribing', False):
                    self.last_stt_time = now
                    asyncio.create_task(self.transcribe_partial(self.stt_chunk_buffer.copy()))

    async def transcribe_partial(self, chunk_to_process):
        self.is_partial_transcribing = True
        try:
            result = await asyncio.to_thread(
                self.engine.process_chunk, chunk_to_process, "STREAMING"
            )
            if result.text.strip():
                await self.websocket.send_json({
                    "type": "partial_transcript",
                    "text": result.text,
                    "confidence": round(result.confidence, 2),
                })
        except Exception:
            pass
        finally:
            self.is_partial_transcribing = False

    async def _finalize_speech(self):
        if self.finalizing:
            return
            
            
        if self.stt_chunk_buffer.size > 0 or getattr(self.engine, '_audio_buffer', np.array([])).size > 0:
            self.finalizing = True
            try:
                logger.info("[VOICE_ENTER] Finalizing speech...")
                t0 = time.time()
                self.last_stt_time = 0
                try:
                    result = await asyncio.wait_for(
                        asyncio.to_thread(self.engine.process_chunk, self.stt_chunk_buffer, "FINAL"),
                        timeout=15.0
                    )
                except asyncio.TimeoutError:
                    logger.warning("STT Finalize timed out")
                    await self.websocket.send_json({"type": "idle"})
                    self.stt_chunk_buffer = np.array([], dtype=np.int16)
                    self.speech_active = False
                    if not self.is_agent_busy:
                        self.vad.reset()
                        self.engine.reset()
                    return
                finally:
                    await self.websocket.send_json({"type": "thinking"})
                
                self.stt_chunk_buffer = np.array([], dtype=np.int16)
                
                t1 = time.time()
                logger.info(f"[VOICE_STT] Transcription latency: {t1 - t0:.3f}s")
                
                await self.websocket.send_json({
                    "type": "final_transcript",
                    **result.to_dict(),
                })
                
                logger.info("[VOICE_FINALIZE]")
                logger.info(f"FINAL=[{result.text}]")
                
                if result.text and len(result.text.strip()) >= 2:
                    await self.websocket.send_json({"type": "thinking"})
                    logger.info("[VOICE_AGENT] START")
                    await self.ask_agent(result)
                    logger.info("[VOICE_AGENT] END")
                else:
                    await self.websocket.send_json({"type": "idle"})
            finally:
                self.finalizing = False

        self.speech_active = False
        self.last_partial = ""
        if not self.is_agent_busy:
            self.vad.reset()
            self.engine.reset()

    async def interrupt(self):
        if self.agent_task and not self.agent_task.done():
            self.agent_task.cancel()
        self.tts_cancel_event.set()
        self.is_agent_busy = False
        self.stt_chunk_buffer = np.array([], dtype=np.int16)
        self.speech_active = False
        self.vad.reset()
        self.engine.reset_audio_only()

    async def cleanup(self):
        await self.interrupt()

    async def ask_agent(self, transcript_result):
        self.is_agent_busy = True
        try:
            logger.info("VOICE → AI START")
            chat_session = self.get_chat_session(self.session_id)
            agent_input = transcript_result.text + "\n\n[System: Respond very briefly and conversationally in 1-2 short sentences maximum. This is a fast-paced voice chat, avoid long lists or formatting.]"

            loop = asyncio.get_running_loop()

            def on_model_event(event_type, data):
                if event_type == "chunk":
                    asyncio.run_coroutine_threadsafe(
                        self.websocket.send_json({"type": "agent_chunk", "text": data}), loop
                    )

            def run_ask():
                return chat_session.ask(agent_input, on_event=on_model_event)

            t_agent_start = time.time()
            logger.info("CALLING MODEL")
            try:
                result = await asyncio.wait_for(
                    asyncio.to_thread(run_ask),
                    timeout=300.0  # Increased from 30s to 300s to support reasoning models and tools
                )
            except asyncio.TimeoutError:
                logger.error("AGENT TIMEOUT")
                await self.websocket.send_json({
                    "type": "error",
                    "message": "Agent timeout"
                })
                await self.websocket.send_json({
                    "type": "idle"
                })
                return
            
            logger.info("MODEL RETURNED")
            t_agent_end = time.time()
            logger.info(f"[VOICE_AGENT] Agent latency: {t_agent_end - t_agent_start:.3f}s")

            if isinstance(result, dict):
                response_text = result.get("response") or result.get("message") or ""
            else:
                response_text = str(result)
                
            # Extract reasoning
            import re
            reasoning = ""
            think_match = re.search(r"<think>(.*?)</think>", response_text, flags=re.DOTALL | re.IGNORECASE)
            if think_match:
                reasoning = think_match.group(1).strip()
                response_text = re.sub(r"<think>.*?</think>", "", response_text, flags=re.DOTALL | re.IGNORECASE).strip()

            await self.websocket.send_json({
                "type": "agent_response",
                "text": response_text,
                "reasoning": reasoning,
            })

            await self.websocket.send_json({"type": "responding"})
            logger.info("START TTS")
            await self.speak(response_text)
            logger.info("END TTS")

        except Exception as e:
            logger.error(f"Agent task error: {e}")
            try:
                await self.websocket.send_json({"type": "error", "message": str(e)})
            except Exception:
                pass
        finally:
            self.engine.reset_audio_only()
            self.is_agent_busy = False
            try:
                await self.websocket.send_json({"type": "idle"})
            except Exception:
                pass

    async def speak(self, text: str):
        import re as _re
        def _strip_md(t):
            t = _re.sub(r'#{1,6}\s+', '', t)
            t = _re.sub(r'\*\*(.+?)\*\*', r'\1', t)
            t = _re.sub(r'\*(.+?)\*', r'\1', t)
            t = _re.sub(r'`{3}[\s\S]*?`{3}', '', t)
            t = _re.sub(r'`(.+?)`', r'\1', t)
            t = _re.sub(r'\[(.+?)\]\(.+?\)', r'\1', t)
            # Remove raw URLs
            t = _re.sub(r'https?://[^\s()]+', 'this link', t)
            # Remove Windows paths (e.g. C:\Users\...)
            t = _re.sub(r'[a-zA-Z]:\\[^\s()]+|[a-zA-Z]:/[^\s()]+', 'this file', t)
            # Remove Unix paths (e.g. /home/user/...)
            t = _re.sub(r'/(?:[a-zA-Z0-9_-]+/)+[a-zA-Z0-9_.-]+', 'this file', t)
            
            t = _re.sub(r'^[-*+]\s+', '', t, flags=_re.MULTILINE)
            t = _re.sub(r'^\d+\.\s+', '', t, flags=_re.MULTILINE)
            t = _re.sub(r'>\s+', '', t)
            t = _re.sub(r'---+', '', t)
            t = _re.sub(r'\n{2,}', '. ', t)
            t = _re.sub(r'\n', ' ', t)
            return t.strip()

        clean_text = _strip_md(text)
        if clean_text:
            try:
                import io, wave as wave_mod
                
                logger.info("[VOICE_TTS] Starting TTS streaming...")
                t_tts_start = time.time()
                first_chunk = True
                self.tts_cancel_event.clear()
                
                for chunk in text_to_speech_streaming(clean_text):
                    if self.tts_cancel_event.is_set():
                        logger.info("[VOICE_TTS] TTS canceled during streaming.")
                        break
                        
                    if first_chunk:
                        t_tts_first = time.time()
                        logger.info(f"[VOICE_TTS] Time to first audio chunk: {t_tts_first - t_tts_start:.3f}s")
                        first_chunk = False
                        
                    buf = io.BytesIO()
                    with wave_mod.open(buf, "wb") as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(chunk["sample_rate"])
                        wf.writeframes(chunk["audio"])

                    await self.websocket.send_json({
                        "type": "tts_audio",
                        "audio": base64.b64encode(buf.getvalue()).decode("ascii"),
                        "index": chunk["index"],
                        "is_last": chunk["is_last"],
                    })
                    
                t_tts_end = time.time()
                logger.info(f"[VOICE_TTS] Total TTS latency: {t_tts_end - t_tts_start:.3f}s")
            except Exception as e:
                logger.error(f"TTS streaming error: {e}")
                await self.websocket.send_json({"type": "error", "message": f"TTS error: {e}"})
                
        logger.info("[VOICE_EXIT] Pipeline complete.")
