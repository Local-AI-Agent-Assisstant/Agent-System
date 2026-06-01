"""
ai_chat/__init__.py

Re-exports AiChat and the CLI entry point so that all existing callers
(web_api.py, server.py, etc.) continue to work with the same import paths:

    from ai_chat import AiChat          # unchanged
    from ai_chat import start_chat      # unchanged
"""

from .ai_chat import AiChat, start_chat, handle_file_command_interactive

__all__ = ["AiChat", "start_chat", "handle_file_command_interactive"]
