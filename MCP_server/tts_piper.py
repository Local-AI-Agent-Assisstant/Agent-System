import os
import tempfile
import logging
import urllib.request
import wave
import config

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VOICE_DIR = os.path.join(BASE_DIR, "voice", "models")

def get_current_model_paths():
    model_name = getattr(config, "VOICE_MODEL", getattr(config, "VOICE_DEFAULT", "en_US-ryan-medium"))
    model_file = f"{model_name}.onnx"
    config_file = f"{model_name}.onnx.json"
    return {
        "name": model_name,
        "model_path": os.path.join(VOICE_DIR, model_file),
        "config_path": os.path.join(VOICE_DIR, config_file)
    }


# Global voice instance cache
_voice_instance = None

def _download_file(url: str, dest_path: str):
    logger.info(f"Downloading {url} to {dest_path}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            out_file.write(response.read())
    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise RuntimeError(f"Failed to download voice model: {e}")

def _ensure_model_exists(paths):
    if not os.path.exists(VOICE_DIR):
        os.makedirs(VOICE_DIR, exist_ok=True)
        
    model_path = paths["model_path"]
    config_path = paths["config_path"]
    model_name = paths["name"]
    model_file = f"{model_name}.onnx"
    config_file = f"{model_name}.onnx.json"

    if not os.path.exists(model_path) or not os.path.exists(config_path):
        try:
            model_parts = model_name.split('-')
            language = model_parts[0]
            lang_short = language.split('_')[0]
            speaker = model_parts[1]
            quality = model_parts[2]
            hf_base = f"https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/{lang_short}/{language}/{speaker}/{quality}"
        except Exception:
            # Fallback if standard naming scheme isn't used
            hf_base = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/medium"

        if not os.path.exists(model_path):
            _download_file(f"{hf_base}/{model_file}", model_path)
        if not os.path.exists(config_path):
            _download_file(f"{hf_base}/{config_file}", config_path)

def _get_voice():
    global _voice_instance
    if _voice_instance is None:
        try:
            from piper.voice import PiperVoice
        except ImportError:
            raise RuntimeError("piper-tts is not installed. Please run: pip install piper-tts")
            
        paths = get_current_model_paths()
        _ensure_model_exists(paths)
        _voice_instance = PiperVoice.load(paths["model_path"], paths["config_path"])
    return _voice_instance

def get_installed_voices() -> list:
    if not os.path.exists(VOICE_DIR):
        return []
    voices = []
    for f in os.listdir(VOICE_DIR):
        if f.endswith(".onnx"):
            voices.append(f[:-5]) # remove .onnx
    return voices

def set_active_voice(name: str):
    global _voice_instance
    config.VOICE_MODEL = name
    _voice_instance = None # Force reload on next TTS call


def text_to_speech(text: str) -> str:
    """
    Converts text to speech using the piper-tts Python package.
    Returns the path to a temporary .wav file.
    """
    try:
        voice = _get_voice()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp_path = tmp.name
        tmp.close()
        
        with wave.open(tmp_path, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(voice.config.sample_rate)
            # PiperVoice synthesize_wav function writes audio frames to the wave file
            voice.synthesize_wav(text, wav_file)
            
        return tmp_path
    except Exception as e:
        logger.error(f"Piper TTS failed: {e}")
        raise RuntimeError(f"Piper TTS failed: {e}")

def text_to_speech_streaming(text: str):
    """
    Streaming TTS: yields audio chunks sentence-by-sentence.
    Each yield is a dict with keys: audio (bytes), sentence (str),
    index (int), is_last (bool), sample_rate (int).

    Falls back to generating full audio in one shot if the
    streaming module is unavailable.
    """
    try:
        from voice.tts_streaming import StreamingTTS # type: ignore
        tts = StreamingTTS()
        yield from tts.stream(text)
    except ImportError:
        # Fallback: generate entire audio at once, yield as single chunk
        wav_path = text_to_speech(text)
        try:
            import wave
            with wave.open(wav_path, "rb") as wf:
                pcm = wf.readframes(wf.getnframes())
                sample_rate = wf.getframerate()
            yield {
                "audio": pcm,
                "sentence": text,
                "index": 0,
                "is_last": True,
                "sample_rate": sample_rate,
            }
        finally:
            try:
                os.remove(wav_path)
            except OSError:
                pass
