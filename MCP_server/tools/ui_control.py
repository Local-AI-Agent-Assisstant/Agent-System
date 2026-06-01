import time
import sys

def computer_control(action: str, target_name: str = None, text: str = None, window_name: str = None) -> dict:
    """
    Automate the Windows UI by reading the screen, clicking elements, or typing text.
    You can specify window_name to target a specific app (e.g., 'Chrome', 'WhatsApp').
    """
    if sys.platform != "win32":
        return {"ok": False, "error": "This tool is only supported on Windows."}
        
    try:
        import uiautomation as auto
    except ImportError:
        return {"ok": False, "error": "uiautomation library is not installed."}

    # Small delay to ensure any UI animations or window switches finish
    time.sleep(0.1)
    
    active_win = None
    if window_name:
        window_name_lower = window_name.lower()
        # Search for a top-level window containing the specified name (case-insensitive)
        for win in auto.GetRootControl().GetChildren():
            if win.Name and window_name_lower in win.Name.lower():
                active_win = win
                break
                
        if not active_win:
            return {"ok": False, "error": f"Could not find any open window matching '{window_name}'."}
        try:
            active_win.SetFocus()
            active_win.SetActive()
            active_win.SetTopmost(True)
            active_win.SetTopmost(False)
            time.sleep(0.1)
        except Exception:
            pass
    else:
        # Try to grab the active foreground window
        active_win = auto.GetForegroundControl()
        
    if not active_win:
        return {"ok": False, "error": "No active window found."}
        
    if action == "read_screen":
        elements = []
        try:
            # Walk the accessibility tree of the current window
            for control, depth in auto.WalkTree(active_win, maxDepth=8):
                # Filter out invisible or nameless elements
                if not control.Name:
                    continue
                    
                # We only care about interactive or informational text controls
                if control.ControlType in (
                    auto.ControlType.ButtonControl,
                    auto.ControlType.DocumentControl,
                    auto.ControlType.EditControl,
                    auto.ControlType.HyperlinkControl,
                    auto.ControlType.ListItemControl,
                    auto.ControlType.MenuItemControl,
                    auto.ControlType.TextControl,
                    auto.ControlType.TabItemControl,
                    auto.ControlType.ComboBoxControl,
                    auto.ControlType.CheckBoxControl,
                ):
                    control_type_name = control.ControlTypeName
                    elements.append(f"[{control_type_name}] {control.Name}")
        except Exception as e:
            return {"ok": False, "error": f"Error scanning screen: {str(e)}"}
            
        # Deduplicate and limit to prevent massive context explosion
        unique_elements = list(dict.fromkeys(elements))
        if len(unique_elements) > 300:
            unique_elements = unique_elements[:300]
            
        return {
            "ok": True, 
            "window": active_win.Name, 
            "elements": unique_elements
        }
        
    elif action == "click":
        if not target_name:
            return {"ok": False, "error": "target_name is required for click."}
            
        # First, attempt to find an exact match by name
        target = active_win.Control(Name=target_name)
        
        # If not found immediately, do a slightly deeper partial search
        if not target.Exists(0, 0):
            target = active_win.Control(searchDepth=8, foundIndex=1, Name=target_name, matchExact=False)
            
        if target.Exists(0, 0):
            try:
                # 1. Bring it into focus
                target.SetFocus()
                time.sleep(0.1)
                
                # 2. Try native UI automation Invoke (best for real Windows buttons)
                try:
                    if hasattr(target, 'InvokePattern') and target.InvokePattern:
                        target.InvokePattern.Invoke()
                        return {"ok": True, "message": f"Successfully invoked '{target_name}'"}
                except Exception:
                    pass

                # 3. Try keyboard activation (best for web buttons like Google Meet Camera)
                try:
                    auto.SendKeys('{Space}')
                    time.sleep(0.1)
                    return {"ok": True, "message": f"Successfully pressed '{target_name}' via keyboard"}
                except Exception:
                    pass
                
                # 4. Fallback to physical mouse click
                target.Click(simulateMove=False)
                return {"ok": True, "message": f"Successfully clicked '{target_name}' in window '{active_win.Name}'"}
                
            except Exception as e:
                return {"ok": False, "error": f"Failed to click: {e}"}
        else:
            return {"ok": False, "error": f"Element '{target_name}' not found on the active screen."}
            
    elif action == "type":
        if text is None:
            return {"ok": False, "error": "text is required for type."}
            
        if target_name:
            target = active_win.Control(Name=target_name)
            if not target.Exists(0, 0):
                target = active_win.Control(searchDepth=8, foundIndex=1, Name=target_name, matchExact=False)
                
            if target.Exists(0, 0):
                try:
                    target.SetFocus()
                    time.sleep(0.1)
                    target.Click()
                    time.sleep(0.1)
                    auto.SendKeys(text, interval=0.01)
                    return {"ok": True, "message": f"Successfully typed text into '{target_name}'"}
                except Exception as e:
                    return {"ok": False, "error": f"Failed to type: {e}"}
            else:
                return {"ok": False, "error": f"Text box '{target_name}' not found on the active screen."}
        else:
            try:
                active_win.SetFocus()
                time.sleep(0.1)
                auto.SendKeys(text, interval=0.01)
                return {"ok": True, "message": f"Successfully typed text directly into window '{active_win.Name}'"}
            except Exception as e:
                return {"ok": False, "error": f"Failed to type into window: {e}"}
            
    elif action == "wait":
        try:
            wait_time = float(text) if text else 2.0
            time.sleep(wait_time)
            return {"ok": True, "message": f"Waited for {wait_time} seconds."}
        except ValueError:
            return {"ok": False, "error": "For 'wait' action, 'text' must be a number of seconds."}

    elif action == "get_clipboard":
        try:
            clipboard_text = auto.GetClipboardText()
            return {"ok": True, "clipboard": clipboard_text}
        except Exception as e:
            return {"ok": False, "error": f"Failed to get clipboard: {e}"}
            
    elif action == "set_clipboard":
        if text is None:
            return {"ok": False, "error": "text is required for set_clipboard."}
        try:
            auto.SetClipboardText(text)
            return {"ok": True, "message": "Successfully set clipboard text."}
        except Exception as e:
            return {"ok": False, "error": f"Failed to set clipboard: {e}"}

    else:
        return {"ok": False, "error": f"Unknown action: {action}. Use read_screen, click, type, wait, get_clipboard, or set_clipboard."}
