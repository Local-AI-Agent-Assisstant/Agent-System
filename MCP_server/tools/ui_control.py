import time
import sys

def computer_control(action: str, target_name: str = None, text: str = None, window_name: str = None, automation_id: str = None, class_name: str = None) -> dict:
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
        # Smart Polling: Wait up to 10 seconds for the window to appear
        for _ in range(20):
            for win in auto.GetRootControl().GetChildren():
                if win.Name and window_name_lower in win.Name.lower():
                    active_win = win
                    break
            if active_win:
                break
            time.sleep(0.5)
                
        if not active_win:
            return {"ok": False, "error": f"Could not find any open window matching '{window_name}' after waiting 10 seconds."}
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
        
    def find_target():
        # Helper to find target using name, automation_id, or class_name
        kwargs = {}
        if target_name: kwargs['Name'] = target_name
        if automation_id: kwargs['AutomationId'] = automation_id
        if class_name: kwargs['ClassName'] = class_name
        
        if not kwargs:
            return None
            
        def is_visible(ctrl):
            try:
                rect = ctrl.BoundingRectangle
                return (rect.right - rect.left) > 0 and (rect.bottom - rect.top) > 0
            except Exception:
                return False

        # 1. True fuzzy fallback (WalkTree for contains match)
        # This is actually the safest way for Chrome because it allows us to filter out hidden duplicates
        if target_name:
            target_lower = target_name.lower()
            try:
                for control, depth in auto.WalkTree(active_win, maxDepth=12):
                    if control.Name and target_lower in control.Name.lower():
                        if is_visible(control):
                            return control
            except Exception:
                pass
                
        # 2. Try deeper API match if walktree failed or we used id/class
        try:
            target = active_win.Control(searchDepth=8, foundIndex=1, matchExact=False, **kwargs)
            if target.Exists(0, 0) and is_visible(target):
                return target
        except Exception:
            pass

        return None

    if action == "read_screen":
        elements = []
        try:
            # Walk the accessibility tree of the current window
            for control, depth in auto.WalkTree(active_win, maxDepth=8):
                # Filter out invisible or nameless elements if they don't have automation_id either
                if not control.Name and not control.AutomationId:
                    continue
                    
                # Skip elements that are completely invisible/hidden
                try:
                    rect = control.BoundingRectangle
                    if (rect.right - rect.left) <= 0 or (rect.bottom - rect.top) <= 0:
                        continue
                except Exception:
                    pass

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
                    name_str = f"Name: '{control.Name}'" if control.Name else ""
                    id_str = f"ID: '{control.AutomationId}'" if control.AutomationId else ""
                    class_str = f"Class: '{control.ClassName}'" if control.ClassName else ""
                    parts = [p for p in [name_str, id_str, class_str] if p]
                    elements.append(f"[{control_type_name}] " + ", ".join(parts))
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
        
    elif action in ("click", "right_click", "double_click"):
        target = find_target()
        if not target:
            return {"ok": False, "error": "Element not found on the active screen."}
            
        try:
            target.SetFocus()
            time.sleep(0.1)
            
            if action == "click":
                # Try InvokePattern first for regular clicks
                try:
                    if hasattr(target, 'InvokePattern') and target.InvokePattern:
                        target.InvokePattern.Invoke()
                        # Do not return immediately. Fallback to physical click just in case Invoke is ignored by browsers like Chrome.
                except Exception:
                    pass
                target.Click(simulateMove=True)
            elif action == "right_click":
                target.RightClick(simulateMove=True)
            elif action == "double_click":
                target.DoubleClick(simulateMove=True)
                
            return {"ok": True, "message": f"Successfully performed {action} on element in '{active_win.Name}'"}
        except Exception as e:
            return {"ok": False, "error": f"Failed to {action}: {e}"}
            
    elif action == "type":
        if text is None:
            return {"ok": False, "error": "text is required for type."}
            
        target = find_target() if (target_name or automation_id or class_name) else None
        
        if target:
            try:
                target.SetFocus()
                time.sleep(0.1)
                target.Click(simulateMove=False)
                time.sleep(0.1)
                auto.SendKeys(text, interval=0.01)
                return {"ok": True, "message": "Successfully typed text into element"}
            except Exception as e:
                return {"ok": False, "error": f"Failed to type into element: {e}"}
        else:
            try:
                active_win.SetFocus()
                time.sleep(0.1)
                auto.SendKeys(text, interval=0.01)
                return {"ok": True, "message": f"Successfully typed text directly into window '{active_win.Name}'"}
            except Exception as e:
                return {"ok": False, "error": f"Failed to type into window: {e}"}
                
    elif action == "hotkey":
        if text is None:
            return {"ok": False, "error": "text (hotkey combo like '{Ctrl}c') is required for hotkey."}
        try:
            active_win.SetFocus()
            time.sleep(0.1)
            
            import re
            # Split chained hotkeys (e.g. "{Ctrl}l{Ctrl}c" -> ['{Ctrl}l', '{Ctrl}c'])
            parts = [p for p in re.split(r'(?=\{)', text) if p]
            
            for i, part in enumerate(parts):
                auto.SendKeys(part)
                # Inject a 0.3s delay between chained hotkeys so the UI can process them
                if i < len(parts) - 1:
                    time.sleep(0.3)
                    
            return {"ok": True, "message": f"Successfully sent hotkey: {text}"}
        except Exception as e:
            return {"ok": False, "error": f"Failed to send hotkey: {e}"}
            
    elif action == "scroll_up":
        try:
            active_win.SetFocus()
            auto.SendKeys('{PageUp}')
            return {"ok": True, "message": "Scrolled up."}
        except Exception as e:
            return {"ok": False, "error": f"Failed to scroll up: {e}"}
            
    elif action == "scroll_down":
        try:
            active_win.SetFocus()
            auto.SendKeys('{PageDown}')
            return {"ok": True, "message": "Scrolled down."}
        except Exception as e:
            return {"ok": False, "error": f"Failed to scroll down: {e}"}
            
    elif action in ("maximize", "minimize", "restore", "close_window"):
        try:
            if action == "maximize" and hasattr(active_win, 'Maximize'):
                active_win.Maximize()
            elif action == "minimize" and hasattr(active_win, 'Minimize'):
                active_win.Minimize()
            elif action == "restore" and hasattr(active_win, 'Restore'):
                active_win.Restore()
            elif action == "close_window":
                if hasattr(active_win, 'WindowPattern') and active_win.WindowPattern:
                    active_win.WindowPattern.Close()
                else:
                    auto.SendKeys('{Alt}{F4}')
            return {"ok": True, "message": f"Successfully performed {action} on window '{active_win.Name}'"}
        except Exception as e:
            return {"ok": False, "error": f"Failed to {action} window: {e}"}
            
    elif action == "read_value":
        target = find_target()
        if not target:
            return {"ok": False, "error": "Element not found to read value."}
        try:
            val = None
            if hasattr(target, 'ValuePattern') and target.ValuePattern:
                val = target.ValuePattern.Value
            elif hasattr(target, 'TogglePattern') and target.TogglePattern:
                val = str(target.TogglePattern.ToggleState)
            else:
                val = target.Name
            return {"ok": True, "value": val}
        except Exception as e:
            return {"ok": False, "error": f"Failed to read value: {e}"}
            
    elif action == "wait":
        try:
            wait_time = float(text) if text else 2.0
            if wait_time > 10.0:
                wait_time = 10.0
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
        return {"ok": False, "error": f"Unknown action: {action}."}
