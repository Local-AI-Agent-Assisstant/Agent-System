"""
ai_chat.py  (inside the ai_chat/ package)
The AiChat class: session management, the main ask() loop, and CLI helpers.

All heavy lifting is delegated to focused sibling modules:
  - model_client   → HTTP calls to Ollama
  - tool_parser    → parse model reply into a tool-call dict
  - tool_executor  → dispatch / gate / execute tool calls
  - routine_engine → multi-step routine state & reminder messages
"""

import copy
import json
import os
import re
import time
import threading

from tools import (
    TOOL_SYSTEM_PROMPT,
    pick_file_from_window,
    read_files,
)

from .model_client import call_model
from .tool_parser import extract_tool_call
from .tool_executor import maybe_run_tool
from .routine_engine import (
    build_routine_reminder,
    pick_up_routine_state,
    increment_routine_step,
)


# ---------------------------------------------------------------------------
# Per-tool instructions: short and direct so small models don't get confused
# ---------------------------------------------------------------------------
_TOOL_INSTRUCTIONS = {
    "deep_search": (
        "Based on the search results, generate a structured research report. "
        "Do NOT output raw snippets, bullet dumps, or simple lists. "
        "Use this structure:\n"
        "## [Title]\n\n"
        "**Summary:** (2-4 lines summarizing the main point)\n\n"
        "### Key Findings\n"
        "- (important point 1)\n"
        "- (important point 2)\n\n"
        "### Details\n"
        "(Explain the findings naturally in a few short paragraphs. Combine results, remove duplicates, cross-check information. Prefer official sources. If it's a recent topic, mention dates/timestamps.)\n\n"
        "Make it feel like a clean research summary, concise but informative. Do NOT include a Sources section at the end (the UI will handle source links automatically)."
    ),
    "quick_search": (
        "Answer the user naturally and concisely based on the search result. "
        "Provide a short sentence or two. Do NOT output raw snippets or bullet dumps. "
        "Do NOT provide any links or sources unless the user explicitly asked for them."
    ),
    "deep_think": (
        "The Thinker Agent has completed its work. "
        "Read the 'agent_summary' field in the result and present it to the user as your final answer. "
        "Format it clearly using markdown. Do not output JSON."
    ),
    "write_file": (
        "Reply with one short sentence confirming the file was saved. "
        "If the result has a 'download_url' field, include it as [filename](download_url). "
        "Copy the URL exactly as-is. Do not invent or change any URL."
    ),
    "send_email_gmail": (
        "Reply with one short sentence confirming the email was sent successfully."
    ),
    "calculate": (
        "Reply naturally with a short sentence, not just the raw number."
        "Examples:\n"
        "- '100 USD is approximately 92.4 EUR.'\n"
        "- '10 kilometres equals about 6.21 miles.'\n"
        "- 'The result is 25.'"
    ),
    "get_current_weather": (
    "Summarize the weather clearly and naturally. "
    "Include useful details like temperature, feels-like temperature, "
    "condition, humidity, wind, rain chance, and UV index when relevant. "
    "If recommendations are provided, include them naturally as helpful advice. "
    "Make the response feel interactive and assistant-like."
    ),
    "system_commands_windows": (
        "Summarize the system information result above for the user in plain text. Do not output JSON."
    ),
    "open_program": (
        "If the result says 'already_running': true, ask the user if they want to open a new window anyway. "
        "CRITICAL: If the user replies 'yes' or wants a new window, YOU MUST OUTPUT A JSON TOOL CALL to open_program with 'force_new': true. Do not just reply with text. "
        "Otherwise, if ok is false, tell the user the error. If ok is true, reply with one short sentence confirming it opened."
    ),
    "close_program": (
        "Reply with one short sentence confirming that the program was closed (or explain the error if it failed)."
    ),
    "manage_planner": (
        "Respond to the user based on the planner task result in a conversational tone. "
        "If all tasks were removed and the list is now empty, explicitly confirm it "
        "(e.g. 'All tasks have been deleted. Your list is now empty.'). "
        "Never return a blank response."
    ),
}

_DEFAULT_TOOL_INSTRUCTION = (
    "Provide a final answer to the user summarizing the result above. Do not output JSON."
)

# Tools that are force-dispatched directly without asking the AI for args
_DIRECT_FORCE_TOOLS = {"deep_search","deep_think"}


class AiChat:

    def __init__(self, system_prompt: str | None = None, max_history: int = 20):
        self.messages = []
        self.max_history = max_history
        self.updated_at = time.time()
        self.lock = threading.RLock()
        self.always_allow_tools: set = set()
        self._pending_permissions: dict = {}
        self.full_access_until: float = 0

        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _trim_history(self):
        """Keep only the last N messages, always preserving the system prompt at index 0."""
        if len(self.messages) <= self.max_history:
            return
        has_system = self.messages and self.messages[0].get("role") == "system"
        if has_system:
            system_msg = self.messages[0]
            self.messages = [system_msg] + self.messages[-(self.max_history - 1):]
        else:
            self.messages = self.messages[-self.max_history:]

    def _nonempty(self, s: str) -> bool:
        return isinstance(s, str) and s.strip() != ""

    def _is_identity_question(self, prompt: str) -> bool:
        if not prompt or not isinstance(prompt, str):
            return False
        p = prompt.lower().strip()
        identity_patterns = [
            "who are you",
            "what are you",
            "what can you do",
            "what is your purpose",
            "tell me about yourself",
            "who created you",
            "what features do you",
            "what tools do you",
            "how do you work",
            "what are your capabilities",
            "who made you"
        ]
        return any(pat in p for pat in identity_patterns)

    def _call_model(self, messages: list, on_event=None, is_interrupted=None) -> str:
        """Thin wrapper so web_api.py internal callers still work unchanged."""
        return call_model(messages, on_event=on_event, is_interrupted=is_interrupted)

    def _maybe_run_tool(self, tool_call: dict, email=None, password=None, on_event=None, routine_memory=None, email_allowed=None, is_interrupted=None, enabled_skills=None):
        """Execute a requested tool if possible, returning its output data."""
        from .tool_executor import maybe_run_tool
        
        effective_email_allowed = self._email_allowed if email_allowed is None else email_allowed
        
        return maybe_run_tool(
            tool_call,
            email=email,
            password=password,
            on_event=on_event,
            email_allowed=effective_email_allowed,
            always_allow_tools=self.always_allow_tools,
            pending_permissions=self._pending_permissions,
            routine_memory=routine_memory,
            is_interrupted=is_interrupted,
            enabled_skills=enabled_skills,
            get_full_access_until=lambda: getattr(self, 'full_access_until', 0),
        )

    # ------------------------------------------------------------------
    # Main ask() loop
    # ------------------------------------------------------------------

    def ask(self, prompt: str, email=None, password=None, on_event=None, is_interrupted=None) -> dict:
        """
        Non-recursive, stable tool loop.
        - Sends user prompt (if not empty)
        - Calls the model
        - Executes tools ONLY on pure JSON
        - Forces a final plain-text answer
        """
        session_messages = list(self.messages)

        # 1) Add user message only if it's not empty
        prompt_added = False
        if isinstance(prompt, str) and prompt.strip():
            session_messages.append({"role": "user", "content": prompt})
            prompt_added = True

        # ── INJECT IDENTITY CONTEXT IF NEEDED ──
        if self._is_identity_question(prompt):
            try:
                from .assistant_identity import IDENTITY_CONTEXT
                # Insert immediately after the main system prompt (if it exists) or at the top
                insert_idx = 1 if (session_messages and session_messages[0].get("role") == "system") else 0
                session_messages.insert(insert_idx, {"role": "system", "content": IDENTITY_CONTEXT})
            except ImportError:
                pass

        # Avoid using the email tool if the user did not ask
        self._email_allowed = False
        p = (prompt or "").lower()
        email_actions = ["send email", "email this", "email to", "send to", "mail this", "@gmail.com", "email"]
        if any(action in p for action in email_actions):
            self._email_allowed = True

        # ── FORCED TOOL (from the + button skill picker) ──────────────────
        _force_match = re.match(r'^\[FORCE_TOOL:([^\]]+)\]\n?', prompt or "")
        forced_tool_call = None
        enabled_skills = set()
        if _force_match:
            forced_tool_name = _force_match.group(1).strip()
            enabled_skills.add(forced_tool_name)
            actual_query = (prompt or "")[_force_match.end():].strip()
            prompt = actual_query
            session_messages[-1]["content"] = actual_query

            if forced_tool_name == "execute_routine":
                forced_tool_call = {
                    "tool": "execute_routine",
                    "args": {"routine_name": actual_query}
                }
            elif forced_tool_name in _DIRECT_FORCE_TOOLS:
                if forced_tool_name == "deep_think":
                    forced_tool_call = {"tool": "deep_think", "args": {"goal": actual_query}}
                else:
                    forced_tool_call = {"tool": forced_tool_name, "args": {"query": actual_query}}


        # ──────────────────────────────────────────────────────────────────

        max_tool_rounds = 30  # safety guard
        _routine_state = None

        for round_num in range(max_tool_rounds):
            if is_interrupted and is_interrupted():
                return {"response": "Interrupted by user."}

            # ── If a forced tool was set (from the + skill picker), use it on round 0
            if forced_tool_call is not None and round_num == 0:
                tool_call = forced_tool_call
                forced_tool_call = None  # only force once
                if on_event:
                    on_event("tool", tool_call.get("tool"))
            elif _routine_state:
                # ROUTINE EXECUTION MODE: Bypass AI entirely
                step_idx = _routine_state.get("completed", 0)
                if step_idx < len(_routine_state["all_steps"]):
                    expected = _routine_state["all_steps"][step_idx]
                    tool_call = {
                        "tool": expected["tool"],
                        "args": expected.get("args", {})
                    }
                    if on_event:
                        on_event("tool", tool_call["tool"])
            else:
                # Notify UI: thinking
                if on_event:
                    on_event("thinking", None)

                # Live stream the <think> block if present, but buffer the rest to hide raw JSON tool calls.
                # Live stream the <think> block if present, and stream plain text answers.
                # Buffer the start of the post-think text to detect if it's a JSON tool call (and hide it if so).
                state = {"in_think": False, "full_reply": "", "is_json": None, "buffer": ""}
                
                def live_stream_think(event, char):
                    if event == "chunk":
                        state["full_reply"] += char
                        
                        if "<think>" in state["full_reply"] and "</think>" not in state["full_reply"]:
                            if not state["in_think"]:
                                state["in_think"] = True
                                if on_event:
                                    on_event("chunk", "<think>")
                                    after = state["full_reply"].split("<think>", 1)[1]
                                    if after:
                                        on_event("chunk", after)
                            else:
                                if on_event:
                                    on_event("chunk", char)
                            return
                            
                        if "</think>" in state["full_reply"] and state["in_think"]:
                            state["in_think"] = False
                            if on_event:
                                on_event("chunk", char)
                            return
                            
                        current_text = state["full_reply"].split("</think>", 1)[1] if "</think>" in state["full_reply"] else state["full_reply"]
                        
                        if state["is_json"] is None:
                            stripped = current_text.lstrip()
                            if not stripped:
                                state["buffer"] += char
                                return
                            
                            if stripped.startswith('{') or stripped.startswith('['):
                                state["is_json"] = True
                            else:
                                state["is_json"] = False
                                if on_event:
                                    on_event("chunk", state["buffer"] + char)
                                state["buffer"] = ""
                            return
                            
                        if not state["is_json"]:
                            if on_event:
                                on_event("chunk", char)
                                    
                reply = self._call_model(session_messages, on_event=live_stream_think, is_interrupted=is_interrupted)

                if is_interrupted and is_interrupted():
                    return {"response": "Interrupted by user."}

                # Retry once if model returned empty output
                if not self._nonempty(reply):
                    state["in_think"] = False
                    state["full_reply"] = ""
                    reply = self._call_model(session_messages, on_event=live_stream_think, is_interrupted=is_interrupted)

                if is_interrupted and is_interrupted():
                    return {"response": "Interrupted by user."}

                if isinstance(reply, dict) and reply.get("error"):
                    return reply

                if not self._nonempty(reply):
                    return {"error": True, "message": "The AI returned an empty response. Please try again."}

                # Parse a strict tool call
                tool_call = extract_tool_call(reply)

                # Record assistant reply in local session
                session_messages.append({"role": "assistant", "content": reply})

                # No tool → this IS the final plain-text answer.
                # Now stream the REST of the response (excluding the think block) so the UI shows real-time typing.
                if tool_call is None:
                    clean_reply = re.sub(r"<think>.*?</think>", "", reply, flags=re.DOTALL | re.IGNORECASE).strip()
                    # COMMIT TO HISTORY
                    if prompt_added:
                        self.messages.append({"role": "user", "content": prompt})
                    self.messages.append({"role": "assistant", "content": reply})
                    self.updated_at = time.time()
                    self._trim_history()
                    created_files = getattr(self, '_session_files', [])
                    self._session_files = []   # reset for next ask()
                    sources = []

                    for msg in reversed(session_messages):
                        if msg.get("role") != "user":
                            continue

                        content = msg.get("content", "")

                        if "--- TOOL RESULT ---" not in content:
                            continue

                        try:
                            json_part = content.split("--- TOOL RESULT ---", 1)[1]
                            start = json_part.find("{")
                            end = json_part.rfind("}")

                            if start == -1 or end == -1:
                                continue

                            tool_json = json.loads(json_part[start:end + 1])

                            if tool_json.get("tool") == "deep_search":
                                for r in tool_json.get("results", []):
                                    result_data = r.get("result", [])

                                    if isinstance(result_data, list):
                                        for item in result_data:
                                            if isinstance(item, dict) and item.get("link"):
                                                sources.append({
                                                    "title": item.get("title", "Source"),
                                                    "url": item.get("link"),
                                                })

                                break

                        except Exception:
                            pass

                    return {
                        "response": reply,
                        "tool": None,
                        "files": created_files,
                        "sources": sources,
                    }

                # Notify UI: which tool(s) are about to run
                if on_event:
                    tools_to_announce = []
                    if "tool" in tool_call:
                        tools_to_announce = [tool_call.get("tool")]
                    elif "tools" in tool_call:
                        tools_to_announce = [
                            t.get("tool") for t in tool_call.get("tools", []) if t.get("tool")
                        ]
                    for tool_name_hint in tools_to_announce:
                        on_event("tool", tool_name_hint)

            # Run tool(s)
            routine_memory = None
            if _routine_state:
                routine_memory = {}
                for item in _routine_state.get("history", []):
                    tool = item["tool"]
                    routine_memory.setdefault(tool, [])
                    routine_memory[tool].append(item["result"])
            
            # Temporarily allow email if we are inside a routine
            current_email_allowed = self._email_allowed or (_routine_state is not None)

            if is_interrupted and is_interrupted():
                return {"response": "Interrupted by user."}

            tool_data = self._maybe_run_tool(
                tool_call, 
                email, 
                password, 
                on_event=on_event, 
                routine_memory=routine_memory, 
                email_allowed=current_email_allowed, 
                is_interrupted=is_interrupted,
                enabled_skills=enabled_skills
            )

            if tool_data is None:
                return {"error": True, "message": "The AI couldn't execute the requested tool."}

            # Pick up routine state if execute_routine just ran
            new_state = pick_up_routine_state(tool_data)
            if new_state is not None:
                _routine_state = new_state

            # Store this tool's result into routine memory for future steps
            if _routine_state and tool_data.get("tool") != "execute_routine":
                for r in tool_data.get("results", []):
                    t_name = r.get("tool", "")
                    t_result = r.get("result")
                    if t_name and t_result is not None:
                        _routine_state.setdefault("history", []).append({
                            "tool": t_name,
                            "result": t_result
                        })

            # Increment completed steps counter if we're inside a routine
            _routine_state = increment_routine_step(_routine_state, tool_data.get("tool", ""))

            # Email preview short-circuit
            for r in tool_data.get("results", []):
                if r.get("tool") == "deep_think":
                    continue
                result = r.get("result")
                if isinstance(result, dict) and result.get("email_preview"):
                    created_files = getattr(self, '_session_files', [])
                    self._session_files = []
                    preview = result.get("email_preview", {})
                    email_args = r.get("args") or {}
                    attachments = []
                    if email_args.get("attachment"):
                        attachments = [os.path.basename(str(a)) for a in
                                       (email_args["attachment"] if isinstance(email_args["attachment"], list)
                                        else [email_args["attachment"]])]
                    preview["attachments"] = attachments
                    return {
                        "response": "",
                        "tool": "send_email_gmail",
                        "email_preview": preview,
                        "files": created_files,
                    }


            # Add download link(s) for file-producing tool results
            for r in tool_data.get("results", []):
                if r.get("tool") == "write_file":
                    res = r.get("result")
                    if isinstance(res, dict) and res.get("ok") and res.get("filename"):
                        fn = res["filename"]
                        r["download_url"] = f"http://127.0.0.1:8000/api/download/{fn}"

                elif r.get("tool") == "send_email_gmail":
                    attachment = (r.get("args") or {}).get("attachment")
                    if attachment:
                        fn = os.path.basename(str(attachment))
                        r["download_url"] = f"http://127.0.0.1:8000/api/download/{fn}"

            # Feed tool results back to the model
            _used_tool = tool_data.get("tool", "")
            _specific_rule = _TOOL_INSTRUCTIONS.get(_used_tool, _DEFAULT_TOOL_INSTRUCTION)

            _display_data = tool_data

            # If the model has looped on tools too many times, FORCE it to stop
            _force_plain = ""
            if round_num >= max_tool_rounds - 2:
                _force_plain = "\nCRITICAL: You have used too many tools. STOP calling tools. You MUST reply in PLAIN TEXT only now."

            # Build routine continuation reminder
            _routine_reminder, _routine_state = build_routine_reminder(_routine_state)

            # Accumulate all created files across all tool rounds
            if not hasattr(self, '_session_files'):
                self._session_files = []
            for r in tool_data.get("results", []):
                if r.get("tool") == "write_file":
                    dl = r.get("download_url")
                    res = r.get("result")
                    fn = res.get("filename", "") if isinstance(res, dict) else ""
                    if dl and fn:
                        self._session_files.append({"name": fn, "url": dl})
                # Pick up files written inside a Thinker agent run
                elif r.get("tool") == "deep_think":
                    agent_result = r.get("result")
                    agent_result = agent_result if isinstance(agent_result, dict) else {}
                    for f in agent_result.get("created_files", []):
                        self._session_files.append(f)
                    # Surface email preview from Thinker so the frontend shows the modal
                    thinker_preview = agent_result.get("email_preview")
                    if thinker_preview:
                        created_files = getattr(self, '_session_files', [])
                        self._session_files = []
                        preview = thinker_preview.get("email_preview", thinker_preview)
                        email_args = thinker_preview.get("args", {})
                        attachments = []
                        att = email_args.get("attachment") or preview.get("attachment")
                        if att:
                            attachments = [os.path.basename(str(a)) for a in
                                           (att if isinstance(att, list) else [att])]
                        preview["attachments"] = attachments
                        return {
                            "response": "",
                            "tool": "send_email_gmail",
                            "email_preview": preview,
                            "files": created_files,
                        }


            if _routine_state:
                tool_instruction = (
                    "ROUTINE MODE ACTIVE.\n"
                    "You are NOT allowed to finish.\n"
                    "You MUST execute the next routine step.\n"
                    "Return ONLY JSON tool call.\n"
                    "Do not summarize.\n"
                    "Do not explain.\n"
                )
            else:
                tool_instruction = (
                    f"INSTRUCTIONS:\n"
                    f"1. If there are still steps left to complete the user's original request, output ONLY a JSON tool call to continue.\n"
                    f"2. If you are completely finished or no other tools are needed, write your final response to the user. {_specific_rule}\n"
                )

            session_messages.append({
                "role": "user",
                "content": (
                    f"--- TOOL RESULT ---\n{json.dumps(_display_data, indent=2)}\n\n"
                    f"{tool_instruction}"
                    f"{_routine_reminder}"
                    f"{_force_plain}"
                ),
            })
            continue

        # Ran out of tool rounds without a plain-text reply
        if prompt_added:
            self.messages.append({"role": "user", "content": prompt})
        self.messages.append({
            "role": "assistant",
            "content": "Error: too many tool calls in a row. Please rephrase your request.",
        })
        self._trim_history()
        self._session_files = []
        return {"error": True, "message": "They are too many tool calls..."}

    # ------------------------------------------------------------------
    # ask_no_tools: tools disabled for this request
    # ------------------------------------------------------------------

    def ask_no_tools(self, prompt: str) -> str:
        """Tools are disabled for this request. Do not output JSON."""
        temp_messages = list(self.messages)
        prompt_added = False
        if isinstance(prompt, str) and prompt.strip():
            temp_messages.append({"role": "user", "content": prompt})
            prompt_added = True

        # ── INJECT IDENTITY CONTEXT IF NEEDED ──
        if self._is_identity_question(prompt):
            try:
                from .assistant_identity import IDENTITY_CONTEXT
                insert_idx = 1 if (temp_messages and temp_messages[0].get("role") == "system") else 0
                temp_messages.insert(insert_idx, {"role": "system", "content": IDENTITY_CONTEXT})
            except ImportError:
                pass

        reply = self._call_model(temp_messages)

        if self._nonempty(reply):
            if prompt_added:
                self.messages.append({"role": "user", "content": prompt})
            self.messages.append({"role": "assistant", "content": reply})

        return reply


# ---------------------------------------------------------------------------
# CLI helpers (only used when running ai_chat directly / start_chat)
# ---------------------------------------------------------------------------


def handle_file_command_interactive(chat: AiChat):
    """Handles the /file command: picks file, asks instruction, sends to AI."""
    path = pick_file_from_window(initialdir=os.path.expanduser("~"))
    if not path:
        print("No file selected.\n")
        return

    print(f"📄 Selected: {path}")
    instruction = input("What should I do with this file? ").strip()
    if not instruction:
        print("No instruction given.\n")
        return

    content = read_files(path, max_chars=12000)
    prompt = (
        "You are given file CONTENT below.\n"
        "When calling write_file you MUST include BOTH filename and content.\n"
        "Use filename like 'Tal5es-Network.pdf' (not a full path).\n"
        "CRITICAL: Reply with ONLY valid JSON. No markdown.\n\n"
        f"USER REQUEST:\n{instruction}\n\n"
        f"FILE CONTENT:\n{content}"
    )
    reply = chat.ask(prompt)
    print(f"Ai: {reply}\n")


def start_chat():
    chat = AiChat(system_prompt=TOOL_SYSTEM_PROMPT)

    while True:
        try:
            user_input = input("you: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if user_input.lower() in {"/exit", "/quit"}:
            print("Bye!")
            break


        if user_input.lower() in {"/file", "\\file"}:
            handle_file_command_interactive(chat)
            continue

        if not user_input:
            continue

        def console_event(event_type, data):
            if event_type == "chunk":
                print(data, end="", flush=True)
            elif event_type == "tool":
                print(f"\n\033[93m[AI is running tool: {data}]\033[0m\n", end="", flush=True)
            elif event_type == "thinking":
                print("\n\033[90m[AI is thinking...]\033[0m\n", end="", flush=True)

        print("Ai: ", end="", flush=True)
        reply = chat.ask(user_input, on_event=console_event)
        print("\n")


if __name__ == "__main__":
    start_chat()
