"""
routine_engine.py
Responsible for tracking routine execution state and building the per-round
reminder message that guides the AI through multi-step routines.
"""

import json


def build_routine_reminder(routine_state: dict | None) -> tuple[str, dict | None]:
    """
    Given the current *routine_state* dict (or None), return:
      - The reminder string to append to the tool-result message.
      - The (possibly reset) routine_state for the next round.

    routine_state shape:
        {
            "routine_name": str,
            "description": str,
            "all_steps": list[dict],  # each step has at least {"tool": str}
            "completed": int,
            "custom_prompt": str,       # optional user execution instructions
            "memory": dict,             # maps tool_name -> result for all completed steps
        }
    """
    if not routine_state:
        return "", None

    total = len(routine_state["all_steps"])
    done = routine_state["completed"]

    if done < total:
        next_step = routine_state["all_steps"][done]
        next_tool = next_step.get("tool", "")
        next_args = next_step.get("args", {})
        
        custom = routine_state.get("custom_prompt", "")
        history = routine_state.get("history", [])

        reminder = (
            f"\n\n==================================================\n"
            f"⚠️ ROUTINE EXECUTION IN PROGRESS: STEP {done + 1} OF {total}\n"
            f"==================================================\n"
        )

        if custom:
            reminder += f"\nUSER GOAL / INSTRUCTIONS:\n{custom}\n"

        if history:
            reminder += f"\nPREVIOUS TOOL RESULTS (History):\n{json.dumps(history, indent=2, default=str)}\n"

        reminder += (
            f"\nCRITICAL: You MUST execute step {done + 1} now. "
            f"Do NOT output conversational text. Do NOT ask the user questions. "
            f"Do NOT give a final answer. You must ONLY output a JSON tool call.\n\n"
            f"NEXT TOOL TO CALL: '{next_tool}'\n"
            f"TEMPLATE ARGUMENTS TO USE:\n{json.dumps(next_args, indent=2)}\n\n"
            f"INSTRUCTION: Output a JSON tool call for '{next_tool}'. "
            f"Use the TEMPLATE ARGUMENTS as a guide, but YOU MUST REPLACE any placeholder variables (like <JOKE>, <MESSAGE>, <RESOLVED_CONTACT_VALUE>, etc.) with the actual real text from the PREVIOUS TOOL RESULTS (History)! Do NOT output the literal placeholder text!"
        )

        return reminder, routine_state

    else:
        reminder = (
            f"\n\n✅ ROUTINE COMPLETE: All {total} steps done. "
            f"Write a brief summary of what was accomplished."
        )
        return reminder, None  # Reset state — routine is finished


def pick_up_routine_state(tool_data: dict) -> dict | None:
    """
    After _maybe_run_tool returns, scan its results for an embedded _routine_state
    (set by execute_routine) and return it, or None if not present.
    """
    for result in tool_data.get("results", []):
        if "_routine_state" in result:
            return result["_routine_state"]
    return None


def increment_routine_step(routine_state: dict | None, tool_name: str) -> dict | None:
    """
    Increment the completed-steps counter when a non-execute_routine tool runs
    while inside a routine.
    """
    if routine_state and tool_name != "execute_routine":
        idx = routine_state.get("completed", 0)
        if idx < len(routine_state.get("all_steps", [])):
            expected = routine_state["all_steps"][idx]["tool"]
            # Handle capability router aliases (e.g., deep_search downgrading to quick_search)
            if tool_name == expected or (expected == "deep_search" and tool_name == "quick_search"):
                routine_state["completed"] += 1
    return routine_state
