import { useState } from "react";
import {
  X, RefreshCw, Calendar,
  Circle, CheckCircle2, CalendarClock, AlertTriangle,
  ChevronDown, ChevronRight,
} from "lucide-react";

function PlannerSidebar({ isDark, isPlannerOpen, setIsPlannerOpen, tasks, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const today = new Date().toISOString().split("T")[0];

  const overdue  = tasks.filter(t => t.status === "pending" && t.scheduled_date && t.scheduled_date < today);
  const pending  = tasks.filter(t => t.status === "pending" && (!t.scheduled_date || t.scheduled_date === today));
  const done     = tasks.filter(t => t.status === "done");
  const upcoming = tasks.filter(t => t.status === "pending" && t.scheduled_date && t.scheduled_date > today);

  const handleRefresh = async () => {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const toggleSection = (key) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Reusable section header ──────────────────────────────
  const SectionHeader = ({ label, count, sectionKey, color = "" }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className={"w-full flex items-center gap-2 mb-2 px-1 group " + (isDark ? "text-neutral-500" : "text-zinc-400")}
    >
      <span className={"text-[10px] font-semibold uppercase tracking-widest group-hover:opacity-80 transition " + color}>
        {label}
      </span>
      {count > 0 && (
        <span className={"text-[10px] font-semibold px-1.5 py-0.5 rounded-full " + color +
          (isDark ? " bg-neutral-800" : " bg-zinc-100")}>
          {count}
        </span>
      )}
      <div className={"flex-1 h-px " + (isDark ? "bg-neutral-800" : "bg-zinc-200")} />
      {collapsed[sectionKey]
        ? <ChevronRight size={11} className="opacity-60" />
        : <ChevronDown size={11} className="opacity-60" />}
    </button>
  );

  // ── Task card ────────────────────────────────────────────
  const TaskCard = ({ task, icon, iconClass = "", strikethrough = false, opacity = false, sub = null }) => (
    <div
      className={
        "rounded-xl border transition-all duration-150 " +
        (opacity ? "opacity-50 " : "") +
        (isDark
          ? "border-neutral-700/60 bg-neutral-800/40"
          : "border-zinc-200 bg-white shadow-sm")
      }
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <span className={"flex-shrink-0 mt-0.5 " + iconClass}>{icon}</span>
        <div className="flex-1 min-w-0">
          <span className={"text-[13px] leading-snug block " + (strikethrough ? "line-through" : "")}>
            {task.task}
          </span>
          {sub && (
            <span className="text-[11px] opacity-50 mt-0.5 block">{sub}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={
        "absolute inset-y-0 right-0 z-40 w-[22rem] flex flex-col " +
        "transform transition-transform duration-200 ease-out " +
        (isPlannerOpen ? "translate-x-0" : "translate-x-full") + " " +
        (isDark
          ? "bg-neutral-900/95 border-l border-neutral-800"
          : "bg-zinc-50/95 border-l border-zinc-200") +
        " backdrop-blur-sm"
      }
    >
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div>
          <div className="text-sm font-semibold">Daily Planner</div>
          <div className="text-[11px] opacity-40 mt-0.5">Your tasks for today</div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            data-tooltip="Refresh tasks"
            data-tooltip-pos="bottom"
            className={
              "p-1.5 rounded-lg transition " +
              (isDark
                ? "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700")
            }
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Close */}
          <button
            onClick={() => setIsPlannerOpen(false)}
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

      {/* ── Stats bar ── */}
      <div
        className={
          "mx-4 mb-3 px-3 py-2 rounded-xl text-[11px] flex items-center justify-between shrink-0 " +
          (isDark ? "bg-neutral-800/60" : "bg-zinc-100")
        }
      >
        <div className="flex items-center gap-3 opacity-70">
          {overdue.length > 0 && (
            <span><span className="font-semibold text-red-400">{overdue.length}</span> overdue</span>
          )}
          <span><span className="font-semibold text-amber-400">{pending.length}</span> today</span>
          <span><span className="font-semibold text-green-400">{done.length}</span> done</span>
          {upcoming.length > 0 && (
            <span><span className="font-semibold text-blue-400">{upcoming.length}</span> soon</span>
          )}
        </div>
        <Calendar size={13} className="opacity-30" />
      </div>

      {/* ── Task List ── */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto no-scrollbar space-y-4">

        {tasks.length === 0 && (
          <div className="text-sm opacity-40 text-center pt-10 leading-relaxed">
            No tasks yet.<br />
            Tell the AI what you<br />want to do today.
          </div>
        )}

        {/* Overdue */}
        {overdue.length > 0 && (
          <div>
            <SectionHeader label="Overdue" count={overdue.length} sectionKey="overdue" color="text-red-400" />
            {!collapsed.overdue && (
              <div className="space-y-2">
                {overdue.map(t => {
                  const daysAgo = Math.round((new Date(today) - new Date(t.scheduled_date)) / 86400000);
                  return (
                    <TaskCard
                      key={t.id}
                      task={t}
                      icon={<AlertTriangle size={14} />}
                      iconClass="text-red-400"
                      sub={daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Today */}
        {pending.length > 0 && (
          <div>
            <SectionHeader label="Today" count={pending.length} sectionKey="today" color="text-amber-400" />
            {!collapsed.today && (
              <div className="space-y-2">
                {pending.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    icon={<Circle size={14} />}
                    iconClass="text-amber-400"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed */}
        {done.length > 0 && (
          <div>
            <SectionHeader label="Completed" count={done.length} sectionKey="done" color="text-green-400" />
            {!collapsed.done && (
              <div className="space-y-2">
                {done.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    icon={<CheckCircle2 size={14} />}
                    iconClass="text-green-400"
                    strikethrough
                    opacity
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <SectionHeader label="Coming Up" count={upcoming.length} sectionKey="upcoming" color="text-blue-400" />
            {!collapsed.upcoming && (
              <div className="space-y-2">
                {upcoming.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    icon={<CalendarClock size={14} />}
                    iconClass="text-blue-400"
                    sub={formatDate(t.scheduled_date)}
                    opacity
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className={
          "px-4 py-3 text-[11px] opacity-40 border-t shrink-0 " +
          (isDark ? "border-neutral-800" : "border-zinc-200")
        }
      >
        Manage tasks by chatting with the AI
      </div>
    </div>
  );
}

export default PlannerSidebar;
