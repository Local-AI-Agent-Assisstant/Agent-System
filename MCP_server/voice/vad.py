import time
import numpy as np
import logging

logger = logging.getLogger(__name__)

class VoiceActivityDetector:
    """
    A drastically simplified, lightweight Voice Activity Detector.
    Uses RMS audio energy (volume) to detect speech instead of heavy ML models.
    Zero dependencies, zero CPU freezing.
    """

    def __init__(self, silence_timeout_ms: int = 1200, speech_threshold: float = 0.5):
        self.silence_timeout = silence_timeout_ms / 1000.0
        
        # We start with a baseline noise floor and adapt it quickly
        self._noise_floor = 0.008
        
        # State tracking
        self._is_speaking = False
        self._last_speech_time = 0.0
        self.MIN_SPEECH_FRAMES = 10
        self._speech_frames = 0

    def reset(self):
        """Reset state for a new utterance."""
        self._is_speaking = False
        self._last_speech_time = 0.0
        self._speech_frames = 0
        
    def force_speech(self):
        """Force the detector into speaking mode instantly (for click-to-talk)."""
        self._is_speaking = True
        self._last_speech_time = time.time()
        self._speech_frames = self.MIN_SPEECH_FRAMES

    def process_frame(self, frame: bytes) -> str | None:
        """
        Process a raw audio frame (int16 PCM) and return VAD events.
        """
        now = time.time()
        
        # Convert bytes to numpy float32 for volume calculation
        frame_np = np.frombuffer(frame, dtype=np.int16)
        frame_f32 = frame_np.astype(np.float32) / 32768.0
        
        # Calculate RMS energy (volume) of the frame
        rms = np.sqrt(np.mean(frame_f32**2))
        
        # 2. Dynamic thresholding
        # The threshold is significantly above the background noise level to ignore fans
        threshold = max(self._noise_floor * 2.5, 0.012)
        
        # Also check Zero Crossing Rate to filter out low-frequency hums and high-frequency fan hiss
        zero_crossings = np.sum(np.abs(np.diff(np.signbit(frame_f32)))) / len(frame_f32)
        
        is_speech = (rms > threshold) and (0.01 < zero_crossings < 0.35)

        # 3. State Machine Updates
        if is_speech:
            # Slowly update noise floor even during speech so a loud fan doesn't permanently freeze it
            self._noise_floor = (self._noise_floor * 0.9995) + (rms * 0.0005)
            
            self._last_speech_time = now
            self._speech_frames += 1
            if not self._is_speaking and self._speech_frames >= self.MIN_SPEECH_FRAMES:
                self._is_speaking = True
                return "speech_start"
            elif self._is_speaking:
                return "speech_continue"
            return None
            
        else:
            self._speech_frames = max(0, self._speech_frames - 1)
            # Gradually update background noise floor during silence
            self._noise_floor = (self._noise_floor * 0.98) + (rms * 0.02)
            
            if self._is_speaking:
                silence_duration = now - self._last_speech_time
                if silence_duration > self.silence_timeout:
                    self._is_speaking = False
                    self._speech_frames = 0
                    return "speech_end"
                return "speech_continue"
                
        return None
