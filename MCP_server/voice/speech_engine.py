"""
speech_engine.py
The Speech Understanding Engine — core transcript processing pipeline.

Pipeline order:
  1. Streaming STT (Whisper in chunked mode)
  2. Confidence Filtering
  3. Sliding Window Context Merge
  4. Transcript Correction (only on FINAL)

This module NEVER answers user questions, executes commands, acts as
assistant, invents text, or rewrites intent. Transcript accuracy is
more important than grammar.
"""

import logging
import re
import time
import warnings
import numpy as np
from dataclasses import dataclass, field
from typing import Optional

warnings.filterwarnings("ignore", category=UserWarning, module="whisper")

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class WordToken:
    """A single word with its confidence score."""
    word: str
    confidence: float
    is_uncertain: bool = False
    was_corrected: bool = False
    original_word: str = ""


@dataclass
class TranscriptResult:
    """Output schema for the speech understanding engine."""
    text: str
    is_final: bool
    confidence: float
    corrected_words: list[str] = field(default_factory=list)
    uncertain_words: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "is_final": self.is_final,
            "confidence": round(self.confidence, 2),
            "corrected_words": self.corrected_words,
            "uncertain_words": self.uncertain_words,
        }


# ---------------------------------------------------------------------------
# Common STT error corrections
# ---------------------------------------------------------------------------

# Only fix PROBABLE STT mistakes — never invent content
_CORRECTIONS = {
    # Common homophones / mishearings
    "fyle": "file",
    "tow": "to",
    "routen": "routine",
    "routeen": "routine",
    "rooting": "routine",
    "modle": "model",
    "modell": "model",
    "emale": "email",
    "e-male": "email",
    "shedule": "schedule",
    "scedule": "schedule",
    "commend": "command",
    "commant": "command",
    "asistant": "assistant",
    "assistent": "assistant",
    "seach": "search",
    "serch": "search",
    "calculater": "calculator",
    "calculater": "calculator",
    "planer": "planner",
    "messege": "message",
    "atachment": "attachment",
    "attatchment": "attachment",
    "wether": "weather",
    "wheather": "weather",
    "progrem": "program",
    "programm": "program",
    "compter": "computer",
    "computar": "computer",
    "opn": "open",
    "openn": "open",
    "cloze": "close",
    "deleet": "delete",
    "delet": "delete",
    "creat": "create",
    "runn": "run",
    "stopp": "stop",
    "startt": "start",
    "sendd": "send",
    "writte": "write",
    "rite": "write",
    "reed": "read",
    "reeed": "read",
}

# Words that should be capitalized (proper nouns / names)
_CAPITALIZE_WORDS = {
    "ahmed", "mohammed", "ali", "omar", "sara", "fatima",
    "google", "chrome", "firefox", "windows", "linux", "python",
    "javascript", "github", "gmail", "outlook", "discord",
    "whatsapp", "telegram", "youtube", "spotify",
    "monday", "tuesday", "wednesday", "thursday", "friday",
    "saturday", "sunday",
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
}

# Filler / hesitation words that are CLEARLY noise (not meaningful)
_NOISE_FILLERS = {"uh", "uhh", "uhhh", "um", "umm", "ummm", "hmm", "hmmm", "ah", "ahh"}


class SpeechUnderstandingEngine:
    """
    Real-time speech understanding pipeline.

    Usage:
        engine = SpeechUnderstandingEngine()

        # During streaming:
        result = engine.process_chunk(audio_chunk, speech_state="STREAMING")

        # On finalize (silence detected):
        result = engine.process_chunk(audio_chunk, speech_state="FINAL")

        # Reset for new utterance:
        engine.reset()
    """

    def __init__(
        self,
        confidence_threshold_realtime: float = 0.65,
        confidence_threshold_final: float = 0.75,
        context_window_words: int = 15,
        whisper_model_name: str = "small.en",
    ):
        self.confidence_threshold_realtime = confidence_threshold_realtime
        self.confidence_threshold_final = confidence_threshold_final
        self.context_window_words = context_window_words
        self.whisper_model_name = whisper_model_name

        # State
        self._previous_context: list[str] = []     # sliding window of recent words
        self._full_transcript: str = ""             # accumulated final transcript
        self._audio_buffer = np.array([], dtype=np.int16)

        # Whisper model (lazy loaded)
        self._model = None

    _GLOBAL_MODELS = {}

    def _ensure_model(self):
        """Lazy-load the Whisper model globally."""
        if self.whisper_model_name not in SpeechUnderstandingEngine._GLOBAL_MODELS:
            from faster_whisper import WhisperModel
            logger.info(f"Loading Faster Whisper model: {self.whisper_model_name}")
            # Use faster-whisper on CPU with int8 quantization for massive speedup and low memory
            SpeechUnderstandingEngine._GLOBAL_MODELS[self.whisper_model_name] = WhisperModel(self.whisper_model_name, device="cpu", compute_type="int8")
            logger.info("Faster Whisper model loaded")
        self._model = SpeechUnderstandingEngine._GLOBAL_MODELS[self.whisper_model_name]

    def preload_model(self):
        """Eagerly load the model and run a dummy inference to trigger JIT compilation."""
        self._ensure_model()
        logger.info("Warming up Whisper model...")
        dummy_audio = np.zeros(16000, dtype=np.float32)
        try:
            list(self._model.transcribe(dummy_audio, language="en"))
        except Exception:
            pass
        logger.info("Whisper warmup complete")

    def reset(self):
        """Reset state for a new utterance/session."""
        self._previous_context = []
        self._full_transcript = ""
        self._audio_buffer = np.array([], dtype=np.int16)

    def reset_audio_only(self):
        """Reset only the audio buffer, preserving context."""
        self._audio_buffer = np.array([], dtype=np.int16)

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def process_chunk(
        self,
        audio_chunk: np.ndarray,
        speech_state: str = "STREAMING",
        sample_rate: int = 16000,
    ) -> TranscriptResult:
        """
        Process an audio chunk through the full pipeline.

        Args:
            audio_chunk:  numpy int16 array of audio samples
            speech_state: "STREAMING" or "FINAL"
            sample_rate:  sample rate (must be 16000)

        Returns:
            TranscriptResult with text, confidence, corrections, etc.
        """
        self._ensure_model()

        if speech_state == "FINAL":
            audio = audio_chunk
        else:
            audio = audio_chunk

        # 1. Run Whisper STT on accumulated buffer
        import time
        start = time.time()
        raw_text, word_tokens = self._transcribe(audio, sample_rate)
        
        elapsed = time.time() - start
        if speech_state == "STREAMING" and elapsed > 1.5:
            logger.warning(f"STT streaming timeout ({elapsed:.2f}s) - skipping partial result")
            return TranscriptResult(
                text="",
                is_final=False,
                confidence=0.0,
            )

        if not raw_text.strip():
            result = TranscriptResult(
                text=self._full_transcript,
                is_final=(speech_state == "FINAL"),
                confidence=0.0,
            )
            if speech_state == "STREAMING":
                self._last_partial_result = result
            return result

        if speech_state == "STREAMING":
            result = TranscriptResult(
                text=raw_text.strip(),
                is_final=False,
                confidence=0.0,
                corrected_words=[],
                uncertain_words=[]
            )
            self._last_partial_result = result
            return result

        # 2. Confidence filtering
        word_tokens = self._confidence_filter(
            word_tokens,
            threshold=self.confidence_threshold_final,
        )

        # 3. Transcript output
        merged_text = raw_text

        self._full_transcript = merged_text
        # Clear audio buffer after final
        self._audio_buffer = np.array([], dtype=np.int16)

        # Calculate average confidence
        avg_confidence = (
            sum(w.confidence for w in word_tokens) / len(word_tokens)
            if word_tokens
            else 0.0
        )

        return TranscriptResult(
            text=merged_text.strip(),
            is_final=(speech_state == "FINAL"),
            confidence=avg_confidence,
            corrected_words=[],
            uncertain_words=[w.word for w in word_tokens if w.is_uncertain],
        )

    # ------------------------------------------------------------------
    # Stage 1: STT
    # ------------------------------------------------------------------

    def _transcribe(
        self, audio: np.ndarray, sample_rate: int = 16000
    ) -> tuple[str, list[WordToken]]:
        """
        Run Faster Whisper on the audio buffer.
        Returns raw text and list of WordTokens with confidence.
        """
        try:
            # Convert int16 to float32 for Whisper
            audio_f = audio.astype(np.float32) / 32768.0

            # Use faster-whisper transcribe with stricter VAD to ignore fan noise
            segments, info = self._model.transcribe(
                audio_f,
                language="en",
                word_timestamps=True,
                beam_size=3,
                temperature=0.0,
                condition_on_previous_text=False,
                vad_filter=True,
                vad_parameters=dict(
                    threshold=0.6,               # higher threshold to ignore background noise
                    min_speech_duration_ms=250,  # require at least 250ms of speech
                    min_silence_duration_ms=1000 # wait 1s before cutting
                )
            )

            raw_text_parts = []
            word_tokens = []
            
            for segment in segments:
                raw_text_parts.append(segment.text.strip())
                if segment.words:
                    for word_info in segment.words:
                        word = word_info.word.strip()
                        prob = word_info.probability
                        if word:
                            word_tokens.append(WordToken(word=word, confidence=prob))

            raw_text = " ".join(raw_text_parts).strip()

            # If no word-level data, create tokens from text
            if not word_tokens and raw_text:
                for w in raw_text.split():
                    word_tokens.append(WordToken(word=w, confidence=0.5))

            return raw_text, word_tokens

        except Exception as e:
            import traceback
            logger.error(f"Whisper transcription error: {e}")
            logger.error(traceback.format_exc())
            return "", []

    # ------------------------------------------------------------------
    # Stage 2: Confidence Filtering
    # ------------------------------------------------------------------

    def _confidence_filter(
        self, tokens: list[WordToken], threshold: float
    ) -> list[WordToken]:
        """
        Mark tokens below confidence threshold as uncertain.
        Never rewrite high-confidence words.
        Prefer nearby context before replacing words.
        """
        for i, token in enumerate(tokens):
            if token.confidence < threshold:
                token.is_uncertain = True

        return tokens

    def _correct_transcript(self, text: str) -> tuple[str, list[str]]:
        """
        Lightweight rule-based correction for common STT errors.
          - Preserve commands exactly
          - Remove noise fillers only if clearly noise

        Returns:
            (corrected_text, list_of_corrected_words)
        """
        if not text.strip():
            return text, []

        words = text.split()
        corrected_words = []
        result = []

        for i, word in enumerate(words):
            word_lower = word.lower().strip(".,!?;:'\"")
            original = word

            # 1. Remove clear noise fillers (but keep "uh" etc. if they
            #    seem intentional, e.g. followed by meaningful content)
            if word_lower in _NOISE_FILLERS:
                # Only remove if surrounded by other words (not the only word)
                if len(words) > 1:
                    continue

            # 2. Fix known STT mistakes
            clean_word = word_lower.rstrip(".,!?;:'\"")

            # 1.b Filter out fan noise hallucinations (e.g. "aaaaa", "mmmmm")
            # If the word is more than 4 letters and is just the same letter repeating
            if len(clean_word) > 4 and len(set(clean_word)) == 1:
                continue

            if clean_word in _CORRECTIONS:
                correction = _CORRECTIONS[clean_word]
                # Preserve original punctuation
                suffix = word[len(clean_word):] if len(word) > len(clean_word) else ""
                # Preserve original casing pattern
                if word[0].isupper():
                    correction = correction.capitalize()
                word = correction + suffix
                corrected_words.append(correction)

            # 3. Capitalize proper nouns
            elif clean_word in _CAPITALIZE_WORDS:
                suffix = word[len(clean_word):] if len(word) > len(clean_word) else ""
                word = clean_word.capitalize() + suffix
                if word != original:
                    corrected_words.append(word.rstrip(".,!?;:'\""))

            # 4. Fix missing "to" after "want" when followed by a verb
            #    e.g. "I want build" → "I want to build"
            if i > 0 and words[i-1].lower() == "want" and word_lower not in {"to", "a", "the", "this", "that"}:
                result.append("to")
                corrected_words.append("to")

            result.append(word)

        corrected_text = " ".join(result)

        # 5. Capitalize first letter of sentence
        if corrected_text and corrected_text[0].islower():
            corrected_text = corrected_text[0].upper() + corrected_text[1:]

        return corrected_text, corrected_words

    # ------------------------------------------------------------------
    # Convenience: process raw audio file (for /api/voice fallback)
    # ------------------------------------------------------------------

    def transcribe_file(self, audio_path: str) -> TranscriptResult:
        """
        Transcribe an entire audio file (fallback for REST endpoint).
        Applies the full pipeline with FINAL state.
        """
        self._ensure_model()

        try:
            segments, info = self._model.transcribe(
                audio_path,
                language="en",
                word_timestamps=True,
            )

            raw_text_parts = []
            word_tokens = []
            for segment in segments:
                raw_text_parts.append(segment.text.strip())
                if segment.words:
                    for word_info in segment.words:
                        word = word_info.word.strip()
                        prob = word_info.probability
                        if word:
                            word_tokens.append(WordToken(word=word, confidence=prob))
                            
            raw_text = " ".join(raw_text_parts).strip()

            if not word_tokens and raw_text:
                for w in raw_text.split():
                    word_tokens.append(WordToken(word=w, confidence=0.5))

            # Apply confidence filtering
            word_tokens = self._confidence_filter(
                word_tokens, self.confidence_threshold_final
            )

            # Apply correction
            text = " ".join(w.word for w in word_tokens)
            corrected_text, corrected_words = self._correct_transcript(text)

            avg_confidence = (
                sum(w.confidence for w in word_tokens) / len(word_tokens)
                if word_tokens
                else 0.0
            )

            return TranscriptResult(
                text=corrected_text,
                is_final=True,
                confidence=avg_confidence,
                corrected_words=corrected_words,
                uncertain_words=[w.word for w in word_tokens if w.is_uncertain],
            )

        except Exception as e:
            logger.error(f"File transcription error: {e}")
            return TranscriptResult(
                text=f"Error transcribing audio: {e}",
                is_final=True,
                confidence=0.0,
            )
