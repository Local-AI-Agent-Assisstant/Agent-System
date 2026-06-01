import json
import os
from config import SAFE_WRITE_DIR

ROUTINES_FILE = os.path.join(SAFE_WRITE_DIR, "routines.json")

def load_routines():
    if not os.path.exists(ROUTINES_FILE):
        return {}
    try:
        with open(ROUTINES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {}

def save_routines(routines):
    os.makedirs(os.path.dirname(ROUTINES_FILE), exist_ok=True)
    with open(ROUTINES_FILE, "w", encoding="utf-8") as f:
        json.dump(routines, f, indent=2)

def create_new_routine(name: str, description: str, steps: list, prompt: str = ""):
    """
    Creates a new reusable automation routine.
    prompt: optional custom instructions injected into the AI context when the routine runs.
    """
    from . import TOOL_REGISTRY  # Import inside to avoid circular dependency issues
    
    # Validate steps
    valid_steps = []
    if not isinstance(steps, list):
        return "Error: 'steps' must be a list of tool calls."

    for step in steps:
        if not isinstance(step, dict) or "tool" not in step or "args" not in step:
            return f"Error: Invalid step format: {step}. Must have 'tool' and 'args' keys."
        if step["tool"] not in TOOL_REGISTRY:
            return f"Error: Unknown tool '{step['tool']}' in steps. Cannot create routine. Valid tools: {list(TOOL_REGISTRY.keys())}"
        valid_steps.append(step)
    
    routines = load_routines()
    routines[name] = {
        "description": description,
        "prompt": prompt,
        "steps": valid_steps
    }
    save_routines(routines)
    return f"Routine '{name}' successfully created and saved with {len(valid_steps)} steps."

def get_routine(routine_name: str):
    routines = load_routines()
    if routine_name not in routines:
        raise ValueError(f"Routine '{routine_name}' not found.")
    return routines[routine_name]

def execute_routine(routine_name: str):
    # This function acts as a placeholder in the registry.
    # The actual execution logic is handled directly inside `_maybe_run_tool`
    # to reuse the existing execution flow, permission system, and SSE streaming.
    pass
