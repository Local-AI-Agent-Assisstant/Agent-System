from abc import ABC, abstractmethod
from fastapi import WebSocket
from typing import Any

class VoiceProvider(ABC):
    """
    Abstract interface for Voice Engine Providers (Local / LiveKit).
    Handles the lifecycle of a real-time voice session over WebSocket.
    """
    def __init__(self, session_id: str, websocket: WebSocket, get_chat_session_fn):
        self.session_id = session_id
        self.websocket = websocket
        self.get_chat_session = get_chat_session_fn

    @abstractmethod
    async def connect(self):
        """
        Main entrypoint loop. Blocks while the connection is alive.
        """
        pass

    @abstractmethod
    async def interrupt(self):
        """
        Called when the user issues an interruption (stops TTS/AI generation).
        """
        pass

    @abstractmethod
    async def handle_message(self, msg: dict):
        """
        Called when a JSON text message is received from the client.
        """
        pass

    @abstractmethod
    async def send_audio(self, audio_data: bytes):
        """
        Called when raw audio is received from the client over WebSocket.
        Note: Cloud providers (LiveKit) may bypass this if using WebRTC.
        """
        pass

    @abstractmethod
    async def cleanup(self):
        """
        Perform any necessary cleanup before the provider is destroyed.
        """
        pass
