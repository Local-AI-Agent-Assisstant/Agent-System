"""
thinker.py
A real coded autonomous agent using a ReAct architecture.
"""

import json
from tools.prompts import TOOL_SYSTEM_PROMPT

MAX_STEPS = 25  # Hard cap to prevent infinite loops

if "Available tools:" in TOOL_SYSTEM_PROMPT:
    available_tools_block = "AVAILABLE TOOLS\n" + TOOL_SYSTEM_PROMPT.split("Available tools:")[1]
else:
    available_tools_block = "AVAILABLE TOOLS:\n(See tool registry)"

_REACT_SYSTEM = f"""You are an autonomous reasoning agent. Your job is to achieve the user's goal by thinking step-by-step and using the provided tools.

{available_tools_block}

# INSTRUCTIONS
1. Work iteratively. You will receive the user's goal, and then you will output ONE step at a time.
2. For each step, FIRST write your thought/plan starting with "THOUGHT: ". This thought MUST be extremely brief—just a single short sentence explaining what you will do next. Do not include code, markdown, or conversational text.
3. After your thought, you MUST output EXACTLY ONE JSON tool call wrapped in ```json markdown fences.
4. CRITICAL JSON RULE: Your JSON MUST be perfectly valid. If you are passing multi-line text (like file content or command output), you MUST escape newlines as \\n and quotes as \\". NEVER use literal newlines inside a JSON string.
5. You will then receive the result of that tool call as a user message.
6. If a tool fails, read the error message, output a new THOUGHT correcting your mistake, and try again.
7. CRITICAL BEHAVIOR: Do NOT talk to the user. Do NOT act like a chatbot giving advice. YOU are the computer program executing the tools. Once a tool succeeds, immediately move on to the next tool. Do NOT repeat the same tool call if it already succeeded.
8. Repeat this process until the goal is achieved.
9. When the goal is fully achieved, output a final thought summarizing the outcome, followed by a JSON tool call where "tool" is "DONE" and "args" is {{}}.

# OUTPUT FORMAT
Every response MUST follow this exact structure:

THOUGHT: your very short and clear reasoning here
```json
{{"tool": "tool_name", "args": {{"key": "value"}}}}
```
"""

class ThinkerAgent:
    """
    A self-contained ReAct coded agent loop.
    """

    def __init__(self, call_model_fn, run_tool_fn, parse_tool_fn):
        self._call_model = call_model_fn
        self._run_tool = run_tool_fn
        self._parse_tool = parse_tool_fn

    def _emit(self, on_event, phase: str, is_detailed_thought: bool = False):
        if on_event:
            on_event("thinker_step", phase)
            if not is_detailed_thought:
                on_event("thinking", phase)

    def run(self, goal: str, on_event=None, email=None, password=None, is_interrupted=None) -> dict:
        execution_log = []
        failed_steps = []
        
        messages = [
            {"role": "system", "content": _REACT_SYSTEM},
            {"role": "user", "content": f"Goal: {goal}"}
        ]

        self._emit(on_event, "Starting autonomous agent loop...")
        
        for step_num in range(1, MAX_STEPS + 1):
            if is_interrupted and is_interrupted():
                thought = "Task was stopped by the user."
                break
                
            # 1. Call model to get thought and action
            reply = self._call_model(messages, is_interrupted=is_interrupted)
            
            if isinstance(reply, dict): # error dict
                if reply.get("message") == "Interrupted by user.":
                    thought = "Task was stopped by the user."
                    break
                reply = ""
            
            if not reply:
                messages.append({"role": "user", "content": "Error: Empty response. Please output a valid THOUGHT and JSON tool call."})
                continue
                
            messages.append({"role": "assistant", "content": reply})

            # 2. Extract and emit the thought for the UI
            first_brace = reply.find("{")
            first_fence = reply.find("```json")
            
            # Cut at whichever comes first to cleanly separate the thought
            cut_idx = -1
            if first_brace != -1 and first_fence != -1:
                cut_idx = min(first_brace, first_fence)
            elif first_brace != -1:
                cut_idx = first_brace
            elif first_fence != -1:
                cut_idx = first_fence

            if cut_idx != -1:
                raw_thought = reply[:cut_idx].strip()
            else:
                raw_thought = reply.strip()
            
            # Remove "THOUGHT:" and get the first line to keep it brief
            thought = raw_thought.replace("THOUGHT:", "").strip()
            if "\n" in thought:
                thought = thought.split("\n")[0].strip()
            if thought:
                print(f"[Thinker Thought] {thought}")
                self._emit(on_event, thought, is_detailed_thought=True)
                if on_event:
                    on_event("thinking", "Reasoning...")
            else:
                self._emit(on_event, f"Executing step {step_num}...")

            # 3. Parse tool call
            tool_call = self._parse_tool(reply)
            
            if not tool_call:
                # If no tool call found, tell the model to try again
                error_msg = "Error: Could not parse a valid JSON tool call. Make sure you output the JSON block inside ```json fences, and ensure ALL newlines inside strings are escaped as \\n."
                messages.append({"role": "user", "content": error_msg})
                continue
                
            tool_name = tool_call.get("tool", "unknown")
            args = tool_call.get("args", {})
            
            # 4. Check if DONE
            if tool_name.upper() == "DONE":
                self._emit(on_event, "Goal completed.")
                break
                
            if on_event:
                on_event("tool", tool_name)
                
            # Hide large arguments from terminal
            safe_args = dict(args)
            for k, v in safe_args.items():
                if isinstance(v, str) and len(v) > 50:
                    safe_args[k] = v[:50] + "... [hidden]"
            print(f"[Thinker Action] calling {tool_name}({safe_args})")
            
            # 5. Execute tool
            tool_result = self._run_tool(
                tool_call,
                email=email,
                password=password,
                on_event=on_event,
            )
            
            if tool_result is None:
                failed_steps.append(step_num)
                error_msg = f"Tool {tool_name} FAILED or returned no output. Fix your arguments and try again."
                execution_log.append({"step": step_num, "tool": tool_name, "result": "FAILED", "ok": False})
                messages.append({"role": "user", "content": error_msg})
                print(f"[Thinker] Step {step_num} FAILED")
                continue
                
            results_list = tool_result.get("results", [])
            result_value = results_list[0].get("result") if results_list else tool_result
            
            execution_log.append({
                "step": step_num,
                "tool": tool_name,
                "result": result_value,
                "ok": True,
            })
            
            # Extract email preview if present
            if isinstance(result_value, dict) and result_value.get("email_preview"):
                _email_preview_captured = result_value
                
            # 6. Feed result back to model
            res_str = str(result_value)
            # truncate if too large
            if len(res_str) > 20000:
                res_str = res_str[:20000] + "... [truncated]"
            messages.append({"role": "user", "content": f"Result from {tool_name}:\n{res_str}"})

        # ── Finalize response for UI ──
        summary = thought if thought else "Task completed."
        
        created_files = []
        for entry in execution_log:
            if entry.get("tool") == "write_file" and entry.get("ok"):
                res = entry.get("result")
                if isinstance(res, dict) and res.get("filename"):
                    fn = res["filename"]
                    created_files.append({
                        "name": fn,
                        "url": f"http://127.0.0.1:8000/api/download/{fn}"
                    })

        res = {
            "agent_summary": summary,
            "steps_executed": len(execution_log),
            "steps_failed": failed_steps,
            "execution_log": execution_log,
            "created_files": created_files,
        }
        if locals().get("_email_preview_captured"):
            res["email_preview"] = _email_preview_captured
            
        return res

def deep_think(goal: str):
    """Placeholder — actual logic is in tool_executor.py's special-case handler."""
    pass
