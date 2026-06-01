import json
import os
import time
from datetime import date, timedelta
from config import SAFE_WRITE_DIR

PLANNER_FILE = os.path.join(SAFE_WRITE_DIR, "daily_planner.json")

# ── internal helpers ──────────────────────────────────────────────────────

def _today() -> str:
    return date.today().isoformat()   # e.g. "2026-05-09"

def _date_after(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()

def _load() -> dict:
    os.makedirs(os.path.dirname(PLANNER_FILE), exist_ok=True)
    if not os.path.exists(PLANNER_FILE):
        return {"today_tasks": []}
    try:
        with open(PLANNER_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"today_tasks": []}

def _save(data: dict):
    os.makedirs(os.path.dirname(PLANNER_FILE), exist_ok=True)
    with open(PLANNER_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def _next_id(tasks: list) -> int:
    return max((t.get("id", 0) for t in tasks), default=0) + 1

def _due_today(tasks: list) -> list:
    """Return tasks scheduled for today or earlier (overdue). Excludes future-dated tasks."""
    today = _today()
    return [t for t in tasks if t.get("scheduled_date", today) <= today]

# ── public tool function ──────────────────────────────────────────────────

def manage_planner(
    action: str,
    task: str = None,
    task_id: int = None,
    new_task: str = None,
    days: int = 1,
    on_progress=None
) -> dict:
    """
    Conversational daily planner tool.

    action: one of:
      "get_tasks"    — return today's tasks (scheduled for today or earlier)
      "add_task"     — add a new task scheduled for today (requires: task)
      "complete_task"— mark a task done (requires: task_id)
      "remove_task"  — delete a task (requires: task_id)
      "update_task"  — rename a task (requires: task_id + new_task)
      "defer_task"   — postpone a task by N days (requires: task_id, optional: days=1)
      "clear_done"   — remove all completed tasks
    """
    if on_progress:
        on_progress("Accessing planner data...")
        
    data = _load()
    tasks = data.get("today_tasks", [])

    if action == "get_tasks":
        return {"ok": True, "tasks": _due_today(tasks)}

    elif action == "add_task":
        if not task:
            return {"ok": False, "error": "task text is required"}
        
        task_list = task if isinstance(task, list) else [task]
        added = []
        
        for t_text in task_list:
            if not t_text or not isinstance(t_text, str):
                continue
            new = {
                "id": _next_id(tasks),
                "task": t_text.strip(),
                "status": "pending",
                "scheduled_date": _today(),
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
            tasks.append(new)
            added.append(new)
            
        data["today_tasks"] = tasks
        _save(data)
        return {"ok": True, "added": added, "tasks": _due_today(tasks)}

    elif action == "complete_task":
        if task_id is None:
            return {"ok": False, "error": "task_id is required"}
        for t in tasks:
            if t.get("id") == task_id:
                t["status"] = "done"
                data["today_tasks"] = tasks
                _save(data)
                return {"ok": True, "completed": t, "tasks": _due_today(tasks)}
        return {"ok": False, "error": f"No task found with id {task_id}"}

    elif action == "remove_task":
        if task_id is None:
            return {"ok": False, "error": "task_id is required"}
        before = len(tasks)
        tasks = [t for t in tasks if t.get("id") != task_id]
        if len(tasks) == before:
            return {"ok": False, "error": f"No task found with id {task_id}"}
        data["today_tasks"] = tasks
        _save(data)
        return {"ok": True, "tasks": _due_today(tasks)}

    elif action == "update_task":
        if task_id is None or not new_task:
            return {"ok": False, "error": "task_id and new_task are required"}
        for t in tasks:
            if t.get("id") == task_id:
                t["task"] = new_task.strip()
                data["today_tasks"] = tasks
                _save(data)
                return {"ok": True, "updated": t, "tasks": _due_today(tasks)}
        return {"ok": False, "error": f"No task found with id {task_id}"}

    elif action == "defer_task":
        if task_id is None:
            return {"ok": False, "error": "task_id is required"}
        days_int = days if isinstance(days, int) and days > 0 else 1
        target_date = _date_after(days_int)
        for t in tasks:
            if t.get("id") == task_id:
                t["scheduled_date"] = target_date
                data["today_tasks"] = tasks
                _save(data)
                return {
                    "ok": True,
                    "deferred": t,
                    "deferred_to": target_date,
                    "tasks": _due_today(tasks),
                }
        return {"ok": False, "error": f"No task found with id {task_id}"}

    elif action == "clear_done":
        tasks = [t for t in tasks if t.get("status") != "done"]
        data["today_tasks"] = tasks
        _save(data)
        return {"ok": True, "tasks": _due_today(tasks)}

    else:
        return {
            "ok": False,
            "error": f"Unknown action: '{action}'. Valid: get_tasks, add_task, complete_task, remove_task, update_task, defer_task, clear_done",
        }
