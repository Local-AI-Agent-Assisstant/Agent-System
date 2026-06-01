"""
model_client.py
Responsible for all communication with the active model provider.
Now acts as a proxy to the ProviderManager.
"""

import sys
import os

# Ensure the ai folder is accessible if needed, though we are in MCP_server
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from ai.provider_manager import provider_manager

def force_stop_ollama():
    """Unloads the current model to free CPU/RAM and abort any ongoing generation."""
    provider_manager.unload()

def call_model(messages: list, on_event=None, is_interrupted=None) -> str:
    """
    Send *messages* to the current active provider and return the full reply string.
    """
    # Fetch settings specific to the current model, this can be expanded if needed
    # Right now, settings are passed empty, but later we can load them from disk based on provider config.
    settings = {}
    
    return provider_manager.call_model(messages, on_event=on_event, is_interrupted=is_interrupted, settings=settings)
