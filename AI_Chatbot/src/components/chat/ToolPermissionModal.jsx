import { useState, useEffect } from "react";

function ToolPermissionModal({ isDark, show, toolName, toolArgs, onAllow, onDeny, onGrantFullAccess }) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const [showFullAccessMenu, setShowFullAccessMenu] = useState(false);

  // Reset checkbox when modal hides
  useEffect(() => {
    if (!show) {
      setDontAskAgain(false);
      setShowFullAccessMenu(false);
      if (window.electronAPI) window.electronAPI.releaseMainWindowFocus();
    } else {
      if (window.electronAPI) window.electronAPI.requestMainWindowFocus();
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;

    setSeconds(60);

    const interval = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1050]">
      <div className={"w-80 p-5 rounded-xl shadow-lg " +
        (isDark ? "bg-neutral-800 text-neutral-100" : "bg-white text-neutral-900")}>

        <h1 className="text-lg font-semibold mb-3">Allow this action?</h1>

        <p className="text-sm opacity-80 mb-1">The AI wants to use:</p>
        <p className="text-sm font-mono bg-black/20 rounded px-2 py-1 mb-2 break-all font-bold">
          {toolName}
        </p>

        {toolArgs && Object.keys(toolArgs).length > 0 && (
          <div className="mb-4">
            <p className="text-xs opacity-60 mb-1">With arguments:</p>
            <pre className="text-xs font-mono bg-black/20 rounded px-2 py-2 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
              {JSON.stringify(toolArgs, null, 2)}
            </pre>
          </div>
        )}

        <div className="mb-4 space-y-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="rounded border-zinc-300 w-4 h-4 cursor-pointer focus:ring-blue-500 text-blue-600 bg-transparent"
            />
            <span className="opacity-80">Don't ask again for this tool</span>
          </label>

          {/* ✅ aligned properly */}
          <p className="text-xs opacity-60 pl-6">
            This request will expire in {seconds}s
          </p>
        </div>
        
        <div className="flex justify-between items-center gap-2 mt-4 relative">
          <div>
            <button 
              onClick={() => setShowFullAccessMenu(!showFullAccessMenu)}
              className={"px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors " +
                (isDark ? "bg-purple-900/40 text-purple-300 hover:bg-purple-800/60" : "bg-purple-100 text-purple-700 hover:bg-purple-200")}>
              Full Access ▾
            </button>
            {showFullAccessMenu && (
              <div className={"absolute bottom-full left-0 mb-2 w-36 rounded-lg shadow-xl border overflow-hidden z-50 " +
                (isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-zinc-200")}>
                <div className="flex flex-col text-sm">
                  {[
                    { label: "10 seconds", value: 10 },
                    { label: "30 seconds", value: 30 },
                    { label: "1 minute", value: 60 },
                    { label: "3 minutes", value: 180 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onGrantFullAccess?.(opt.value)}
                      className={"px-3 py-2 text-left transition-colors " + 
                        (isDark ? "hover:bg-white/10" : "hover:bg-black/5")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onDeny}
              className={"px-4 py-1.5 rounded-lg border " +
                (isDark ? "border-neutral-600 hover:bg-neutral-700" : "border-zinc-300 hover:bg-zinc-100")}>
              Deny
            </button>
            <button onClick={() => onAllow(dontAskAgain)}
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToolPermissionModal;
