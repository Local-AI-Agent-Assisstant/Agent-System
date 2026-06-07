import { useState, useMemo } from "react";
import {
  X, Search, RotateCcw, Mail,
  Globe, Calculator, FileText, Repeat,
  Terminal, Cloud, Calendar, Lock, Cpu,
  ChevronDown, ChevronRight, Check,
  MousePointerClick, MonitorPlay,
  Users,
} from "lucide-react";
import { TOOLS } from "../../data/tools";
import GmailModal from "./GmailModal";
import ContactsModal from "./ContactsModal";
import { toggleToolPermission } from "../../api/ChatApi";

// ── Icon map: backendKey → Lucide icon ────────────────────────
const TOOL_ICONS = {
  deep_search: Globe,
  calculate: Calculator,
  get_secret_word: Lock,
  get_current_weather: Cloud,
  send_email: Mail,
  write_file: FileText,
  system_commands_windows: Terminal,
  manage_planner: Calendar,
  computer_control: MousePointerClick,
  open_program: MonitorPlay,
  execute_routine: Repeat,
};

// ── Category definitions ──────────────────────────────────────
const CATEGORIES = [
  {
    label: "Productivity",
    keys: ["manage_planner", "write_file", "execute_routine"],
  },
  {
    label: "Communication",
    keys: ["send_email"],
  },
  {
    label: "Research",
    keys: ["deep_search"],
  },
  {
    label: "System",
    keys: ["system_commands_windows", "computer_control", "open_program"],
  },
  {
    label: "Utilities",
    keys: ["calculate", "get_current_weather", "get_secret_word"],
  },
];

function ToolRow({ tool, isAllowed, onToggle, isDark, setInput, textareaRef, setIsToolSidebarOpen }) {
  const [expanded, setExpanded] = useState(false);
  const IconComp = TOOL_ICONS[tool.backendKey] || Cpu;

  return (
    <div
      className={
        "rounded-xl border transition-all duration-150 overflow-hidden " +
        (isDark
          ? "border-neutral-700/60 bg-neutral-800/40 hover:border-neutral-600"
          : "border-zinc-200 bg-white hover:border-zinc-300 shadow-sm")
      }
    >
      {/* Row header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Icon */}
        <span
          className={
            "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg " +
            (isAllowed
              ? "bg-purple-500/20 text-purple-400"
              : isDark
                ? "bg-neutral-700 text-neutral-400"
                : "bg-zinc-100 text-zinc-500")
          }
        >
          <IconComp size={15} />
        </span>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate capitalize">{tool.name}</div>
          <div className="text-[11px] opacity-50 truncate">{tool.description}</div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(tool.backendKey)}
          className={
            "flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full border transition-all " +
            (isAllowed
              ? "bg-purple-500 border-purple-500 text-white"
              : isDark
                ? "border-neutral-600 text-neutral-500 hover:border-purple-500 hover:text-purple-400"
                : "border-zinc-300 text-zinc-400 hover:border-purple-400 hover:text-purple-500")
          }
          data-tooltip={isAllowed ? "Revoke permission" : "Allow this tool"}
          data-tooltip-pos="left"
        >
          {isAllowed ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
        </button>

        {/* Expand suggestions */}
        {tool.suggestions?.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className={"flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity"}
            data-tooltip="Show suggestions"
            data-tooltip-pos="left"
          >
            {expanded
              ? <ChevronDown size={14} />
              : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      {/* Suggestions */}
      {expanded && tool.suggestions?.length > 0 && (
        <div
          className={
            "px-3 pb-3 border-t " +
            (isDark ? "border-neutral-700/50" : "border-zinc-100")
          }
        >
          <div className="pt-2 flex flex-wrap gap-1.5">
            {tool.suggestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(prev => prev ? prev + " " + q : q);
                  textareaRef.current?.focus();
                  setIsToolSidebarOpen(false);
                }}
                className={
                  "text-[11px] px-2.5 py-1 rounded-full border transition " +
                  (isDark
                    ? "border-neutral-700 hover:bg-neutral-700 text-neutral-300"
                    : "border-zinc-200 hover:bg-zinc-100 text-zinc-600")
                }
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Small inline Plus icon (not from lucide to avoid circular import issues)
function Plus({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────
function ToolSidebar({
  isDark,
  isToolSidebarOpen,
  setIsToolSidebarOpen,
  setInput,
  textareaRef,
  sessionId,
  allowedTools,
  setAllowedTools,
  handleResetPermissions,
}) {
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const anyAllowed = TOOLS.some(t => allowedTools[t.backendKey]);

  function toggleTool(backendKey) {
    const tool = TOOLS.find(t => t.backendKey === backendKey);
    const keys = tool?.backendKeys || [backendKey];
    const newValue = !allowedTools[backendKey];
    const updates = {};
    keys.forEach(k => { updates[k] = newValue; });
    setAllowedTools(prev => ({ ...prev, ...updates }));
    // Sync each key to the backend
    keys.forEach(k =>
      toggleToolPermission(k, newValue, sessionId)
        .catch(err => console.error("Permission sync failed:", err))
    );
  }

  function toggleAllowAll() {
    if (anyAllowed) {
      handleResetPermissions();
    } else {
      const next = {};
      TOOLS.forEach(t => { next[t.backendKey] = true; });
      setAllowedTools(next);
      fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/api/permissions/allow-all`, {
        method: "POST",
        body: new URLSearchParams({ session_id: sessionId, tool_names: TOOLS.map(t => t.backendKey).join(",") }),
      }).catch(err => console.error("Allow-all sync failed:", err));
    }
  }

  function toggleCategory(label) {
    setCollapsedCategories(prev => ({ ...prev, [label]: !prev[label] }));
  }

  // Filter tools by search
  const filteredTools = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return TOOLS;
    return TOOLS.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.backendKey.toLowerCase().includes(q)
    );
  }, [search]);

  // Build category → tools map from filtered results
  const categoryGroups = useMemo(() => {
    const keyToTool = Object.fromEntries(TOOLS.map(t => [t.backendKey, t]));
    const used = new Set();
    const groups = [];

    for (const cat of CATEGORIES) {
      const tools = cat.keys
        .map(k => keyToTool[k])
        .filter(t => t && filteredTools.includes(t));
      if (tools.length > 0) {
        tools.forEach(t => used.add(t.backendKey));
        groups.push({ label: cat.label, tools });
      }
    }

    // Uncategorized (fallback)
    const rest = filteredTools.filter(t => !used.has(t.backendKey));
    if (rest.length > 0) groups.push({ label: "Other", tools: rest });

    return groups;
  }, [filteredTools]);

  const commonRowProps = { isDark, setInput, textareaRef, setIsToolSidebarOpen };

  return (
    <>
      {/* Panel */}
      <div
        className={
          "absolute inset-y-0 right-0 z-40 w-[22rem] flex flex-col " +
          "transform transition-transform duration-200 ease-out " +
          (isToolSidebarOpen ? "translate-x-0" : "translate-x-full") + " " +
          (isDark
            ? "bg-neutral-900/95 border-l border-neutral-800"
            : "bg-zinc-50/95 border-l border-zinc-200") +
          " backdrop-blur-sm"
        }
      >
        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
          <div>
            <div className="text-sm font-semibold">Tools</div>
            <div className="text-[11px] opacity-40 mt-0.5">Manage AI capabilities</div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Contacts */}
            <button
              onClick={() => setShowContactsModal(true)}
              data-tooltip="Contacts"
              data-tooltip-pos="bottom"
              className={
                "p-1.5 rounded-lg transition text-[11px] font-medium " +
                (isDark
                  ? "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700")
              }
            >
              <Users size={14} />
            </button>

            {/* Gmail */}
            <button
              onClick={() => setShowGmailModal(true)}
              data-tooltip="Gmail settings"
              data-tooltip-pos="bottom"
              className={
                "p-1.5 rounded-lg transition text-[11px] font-medium " +
                (isDark
                  ? "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700")
              }
            >
              <Mail size={14} />
            </button>

            {/* Allow / Revoke All */}
            <button
              onClick={toggleAllowAll}
              data-tooltip={anyAllowed ? "Revoke all" : "Allow all"}
              data-tooltip-pos="bottom"
              className={
                "p-1.5 rounded-lg transition " +
                (isDark
                  ? "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700")
              }
            >
              <RotateCcw size={14} />
            </button>

            {/* Close */}
            <button
              onClick={() => setIsToolSidebarOpen(false)}
              className={
                "p-1.5 rounded-lg transition " +
                (isDark
                  ? "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700")
              }
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="px-4 pb-3 shrink-0">
          <div
            className={
              "flex items-center gap-2 px-3 py-2 rounded-xl border " +
              (isDark
                ? "bg-neutral-800 border-neutral-700 text-neutral-300"
                : "bg-white border-zinc-200 text-zinc-600")
            }
          >
            <Search size={13} className="opacity-50 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-40"
            />
            {search && (
              <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-80">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Permission status bar ── */}
        <div
          className={
            "mx-4 mb-3 px-3 py-2 rounded-xl text-[11px] flex items-center justify-between shrink-0 " +
            (isDark ? "bg-neutral-800/60" : "bg-zinc-100")
          }
        >
          <span className="opacity-60">
            {TOOLS.filter(t => allowedTools[t.backendKey]).length} / {TOOLS.length} tools allowed
          </span>
          <button
            onClick={toggleAllowAll}
            className={
              "font-medium transition " +
              (anyAllowed
                ? "text-red-400 hover:text-red-300"
                : "text-purple-400 hover:text-purple-300")
            }
          >
            {anyAllowed ? "Revoke all" : "Allow all"}
          </button>
        </div>

        {/* ── Tool List ── */}
        <div className="flex-1 px-4 pb-4 overflow-y-auto no-scrollbar space-y-4">
          {categoryGroups.length === 0 && (
            <div className="text-sm opacity-40 text-center pt-8">No tools match your search.</div>
          )}

          {categoryGroups.map(({ label, tools }) => (
            <div key={label}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(label)}
                className={
                  "w-full flex items-center gap-2 mb-2 px-1 group " +
                  (isDark ? "text-neutral-500" : "text-zinc-400")
                }
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest group-hover:opacity-80 transition">
                  {label}
                </span>
                <div className={"flex-1 h-px " + (isDark ? "bg-neutral-800" : "bg-zinc-200")} />
                {collapsedCategories[label]
                  ? <ChevronRight size={11} className="opacity-60" />
                  : <ChevronDown size={11} className="opacity-60" />}
              </button>

              {/* Tools in category */}
              {!collapsedCategories[label] && (
                <div className="space-y-2">
                  {tools.map(tool => (
                    <ToolRow
                      key={tool.backendKey + tool.name}
                      tool={tool}
                      isAllowed={!!allowedTools[tool.backendKey]}
                      onToggle={toggleTool}
                      {...commonRowProps}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gmail Modal */}
      <GmailModal
        isDark={isDark}
        show={showGmailModal}
        onClose={() => setShowGmailModal(false)}
      />

      {/* Contacts Modal */}
      <ContactsModal
        isDark={isDark}
        show={showContactsModal}
        onClose={() => setShowContactsModal(false)}
      />
    </>
  );
}

export default ToolSidebar;