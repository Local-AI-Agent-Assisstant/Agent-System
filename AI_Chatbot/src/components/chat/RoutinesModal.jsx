import { useState, useEffect } from "react";
import { X, Play, Zap, Trash2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { getRoutines, deleteRoutine, updateRoutinePrompt } from "../../api/ChatApi";

export default function RoutinesModal({ isDark, isOpen, onClose, onExecute }) {
  const [routines, setRoutines] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  // Map of routineName → draft prompt text being edited
  const [draftPrompts, setDraftPrompts] = useState({});
  // Map of routineName → "saving" | "saved" | "error" | null
  const [saveStatus, setSaveStatus] = useState({});

  useEffect(() => {
    if (isOpen) fetchRoutines();
  }, [isOpen]);

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const data = await getRoutines();
      if (data.ok) {
        setRoutines(data.routines);
        // Initialise draft prompts from saved data
        const drafts = {};
        for (const [name, r] of Object.entries(data.routines)) {
          drafts[name] = r.prompt || "";
        }
        setDraftPrompts(drafts);
      }
    } catch (err) {
      console.error("Failed to fetch routines:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete routine "${name}"?`)) return;
    try {
      const res = await deleteRoutine(name);
      if (res.ok) {
        fetchRoutines();
        if (selectedRoutine === name) setSelectedRoutine(null);
      } else {
        alert("Failed to delete: " + res.error);
      }
    } catch (err) {
      alert("Error deleting routine.");
    }
  };

  const handleSavePrompt = async (name) => {
    setSaveStatus(s => ({ ...s, [name]: "saving" }));
    try {
      const res = await updateRoutinePrompt(name, draftPrompts[name] ?? "");
      if (res.ok) {
        setSaveStatus(s => ({ ...s, [name]: "saved" }));
        // Update local routines cache
        setRoutines(r => ({
          ...r,
          [name]: { ...r[name], prompt: draftPrompts[name] ?? "" }
        }));
        setTimeout(() => setSaveStatus(s => ({ ...s, [name]: null })), 2000);
      } else {
        setSaveStatus(s => ({ ...s, [name]: "error" }));
      }
    } catch {
      setSaveStatus(s => ({ ...s, [name]: "error" }));
    }
  };

  if (!isOpen) return null;

  const base = isDark ? "bg-neutral-900 border-neutral-800 text-neutral-100" : "bg-white border-zinc-200 text-zinc-900";
  const card = isDark ? "bg-neutral-800/50 border-neutral-700/50 hover:border-neutral-600" : "bg-neutral-50 border-neutral-200 hover:border-purple-200 hover:bg-white";
  const expanded = isDark ? "border-t border-white/5" : "border-t border-black/5";
  const inputCls = isDark
    ? "bg-neutral-900 border-neutral-600 text-neutral-100 placeholder-neutral-500 focus:border-purple-500"
    : "bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400 focus:border-purple-400";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={"w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border " + base}>

        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Routine Mode</h2>
              <p className="text-xs opacity-50 font-medium">Saved automation chains</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={"p-2 rounded-full transition-colors " + (isDark ? "hover:bg-neutral-800 text-neutral-400" : "hover:bg-neutral-100 text-neutral-500")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[65vh] p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading routines...</span>
            </div>
          ) : Object.keys(routines).length === 0 ? (
            <div className="text-center py-12 opacity-50">
              <p className="text-sm">No routines found.</p>
              <p className="text-xs mt-1">Ask the AI to create one for you!</p>
            </div>
          ) : (
            Object.entries(routines).map(([name, data]) => {
              const isExpanded = selectedRoutine === name;
              const status = saveStatus[name];
              return (
                <div
                  key={name}
                  className={"rounded-2xl border transition-all duration-200 " + card}
                >
                  {/* Row */}
                  <div className="p-4 flex items-center gap-3">
                    {/* Expand toggle */}
                    <button
                      onClick={() => setSelectedRoutine(isExpanded ? null : name)}
                      className="flex-1 flex items-start gap-3 text-left"
                    >
                      <span className={"mt-0.5 opacity-40 " + (isExpanded ? "text-purple-400 opacity-80" : "")}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm">{name}</h3>
                        <p className="text-xs opacity-55 line-clamp-1 mt-0.5">{data.description}</p>
                      </div>
                    </button>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => handleDelete(e, name)}
                        className={"w-9 h-9 flex items-center justify-center rounded-xl transition-colors " + (isDark ? "text-neutral-500 hover:bg-red-500/20 hover:text-red-400" : "text-neutral-400 hover:bg-red-50 hover:text-red-500")}
                        data-tooltip="Delete routine"
                        data-tooltip-pos="bottom"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => { onExecute(name); onClose(); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-500 hover:scale-105 transition-all shadow-lg shadow-purple-600/20"
                        data-tooltip="Run routine"
                        data-tooltip-pos="bottom"
                      >
                        <Play size={16} fill="currentColor" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className={"px-4 pb-4 " + expanded}>
                      <div className="pt-3 space-y-4">

                        {/* Steps list */}
                        <div>
                          <span className="text-[10px] uppercase tracking-wider opacity-40 font-bold block mb-2">
                            Automation Steps
                          </span>
                          <div className="space-y-1.5">
                            {data.steps.map((step, i) => (
                              <div key={i} className={"flex items-center gap-3 p-2.5 rounded-xl " + (isDark ? "bg-black/20" : "bg-white border border-black/5")}>
                                <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className={"text-xs font-mono font-bold " + (isDark ? "text-purple-300" : "text-purple-600")}>
                                    {step.tool}
                                  </span>
                                  <div className="text-[10px] opacity-50 font-mono mt-0.5 truncate">
                                    {JSON.stringify(step.args).substring(0, 80)}{JSON.stringify(step.args).length > 80 ? "…" : ""}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Custom prompt editor */}
                        <div>
                          <span className="text-[10px] uppercase tracking-wider opacity-40 font-bold block mb-2">
                            Execution Prompt <span className="normal-case opacity-70">(optional — helps the AI understand your goal)</span>
                          </span>
                          <textarea
                            rows={3}
                            value={draftPrompts[name] ?? ""}
                            onChange={(e) => setDraftPrompts(p => ({ ...p, [name]: e.target.value }))}
                            placeholder="e.g. Save the Wi-Fi info as a PDF named 'network_report.pdf', then email it to me."
                            className={"w-full rounded-xl border px-3 py-2 text-xs resize-none outline-none transition-colors " + inputCls}
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className={"text-[10px] " + (
                              status === "saved" ? "text-green-500" :
                              status === "error" ? "text-red-500" : "opacity-0"
                            )}>
                              {status === "saved" ? "✓ Saved" : status === "error" ? "✗ Failed to save" : "·"}
                            </span>
                            <button
                              onClick={() => handleSavePrompt(name)}
                              disabled={status === "saving"}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50"
                            >
                              <Save size={12} />
                              {status === "saving" ? "Saving…" : "Save Prompt"}
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 text-center">
          <p className="text-[10px] opacity-35 italic">Routines and prompts are stored locally.</p>
        </div>
      </div>
    </div>
  );
}
