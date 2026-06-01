import platform
import subprocess
import re
import requests


#------------------------------------------System commands ------------------------------------------------------------- 
# --- NEW: safe system commands tool (Windows) ---

_SYSTEM_ACTIONS = {
    # Network (data-only)
    "ipconfig_all": ["ipconfig", "/all"],
    "ipconfig": ["ipconfig"],
    "routes": ["route", "print"],
    "arp_table": ["arp", "-a"],
    "netstat": ["netstat", "-ano"],
    "wifi_status": ["netsh", "wlan", "show", "interfaces"],
    "public_ip": [],  # handled specially

    # Device info (data-only)
    "systeminfo": ["systeminfo"],

    # PowerShell (data-only)
    "ps_net_ipconfig": [
        "powershell",
        "-NoProfile",
        "-Command",
        "Get-NetIPConfiguration | Format-List *"
    ],
    "ps_adapters": [
        "powershell",
        "-NoProfile",
        "-Command",
        "Get-NetAdapter | Format-Table -AutoSize"
    ],
    "ps_adapter_stats": [
        "powershell",
        "-NoProfile",
        "-Command",
        "Get-NetAdapterStatistics | Format-Table -AutoSize"
    ],
    "ps_performance": [
        "powershell",
        "-NoProfile",
        "-Command",
        "Get-Counter -Counter '\\Processor(_Total)\\% Processor Time', '\\Memory\\Available MBytes' | Select-Object -ExpandProperty CounterSamples | Format-Table -AutoSize"
    ],
}

_HOST_RE = re.compile(r"^[a-zA-Z0-9\.\-:_]+$")  # simple safe host pattern (no spaces)

def system_commands_windows(
    action: str,
    host: str | None = None,
    count: int = 4,
    max_output_chars: int = 12000,
) -> dict:
    """
    Safe Windows system commands (DATA-ONLY).
    action: one of the keys in _SYSTEM_ACTIONS, plus: "ping"
    host: required for ping
    count: ping count (1..8)
    Returns structured dict with stdout/stderr/returncode.
    """
    if platform.system().lower() != "windows":
        return {
            "ok": False,
            "error": "system_commands_windows is Windows-only.",
            "platform": platform.system()
        }

    action = (action or "").strip()

    # Special case: ping (still data-only, but does send ICMP packets)
    if action == "ping":
        if not host or not isinstance(host, str) or not _HOST_RE.match(host):
            return {"ok": False, "error": "Invalid host for ping."}
        try:
            count = int(count)
        except Exception:
            count = 4
        count = max(1, min(count, 8))
        cmd = ["ping", host, "-n", str(count)]
    elif action == "public_ip":
        try:
            r = requests.get("https://api.ipify.org?format=json", timeout=12)
            r.raise_for_status()
            return {"ok": True, "action": action, "public_ip": r.json().get("ip")}
        except Exception as e:
            return {"ok": False, "action": action, "error": str(e)}
    else:
        if action not in _SYSTEM_ACTIONS:
            return {
                "ok": False,
                "error": "Unknown action.",
                "allowed_actions": sorted(list(_SYSTEM_ACTIONS.keys()) + ["ping"])
            }
        cmd = _SYSTEM_ACTIONS[action]

    try:
        p = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=25,
            shell=False,
        )
        out = (p.stdout or "").strip()
        err = (p.stderr or "").strip()

        # Trim output so you don't flood the model
        if len(out) > max_output_chars:
            out = out[:max_output_chars] + "\n...[truncated]"
        if len(err) > 4000:
            err = err[:4000] + "\n...[truncated]"

        return {
            "ok": True,
            "action": action,
            "command": cmd,
            "returncode": p.returncode,
            "stdout": out,
            "stderr": err,
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "action": action, "error": "Command timed out."}
    except Exception as e:
        return {"ok": False, "action": action, "error": str(e)}


