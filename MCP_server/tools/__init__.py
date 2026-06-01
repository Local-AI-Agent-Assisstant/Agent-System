from .calculator import calculate
from .weather import get_current_weather
from .email import send_email_gmail
from .filesystem import write_file, pick_file_from_window, read_files
from .deep_search import deep_search
from .secret import get_secret_word
from .system_commands import system_commands_windows
from .planner import manage_planner
from .prompts import TOOL_SYSTEM_PROMPT
from .routines import create_new_routine, execute_routine
from .thinker import deep_think
from .system_action_commands import open_program, close_program
from .ui_control import computer_control





# Registry (name → function) so the chat can look up tools by string name
TOOL_REGISTRY = {
    "calculate": calculate,
    "get_secret_word": get_secret_word,
    "get_current_weather": get_current_weather,
    "send_email_gmail": send_email_gmail,
    "write_file": write_file,
    "system_commands_windows": system_commands_windows,
    "deep_search": deep_search,
    "manage_planner": manage_planner,
    "create_new_routine": create_new_routine,
    "execute_routine": execute_routine,
    "deep_think": deep_think,
    "open_program": open_program,
    "close_program": close_program,
    "computer_control": computer_control,
}

# Tools that will ASK the user before executing
# Add or remove tool names here to control which ones require permission
TOOLS_REQUIRING_PERMISSION = {
    "send_email_gmail",
    "write_file",
    "system_commands_windows",
    "get_current_weather",
    "get_secret_word",
    "calculate",
    "manage_planner",
    "create_new_routine",
    "open_program",
    "close_program",
    "computer_control",
}