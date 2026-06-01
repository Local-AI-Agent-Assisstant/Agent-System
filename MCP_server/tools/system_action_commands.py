import os
import subprocess
import platform
import shutil
import winreg

user_profile = os.environ.get("USERPROFILE", "")

# Common program paths/names in Windows
_COMMON_PROGRAMS = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "chrome": "chrome.exe",
    "edge": "msedge.exe",
    "explorer": "explorer.exe",
    "cmd": "cmd.exe",
    "powershell": "powershell.exe",
    "word": "winword.exe",
    "excel": "excel.exe",
    "powerpoint": "powerpnt.exe",
    "paint": "mspaint.exe",
    "task manager": "taskmgr.exe"
}

_COMMON_FOLDERS = {
    "downloads": os.path.join(user_profile, "Downloads"),
    "documents": os.path.join(user_profile, "Documents"),
    "desktop": os.path.join(user_profile, "Desktop"),
    "pictures": os.path.join(user_profile, "Pictures"),
    "videos": os.path.join(user_profile, "Videos"),
    "music": os.path.join(user_profile, "Music"),
    "c drive": "C:\\",
}

_CRITICAL_SYSTEM_PROCESSES = {
    "explorer.exe", "svchost.exe", "csrss.exe", "winlogon.exe", "smss.exe",
    "services.exe", "lsass.exe", "system", "system idle process", "registry",
    "wininit.exe", "lsm.exe", "spoolsv.exe", "dwm.exe", "conhost.exe",
    "taskhostw.exe", "sihost.exe", "fontdrvhost.exe", "taskmgr.exe"
}

def _get_running_processes(search_name: str) -> list:
    """Returns a list of running process image names that match the search string."""
    if not search_name:
        return []
    search_name = search_name.replace(".exe", "").lower().strip()
    
    try:
        # Get all processes in CSV format to parse them easily
        output = subprocess.check_output(
            ["tasklist", "/FO", "CSV", "/NH"],
            text=True, creationflags=subprocess.CREATE_NO_WINDOW
        )
        matches = set()
        for line in output.strip().splitlines():
            if not line:
                continue
            parts = line.split('","')
            if parts:
                exe_name = parts[0].strip('"').lower()
                base_name = exe_name[:-4] if exe_name.endswith(".exe") else exe_name
                # Exact match or starts with name + delimiter (like WhatsApp.Root)
                if base_name == search_name or base_name.startswith(search_name + ".") or base_name.startswith(search_name + "-"):
                    matches.add(exe_name)
        return list(matches)
    except Exception:
        return []

def _is_program_running(name: str) -> bool:
    """Checks if a process with the given name is currently running."""
    return len(_get_running_processes(name)) > 0

def _find_windows_program(name: str) -> str:
    """Attempt to find the executable or shortcut for a given program name."""
    name = name.lower().strip()
    if not name:
        return ""
        
    name_exe = name if name.endswith(".exe") else name + ".exe"
    base_name = name[:-4] if name.endswith(".exe") else name

    # 1. Check Start Menu shortcuts (.lnk) FIRST
    start_menu_dirs = [
        os.path.join(os.environ.get("ProgramData", r"C:\ProgramData"), r"Microsoft\Windows\Start Menu\Programs")
    ]
    if user_profile:
        start_menu_dirs.append(os.path.join(user_profile, r"AppData\Roaming\Microsoft\Windows\Start Menu\Programs"))

    for d in start_menu_dirs:
        if not os.path.exists(d):
            continue
        for root, dirs, files in os.walk(d):
            for f in files:
                # e.g., "Cursor.lnk" or "Google Chrome.lnk"
                if f.lower().endswith(".lnk") and base_name in f.lower():
                    return os.path.join(root, f)

    # 2. Check PATH
    path_check = shutil.which(name_exe)
    if path_check:
        return path_check

    # 3. Check Registry App Paths
    for root_key in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
        try:
            with winreg.OpenKey(root_key, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\\" + name_exe) as key:
                val, _ = winreg.QueryValueEx(key, "")
                if val and os.path.exists(val):
                    return val
        except FileNotFoundError:
            pass

    # 4. Check common installation directories (shallow search)
    search_dirs = [
        os.environ.get("ProgramFiles", r"C:\Program Files"),
        os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"),
    ]
    if user_profile:
        search_dirs.append(os.path.join(user_profile, "AppData", "Local", "Programs"))

    for d in search_dirs:
        if not os.path.exists(d):
            continue
        # Limit depth to avoid taking too long
        for root, dirs, files in os.walk(d):
            depth = root[len(d):].count(os.sep)
            if depth > 3:
                dirs.clear()
                continue
            for f in files:
                if f.lower() == name_exe:
                    return os.path.join(root, f)

    return ""

def open_program(program_name_or_path: str, force_new: bool = False) -> dict:
    """
    Opens a program, file, or folder on the user's system.
    If force_new is False, checks if it's already running first (only applies to programs).
    """
    if platform.system().lower() != "windows":
        return {
            "ok": False,
            "error": "open_program is currently only supported on Windows.",
            "platform": platform.system()
        }

    target = program_name_or_path.strip()
    
    # Check if it's a common folder request
    if target.lower() in _COMMON_FOLDERS:
        target = _COMMON_FOLDERS[target.lower()]

    # If the target is an existing absolute path (file or folder), just open it
    if os.path.isabs(target) and os.path.exists(target):
        try:
            os.startfile(target)
            return {
                "ok": True,
                "action": "open_program",
                "already_running": False,
                "target": target,
                "message": f"Successfully opened {target}"
            }
        except Exception as e:
            return {"ok": False, "error": f"Failed to open {target}. Error: {e}"}

    # Otherwise, treat as program/app
    
    # Check if target contains command line arguments (e.g., "chrome https://meet.google.com")
    import shlex
    args = []
    base_exe = target
    
    if " " in target and not os.path.exists(target):
        try:
            parts = shlex.split(target, posix=False)
            if parts:
                base_exe = parts[0]
                args = parts[1:]
        except Exception:
            pass

    # Removed the check for already running programs so it doesn't ask the user.
    # We rely on Windows' default behavior (which focuses UWP apps or opens new instances if needed).
    executable = _COMMON_PROGRAMS.get(base_exe.lower(), None)
    if not executable:
        found_path = _find_windows_program(base_exe)
        if found_path:
            executable = found_path
        else:
            executable = base_exe

    try:
        if args:
            subprocess.Popen([executable] + args, creationflags=subprocess.CREATE_NEW_CONSOLE | 0x00000008)
            return {
                "ok": True,
                "action": "open_program",
                "already_running": False,
                "target": f"{executable} {' '.join(args)}",
                "message": f"Successfully launched {executable} with arguments"
            }
        else:
            os.startfile(executable)
            return {
                "ok": True,
                "action": "open_program",
                "already_running": False,
                "target": executable,
                "message": f"Successfully launched {executable}"
            }
    except Exception as e:
        # 1. Try treating it as a Windows URI scheme (e.g. whatsapp: or spotify:)
        if executable == target and not os.path.isabs(target) and ":" not in target:
            try:
                os.startfile(target + ":")
                return {
                    "ok": True,
                    "action": "open_program",
                    "already_running": False,
                    "target": target + ":",
                    "message": f"Successfully launched {target} via URI scheme"
                }
            except Exception:
                pass
                
        # 2. Try checking AppData\Local\Microsoft\WindowsApps explicitly (for MS Store execution aliases)
        if executable == target and not os.path.isabs(target):
            local_appdata = os.environ.get("LOCALAPPDATA", "")
            if local_appdata:
                alias_name = target if target.lower().endswith(".exe") else target + ".exe"
                alias_path = os.path.join(local_appdata, "Microsoft", "WindowsApps", alias_name)
                if os.path.exists(alias_path):
                    try:
                        os.startfile(alias_path)
                        return {
                            "ok": True,
                            "action": "open_program",
                            "already_running": False,
                            "target": alias_path,
                            "message": f"Successfully launched {alias_path} from WindowsApps"
                        }
                    except Exception:
                        pass

        # If all fallbacks fail, return an explicit error so the AI doesn't hallucinate success
        return {
            "ok": False,
            "action": "open_program",
            "target": executable,
            "error": f"Failed to start '{program_name_or_path}'. Windows could not find it. Make sure it's installed or provide the full path. (Error: {e})"
        }

def close_program(program_name: str = "", program: str = "") -> dict:
    """
    Closes a running program using Windows taskkill.
    Has a strict blacklist to prevent closing system critical processes.
    """
    if platform.system().lower() != "windows":
        return {"ok": False, "error": "close_program is currently only supported on Windows."}
        
    name = (program_name or program).strip().lower()
    if not name:
        return {"ok": False, "error": "Program name cannot be empty."}
        
    # Translate common names to their actual executable names (e.g. 'word' -> 'winword.exe')
    if name in _COMMON_PROGRAMS:
        exe_name = _COMMON_PROGRAMS[name]
        name = exe_name[:-4] if exe_name.endswith(".exe") else exe_name
        
    # Get all running processes that match the name
    running_processes = _get_running_processes(name)
    
    if not running_processes:
        return {
            "ok": False,
            "error": f"Could not find a running process named '{name}'."
        }
        
    killed = []
    errors = []
    
    for process in running_processes:
        if process in _CRITICAL_SYSTEM_PROCESSES:
            errors.append(f"Security restriction: Closing '{process}' is blocked because it is a critical system process.")
            continue
            
        try:
            # /F forces the process to close
            # /IM specifies the image name
            output = subprocess.check_output(
                ["taskkill", "/F", "/IM", process],
                text=True, creationflags=subprocess.CREATE_NO_WINDOW, stderr=subprocess.STDOUT
            )
            killed.append(process)
        except subprocess.CalledProcessError as e:
            errors.append(f"Failed to close {process}: {e.output.strip()}")

    if not killed and errors:
        return {"ok": False, "error": " | ".join(errors)}
        
    return {
        "ok": True,
        "action": "close_program",
        "target": ", ".join(killed),
        "message": f"Successfully closed {', '.join(killed)}." + (" (Errors: " + " | ".join(errors) + ")" if errors else "")
    }


