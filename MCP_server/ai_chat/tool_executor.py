"""
tool_executor.py
Responsible for safely executing one or more tool calls, including:
  - Structure validation (single vs. multi-tool)
  - Email safety gate
  - Unknown-tool rejection
  - Permission request / wait flow
  - Routine injection (execute_routine)
  - Actual tool dispatch
"""
import os
import threading
import uuid
import json
import logging

logger = logging.getLogger(__name__)

from tools import TOOL_REGISTRY, TOOLS_REQUIRING_PERMISSION
from .model_client import call_model
from .tool_parser import extract_tool_call


def maybe_run_tool(
    tool_call: dict,
    email=None,
    password=None,
    on_event=None,
    email_allowed: bool = False,
    always_allow_tools: set = None,
    pending_permissions: dict = None,
    routine_memory: dict = None,
    is_interrupted=None,
    enabled_skills: set = None,
    get_full_access_until=None,
) -> dict | None:
    """
    Execute a tool call safely.
    Supports:
      - single tool: {"tool": "...", "args": {...}}
      - multiple tools: {"tools": [ {...}, {...} ]}

    Returns a dict {"tool": str, "results": list} or None on fatal error.

    Parameters
    ----------
    tool_call          : parsed tool-call dict from the model
    email / password   : Gmail credentials forwarded to send_email_gmail
    on_event           : SSE event callback (event_type, data)
    email_allowed      : whether the user explicitly requested an email action
    always_allow_tools : set of tool names that don't need a permission prompt
    pending_permissions: shared dict managed by AiChat for request/response pairing
    """
    if always_allow_tools is None:
        always_allow_tools = set()
    if pending_permissions is None:
        pending_permissions = {}

    calls = []

    # -------- validate structure --------
    if "tool" in tool_call:
        calls = [tool_call]
    elif "tools" in tool_call:
        if not isinstance(tool_call["tools"], list):
            print("[System] Invalid tools format.")
            return None
        calls = tool_call["tools"]
    else:
        print("[System] No tool key found.")
        return None

    results = []
    last_tool = None

    while calls:
        if is_interrupted and is_interrupted():
            results.append({"tool": last_tool or "unknown", "args": {}, "result": "Interrupted by user."})
            break
            
        call = calls.pop(0)
        tool_name = call.get("tool")
        args = call.get("args", {}) or {}

        # --- CAPABILITY ROUTER ---
        if enabled_skills is None:
            enabled_skills = set()
            
        if tool_name == "deep_think" and "deep_think" not in enabled_skills:
            results.append({
                "tool": tool_name,
                "args": args,
                "result": "System: Thinker skill is NOT enabled. Do not use deep_think. Use your normal model reasoning instead."
            })
            last_tool = tool_name
            continue
            
        if tool_name == "deep_search" and "deep_search" not in enabled_skills:
            # quick internal mode
            if on_event:
                on_event("tool", "quick_search")
            
            call["tool"] = "quick_search"
            tool_name = "quick_search"
                
            query = args.get("query", "")
            try:
                from ddgs import DDGS
                with DDGS() as ddgs:
                    hits = list(ddgs.text(query, max_results=1))
                if hits:
                    short_res = hits[0].get("body", hits[0].get("snippet", "No description"))
                    link = hits[0].get("href", "")
                    title = hits[0].get("title", "")
                    if len(short_res) > 400:
                        short_res = short_res[:400] + "..."
                    quick_result = [{"title": title, "link": link, "content": short_res}]
                else:
                    quick_result = [{"title": "No result", "link": "", "content": "No matches found."}]
                
                print(f"[Capability Router] quick search executed for '{query}'")
                results.append({
                    "tool": tool_name,
                    "args": args,
                    "result": quick_result
                })
            except Exception as e:
                results.append({
                    "tool": tool_name,
                    "args": args,
                    "result": f"quick search error: {e}"
                })
            last_tool = tool_name
            continue

        # --- ROUTINE INJECTION ---
        if tool_name == "execute_routine":
            routine_name = args.get("routine_name")
            from tools.routines import get_routine
            try:
                routine = get_routine(routine_name)
                steps = routine.get("steps", [])
                # DO NOT inject steps into the queue (that would run static args).
                # Instead, store them in _routine_state so the ask() loop drives
                # each step through the AI with proper dynamic data passing.
                custom_prompt = routine.get("prompt", "").strip()
                nonlocal_ref = {
                    "routine_name": routine_name,
                    "description": routine.get("description", ""),
                    "all_steps": steps,
                    "completed": 0,
                    "custom_prompt": custom_prompt,
                    "history": [],
                }
                first_tool = steps[0].get("tool") if steps else "unknown"
                result_text = (
                    f"Routine '{routine_name}' ready ({len(steps)} steps). "
                    f"Start now by calling tool '{first_tool}'."
                )
                if custom_prompt:
                    result_text += f"\n\nUser instructions for this routine:\n{custom_prompt}"
                results.append({
                    "tool": tool_name,
                    "args": args,
                    "result": result_text,
                    "_routine_state": nonlocal_ref,
                })
            except Exception as e:
                results.append({
                    "tool": tool_name,
                    "args": args,
                    "result": f"Error loading routine: {str(e)}"
                })

        # --- THINKER AGENT ---
        elif tool_name == "deep_think":
            goal = args.get("goal", "")
            from tools.thinker import ThinkerAgent

            # Build a thin run_tool wrapper that passes the current session context
            def _agent_run_tool(tc, email=None, password=None, on_event=None):
                # When Thinker is running, allow it to use advanced Deep Search if it wants
                thinker_skills = (enabled_skills or set()).union({"deep_search", "deep_think"})
                return maybe_run_tool(
                    tc,
                    email=email,
                    password=password,
                    on_event=on_event,
                    email_allowed=email_allowed,
                    always_allow_tools=always_allow_tools,
                    pending_permissions=pending_permissions,
                    is_interrupted=is_interrupted,
                    enabled_skills=thinker_skills,
                    get_full_access_until=get_full_access_until,
                )

            agent = ThinkerAgent(
                call_model_fn=call_model,
                run_tool_fn=_agent_run_tool,
                parse_tool_fn=extract_tool_call,
            )
            agent_result = agent.run(
                goal=goal,
                on_event=on_event,
                email=email,
                password=password,
                is_interrupted=is_interrupted,
            )
            results.append({
                "tool": tool_name,
                "args": args,
                "result": agent_result,
            })
            continue

        # Stream tool event to frontend for intermediate steps
        if on_event:
            on_event("tool", tool_name)

        # Hard safety gate: never email unless explicitly allowed
        if tool_name == "send_email_gmail" and not email_allowed:
            results.append({
                "tool": tool_name,
                "args": args,
                "result": "Blocked: user did not ask to send an email."
            })
            continue

        # -------- reject unknown tools --------
        if tool_name not in TOOL_REGISTRY:
            results.append({
                "tool": tool_name,
                "args": args,
                "result": "Error: unknown tool. Available tools: " + ", ".join(TOOL_REGISTRY.keys())
            })
            continue

        # -------- build sanitised args string for logs / permission UI --------
        if isinstance(args, dict):
            safe_args = dict(args)
            if "content" in safe_args:
                safe_args["content"] = f"<hidden {len(str(args.get('content', '')))} chars>"
            args_str = ", ".join(f"{k}={v}" for k, v in safe_args.items())
        else:
            safe_args = args
            args_str = str(args)

        # -------- ask user for permission before executing sensitive tools --------
        import time
        if tool_name in TOOLS_REQUIRING_PERMISSION and on_event and tool_name not in always_allow_tools:
            active_full_access = get_full_access_until() if get_full_access_until else 0
            if active_full_access and time.time() < active_full_access:
                pass # Bypass permission prompt because full access is active
            else:
                request_id = str(uuid.uuid4())
                permission_event = threading.Event()
                pending_permissions[request_id] = {
                    "event": permission_event,
                    "allowed": None,
                    "dont_ask_again": False,
                    "tool": tool_name,
                    "args": safe_args,
                }
                # Send permission request to frontend via SSE
                on_event("permission_request", {
                    "request_id": request_id,
                    "tool": tool_name,
                    "args": safe_args,
                })
                # Block this thread until frontend responds (timeout = 120 seconds)
                permission_event.wait(timeout=120)

                req_data = pending_permissions.pop(request_id, {})
                allowed = req_data.get("allowed") or False
                dont_ask_again = req_data.get("dont_ask_again", False)

                if allowed and dont_ask_again:
                    always_allow_tools.add(tool_name)

                if not allowed:
                    results.append({
                        "tool": tool_name,
                        "args": args,
                        "result": "Blocked: the user denied permission to run this tool."
                    })
                    continue  # skip to next tool

        # -------- execute tool --------
        try:
            from typing import Any
            tool_fn: Any = TOOL_REGISTRY[tool_name]

            # Create an on_progress callback to stream intermediate steps
            def on_progress(msg: str):
                if on_event:
                    on_event("thinking", msg)

            if isinstance(args, dict):
                # Resolve placeholders from memory
                if routine_memory:
                    normalized_memory = {}
                    for k, v in routine_memory.items():
                        if isinstance(v, list) and len(v) and isinstance(v[0], dict):
                            mapped = []
                            for x in v:
                                if "filename" in x:
                                    mapped.append(x["filename"])
                                elif "stdout" in x:
                                    mapped.append(x["stdout"])
                                elif "result" in x:
                                    mapped.append(x["result"])
                                else:
                                    mapped.append(x)
                            
                            # If it's a single item list containing a string, unwrap it so it interpolates nicely
                            if len(mapped) == 1 and isinstance(mapped[0], str):
                                normalized_memory[k] = mapped[0]
                            else:
                                normalized_memory[k] = mapped
                        else:
                            normalized_memory[k] = v

                    text_args = json.dumps(args)
                    for k, v in normalized_memory.items():
                        # Try exact match replacement first to preserve list/dict types
                        text_args = text_args.replace(f'"{{{{memory.{k}}}}}"', json.dumps(v))
                        # Fallback for inline string interpolation
                        text_args = text_args.replace(f"{{{{memory.{k}}}}}", str(v))
                    args = json.loads(text_args)

                if tool_name == "send_email_gmail":
                    try:
                        args["gmail_user"] = email
                        args["gmail_password"] = password
                    except Exception:
                        args["gmail_user"] = None
                        args["gmail_password"] = None

                # Inject on_progress if the tool supports it
                import inspect
                sig = inspect.signature(tool_fn)
                kwargs = dict(args)
                if "on_progress" in sig.parameters:
                    kwargs["on_progress"] = on_progress

                # Rebuild args_str for accurate logging after resolution
                safe_args = dict(args)
                if "content" in safe_args:
                    safe_args["content"] = "<hidden>"
                args_str = ", ".join(f"{k}={v}" for k, v in safe_args.items())
                
                print(f">>> AI IS RUNNING TOOL: {tool_name} <<<", flush=True)
                logger.warning(f"[Tool Executed] {tool_name} | args: {args_str}")

                result = tool_fn(**kwargs)
            elif isinstance(args, list):
                print(f">>> AI IS RUNNING TOOL: {tool_name} <<<", flush=True)
                logger.warning(f"[Tool Executed] {tool_name} | args: {args_str}")
                result = tool_fn(*args)
            else:
                print(f">>> AI IS RUNNING TOOL: {tool_name} <<<", flush=True)
                logger.warning(f"[Tool Executed] {tool_name}()")

                import inspect
                sig = inspect.signature(tool_fn)

                if "on_progress" in sig.parameters:
                    result = tool_fn(on_progress=on_progress)
                else:
                    result = tool_fn()

        except Exception as e:
            err_msg = f"Tool execution failed with Python error: {type(e).__name__}: {str(e)}"
            import sys
            sys.__stdout__.write(f"\n\033[91m[System Error] {err_msg}\033[0m\n")
            sys.__stdout__.flush()
            results.append({
                "tool": tool_name,
                "args": args,
                "result": err_msg,
            })
            last_tool = tool_name
            break

        serializable_args = {}

        if isinstance(args, dict):
            for k, v in args.items():
                if callable(v):
                    continue
                serializable_args[k] = v
        else:
            serializable_args = args

        results.append({
            "tool": tool_name,
            "args": serializable_args,
            "result": result,
        })
        
        last_tool = tool_name

    return {
        "tool": last_tool if last_tool else "multiple_tools",
        "results": results,
    }
