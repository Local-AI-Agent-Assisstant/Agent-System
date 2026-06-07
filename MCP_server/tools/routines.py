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
    CRITICAL MEMORY RULE: To pass data from one step to another (like pasting a search result or contact name), NEVER use literal placeholder text (like <JOKE>) and NEVER use clipboard operations like {Ctrl}v. You MUST use the syntax {{memory.TOOL_NAME}} inside your text string.
    Example: {"tool": "computer_control", "args": {"action": "type", "text": "{{memory.deep_search}}"}}
    prompt: optional custom instructions injected into the AI context when the routine runs.
    """
    from . import TOOL_REGISTRY  # Import inside to avoid circular dependency issues
    from ai_chat.model_client import call_model
    import json
    
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
        
    # --- SMART OPTIMIZATION PASS ---
    try:
        opt_prompt = (
            "You are an expert Windows UI automation optimizer. Review the following JSON array of routine steps.\n"
            "Apply the following smart fixes to make the routine bulletproof:\n"
            "1. Wait Time Normalization: If a 'wait' action text is a number > 60, it was likely ms by mistake. Convert to seconds (e.g. 3000 -> 3).\n"
            "2. Browser URL Copying: To copy a link, output a 'hotkey' step with text '{Ctrl}l{Ctrl}c' to copy directly from the address bar instead of clicking on-screen buttons.\n"
            "3. Web App Hotkeys: For muting camera/mic in browsers, use 'hotkey' '{Ctrl}e' and '{Ctrl}d' instead of clicking targets.\n"
            "4. App Searching: NEVER use 'type' with 'target_name' for searching in WhatsApp. Output a 'hotkey' '{Ctrl}f' to focus search, then a 'type' action WITHOUT 'target_name' for the text + '{Enter}'.\n"
            "5. Pasting / Dynamic Data: NEVER use 'hotkey' '{Ctrl}v' or literal placeholders (like <JOKE>) to paste dynamic data! You MUST use a 'type' action with the explicit memory syntax `{{memory.TOOL_NAME}}`. For sending messages, use '{Enter}{{memory.TOOL_NAME}}{Enter}'. Do not use 'click' with 'target_name' for these.\n\n"
            "Output ONLY the optimized raw JSON array of the steps. Do not include markdown blocks like ```json."
        )
        messages = [
            {"role": "system", "content": opt_prompt},
            {"role": "user", "content": json.dumps(valid_steps)}
        ]
        
        reply = call_model(messages)
        # Strip markdown if model still included it
        cleaned_reply = reply.replace('```json', '').replace('```', '').strip()
        optimized_steps = json.loads(cleaned_reply)
        
        if isinstance(optimized_steps, list) and len(optimized_steps) > 0:
            valid_steps = optimized_steps
    except Exception as e:
        print(f"Warning: Smart optimization pass failed: {e}")
        # Safely fallback to original steps if optimizer fails
    
    routines = load_routines()
    routines[name] = {
        "description": description,
        "prompt": prompt,
        "steps": valid_steps
    }
    save_routines(routines)
    return f"Routine '{name}' successfully created and saved with {len(valid_steps)} steps. (Optimization applied)"

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
