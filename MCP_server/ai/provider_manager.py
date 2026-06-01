from .providers.ollama_provider import OllamaProvider

class ProviderManager:
    def __init__(self):
        self.providers = {
            "ollama": OllamaProvider(),
        }
        self.current_provider_name = "ollama"

    def get_provider(self, name: str = None):
        if name is None:
            name = self.current_provider_name
        return self.providers.get(name, self.providers["ollama"])

    def set_current_provider(self, name: str):
        if name in self.providers:
            self.current_provider_name = name
            return True
        return False

    def get_current_provider_name(self):
        return self.current_provider_name

    def call_model(self, messages: list, on_event=None, is_interrupted=None, settings: dict = None) -> str:
        provider = self.get_provider()
        return provider.stream(messages, on_event=on_event, is_interrupted=is_interrupted, settings=settings)

    def unload(self, name: str = None):
        provider = self.get_provider(name)
        provider.unload()

# Global singleton
provider_manager = ProviderManager()
