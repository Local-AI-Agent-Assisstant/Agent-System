import { useState, useMemo } from "react";
import { Plus, MessageSquare, Pencil, Trash2, Check, X, Search, Clock } from "lucide-react";

// ── Relative time formatter ───────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Group conversations by recency ────────────────────────────
function groupByDate(conversations) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const week  = today - 6 * 86400000;

  const groups = { Today: [], "This Week": [], Older: [] };
  for (const c of conversations) {
    const t = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
    if (t >= today)     groups["Today"].push(c);
    else if (t >= week) groups["This Week"].push(c);
    else                groups["Older"].push(c);
  }
  return groups;
}

function Sidebar({
  isDark,
  isSidebarOpen,
  conversations,
  activeConversationId,
  editingConversationId,
  editingConversationTitle,
  setEditingConversationTitle,
  handleNewChat,
  handleSelectChat,
  handleDeleteChat,
  startEditChatTitle,
  saveChatTitle,
  cancelChatTitleEdit,
  setIsSidebarOpen,
  setShowDeleteAllModal,
}) {
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (label) =>
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));

  // Filter conversations by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return conversations || [];
    return (conversations || []).filter(c =>
      (c.title || "New chat").toLowerCase().includes(q)
    );
  }, [search, conversations]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <>
      {/* ── Sidebar Drawer ── */}
      <div
        className={
          "absolute inset-y-0 left-0 z-40 w-[22rem] flex flex-col " +
          "transform transition-transform duration-200 ease-out " +
          (isSidebarOpen ? "translate-x-0" : "-translate-x-full") + " " +
          (isDark
            ? "bg-neutral-900/95 border-r border-neutral-800"
            : "bg-zinc-50/95 border-r border-zinc-200") +
          " backdrop-blur-sm"
        }
        aria-hidden={!isSidebarOpen}
      >
        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
          <div>
            <div className="text-sm font-semibold">Chats</div>
            <div className="text-[11px] opacity-40 mt-0.5">
              {(conversations || []).length} conversation{(conversations || []).length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Delete all */}
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              data-tooltip="Delete all chats"
              data-tooltip-pos="bottom"
              className={
                "p-1.5 rounded-lg transition " +
                (isDark
                  ? "text-neutral-400 hover:bg-neutral-800 hover:text-red-400"
                  : "text-zinc-500 hover:bg-zinc-200 hover:text-red-500")
              }
            >
              <Trash2 size={14} />
            </button>

            {/* New chat */}
            <button
              type="button"
              onClick={handleNewChat}
              data-tooltip="New chat"
              data-tooltip-pos="bottom"
              className={
                "p-1.5 rounded-lg transition " +
                (isDark
                  ? "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                  : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700")
              }
            >
              <Plus size={14} />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              data-tooltip="Close"
              data-tooltip-pos="bottom"
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
              placeholder="Search chats..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-40"
            />
            {search && (
              <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-80">
                <X size={12} />
              </button>
            )}
          </div>
        </div>




        {/* ── Conversation List ── */}
        <div className="flex-1 px-4 pb-4 overflow-y-auto no-scrollbar space-y-4">

          {filtered.length === 0 && (
            <div className="text-sm opacity-40 text-center pt-8">
              {search ? "No chats match your search." : "No conversations yet."}
            </div>
          )}

          {["Today", "This Week", "Older"].map(groupLabel => {
            const items = groups[groupLabel];
            if (!items || items.length === 0) return null;
            const isCollapsed = collapsedGroups[groupLabel];

            return (
              <div key={groupLabel}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(groupLabel)}
                  className={
                    "w-full flex items-center gap-2 mb-2 px-1 group " +
                    (isDark ? "text-neutral-500" : "text-zinc-400")
                  }
                >
                  <Clock size={10} className="opacity-60" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest group-hover:opacity-80 transition">
                    {groupLabel}
                  </span>
                  <div className={"flex-1 h-px " + (isDark ? "bg-neutral-800" : "bg-zinc-200")} />
                  <span className="text-[10px] opacity-50">{items.length}</span>
                </button>

                {/* Chat rows */}
                {!isCollapsed && (
                  <div className="space-y-1">
                    {items.map(c => {
                      const active = c.id === activeConversationId;
                      const isEditing = editingConversationId === c.id;

                      return (
                        <div
                          key={c.id}
                          onClick={() => !isEditing && handleSelectChat(c.id)}
                          className={
                            "group w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-start gap-2.5 " +
                            (active
                              ? isDark
                                ? "border-neutral-600 bg-neutral-800"
                                : "border-zinc-300 bg-white shadow-sm"
                              : isDark
                                ? "border-transparent hover:border-neutral-700/60 hover:bg-neutral-800/40"
                                : "border-transparent hover:border-zinc-200 hover:bg-white hover:shadow-sm")
                          }
                        >
                          {/* Icon */}
                          <span className={
                            "flex-shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-lg " +
                            (active
                              ? isDark ? "bg-neutral-700 text-neutral-200" : "bg-zinc-100 text-zinc-600"
                              : isDark ? "text-neutral-500" : "text-zinc-400")
                          }>
                            <MessageSquare size={12} />
                          </span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <input
                                  value={editingConversationTitle}
                                  onChange={e => setEditingConversationTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter")  saveChatTitle();
                                    if (e.key === "Escape") cancelChatTitleEdit();
                                  }}
                                  className={
                                    "w-full text-xs px-2 py-1 rounded-lg border outline-none " +
                                    (isDark
                                      ? "bg-neutral-900 border-neutral-600 text-neutral-100"
                                      : "bg-white border-zinc-300 text-zinc-900")
                                  }
                                  autoFocus
                                />
                                <button
                                  onClick={e => { e.stopPropagation(); saveChatTitle(); }}
                                  className={"p-1 rounded-md transition " + (isDark ? "hover:bg-neutral-700 text-neutral-300" : "hover:bg-zinc-200 text-zinc-600")}
                                  data-tooltip="Save"
                                  data-tooltip-pos="bottom"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); cancelChatTitleEdit(); }}
                                  className={"p-1 rounded-md transition " + (isDark ? "hover:bg-neutral-700 text-neutral-300" : "hover:bg-zinc-200 text-zinc-600")}
                                  data-tooltip="Cancel"
                                  data-tooltip-pos="bottom"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="text-[13px] font-medium truncate leading-snug">
                                  {c.title || "New chat"}
                                </div>
                                <div className="text-[11px] opacity-40 mt-0.5 truncate">
                                  {relativeTime(c.updatedAt)}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Action buttons — visible on hover or when active */}
                          {!isEditing && (
                            <div className={
                              "flex-shrink-0 flex items-center gap-0.5 transition-opacity " +
                              (active ? "opacity-60" : "opacity-0 group-hover:opacity-60")
                            }>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); startEditChatTitle(c.id, c.title); }}
                                className={"p-1 rounded-md transition hover:opacity-100 " + (isDark ? "hover:bg-neutral-700" : "hover:bg-zinc-200")}
                                data-tooltip="Rename"
                                data-tooltip-pos="bottom"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleDeleteChat(c.id); }}
                                className={"p-1 rounded-md transition hover:opacity-100 hover:text-red-400 " + (isDark ? "hover:bg-neutral-700" : "hover:bg-zinc-200")}
                                data-tooltip="Delete"
                                data-tooltip-pos="bottom"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Backdrop ── */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(false)}
        className={
          "absolute inset-0 z-30 transition-opacity duration-200 " +
          (isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none")
        }
        style={{ background: "rgba(0,0,0,0.35)" }}
        aria-hidden={!isSidebarOpen}
        tabIndex={-1}
      />
    </>
  );
}

export default Sidebar;
