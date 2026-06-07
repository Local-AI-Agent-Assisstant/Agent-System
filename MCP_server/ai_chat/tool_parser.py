"""
tool_parser.py
Responsible for parsing and normalising tool-call JSON from the model's raw reply.
"""

import json

# Known aliases local models use instead of "tool"
_TOOL_KEY_ALIASES = ("tool", "action", "function", "name", "tool_name", "tool_call")


def _normalise_tool_call(data: dict) -> dict | None:
    """
    Accept any dict that has a recognised tool-key alias and normalise it
    to {"tool": "...", "args": {...}} so the rest of the pipeline is unchanged.
    """
    # local import to avoid circular
    for alias in _TOOL_KEY_ALIASES:
        if alias in data:
            tool_name = data[alias]
            if not isinstance(tool_name, str):
                continue
            # Accept even if not in registry — let execution handle missing tools
            args = data.get("args") or data.get("arguments") or data.get("parameters") or data.get("query") or {}
            # Some models put args at the top level (e.g. {"action": "deep_search", "query": "..."})
            if not isinstance(args, dict):
                args = {"query": args}  # wrap bare string
            # If args is empty, collect all other keys as args
            if not args:
                ignored = set(_TOOL_KEY_ALIASES) | {"args", "arguments", "parameters"}
                args = {k: v for k, v in data.items() if k not in ignored}
            return {"tool": tool_name, "args": args}
    return None


def _parse_candidate(text: str) -> dict | None:
    """Return a normalised tool-call dict from text, or None."""
    try:
        data = json.loads(text)
    except (ValueError, json.JSONDecodeError):
        return None

    if isinstance(data, dict):
        # Standard format: {"tool": ..., "args": ...}
        if "tool" in data or "tools" in data:
            return data
        # Alias format: {"action": ..., "query": ...} etc.
        return _normalise_tool_call(data)

    if isinstance(data, list):
        normalised = []
        for item in data:
            if isinstance(item, dict):
                if "tool" in item:
                    normalised.append(item)
                else:
                    n = _normalise_tool_call(item)
                    if n:
                        normalised.append(n)
        if normalised:
            return {"tools": normalised}

    return None


def _extract_all_json_objects(text: str) -> list:
    """
    Robustly extract every top-level {...} object from text.
    Small models often break array brackets; scanning object-by-object is safer.
    """
    objects = []
    depth = 0
    in_string = False
    escape = False
    start_idx = -1

    for i, c in enumerate(text):
        if escape:
            escape = False
            continue
        if c == '\\':
            escape = True
            continue
        if c == '"':
            in_string = not in_string
            continue

        if not in_string:
            if c == '{':
                if depth == 0:
                    start_idx = i
                depth += 1
            elif c == '}':
                if depth > 0:
                    depth -= 1
                    if depth == 0 and start_idx != -1:
                        obj_str = text[start_idx:i+1]
                        parsed = _parse_candidate(obj_str)
                        if parsed:
                            objects.append(parsed)
    return objects


def extract_tool_call(reply: str) -> dict | None:
    """
    Tries to parse the assistant's reply as a strict JSON tool call.
    Removes markdown code blocks if present.
    Also handles cases where the model prefixes the JSON with plain text.
    Accepts "tool", "action", "function", "name" key variants from local models.
    Returns the parsed dict if valid, otherwise None.
    """
    import re
    reply = reply.strip()
    
    # Strip <think> blocks so we don't parse hallucinated JSON inside reasoning
    clean_reply = re.sub(r"<think>.*?</think>", "", reply, flags=re.DOTALL | re.IGNORECASE).strip()

    # Handle markdown code blocks
    if clean_reply.startswith("```"):
        lines = clean_reply.splitlines()
        if len(lines) >= 2 and lines[-1].startswith("```"):
            clean_reply = "\n".join(lines[1:-1]).strip()

    # 1) Try the whole reply as-is
    result = _parse_candidate(clean_reply)
    if result is not None:
        return result

    # 2) Robust extraction of ALL JSON objects in the text.
    # Small models often mess up array brackets (e.g. closing an array with } instead of ]).
    # Instead of relying on a single valid array, we find every individual {...} object.
    found_objects = _extract_all_json_objects(clean_reply)

    if found_objects:
        # CRITICAL FIX for small models:
        # 7B models often try to output multiple dependent tools in the same turn
        # (e.g. check wifi AND write file), which causes the file to be blank because
        # it hasn't seen the wifi data yet.
        # By ONLY returning the FIRST tool found, we FORCE the model to wait for the
        # result of step 1 before it is allowed to write step 2.

        # If it's already a {"tools": [...]} wrapper, just return the first tool inside it.
        first_obj = found_objects[0]
        if "tools" in first_obj and isinstance(first_obj["tools"], list) and len(first_obj["tools"]) > 0:
            return first_obj["tools"][0]

        return first_obj

    return None
