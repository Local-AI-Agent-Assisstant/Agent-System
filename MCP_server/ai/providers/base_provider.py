from abc import ABC, abstractmethod

class BaseProvider(ABC):
    @abstractmethod
    def load(self, model_name: str, settings: dict = None):
        """Loads a model into memory."""
        pass
        
    @abstractmethod
    def generate(self, messages: list, settings: dict = None) -> str:
        """Generates a non-streaming response."""
        pass
        
    @abstractmethod
    def stream(self, messages: list, on_event=None, is_interrupted=None, settings: dict = None):
        """Streams a response, yielding chunks or calling on_event."""
        pass

    @abstractmethod
    def cancel(self):
        """Cancels an ongoing generation."""
        pass

    @abstractmethod
    def unload(self):
        """Unloads the currently loaded model to free resources."""
        pass

    @abstractmethod
    def get_models(self) -> list:
        """Returns a list of available models for this provider."""
        pass
