/**
 * ThinkingStatus.jsx
 *
 * Premium thinking / status indicator system.
 * Handles all 4 visual states:
 *   1. active     — animated pill with shimmer + breathing dots (AI is working, no content yet)
 *   2. streaming  — "streaming" cursor active, content already arriving
 *   3. completed  — persistent ✓ badge with duration under the finished message
 *   4. thinker    — collapsible reasoning panel ONLY for deep_think / Thinker skill
 *
 * Architectural rule: reasoning traces (thinkerSteps) are ONLY shown
 * when the message originated from the deep_think skill.
 * Normal chat, file reads, Deep Search → only high-level status labels.
 */

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";

// ─── Duration formatter ────────────────────────────────────────────────────────
function formatDuration(ms) {
  if (!ms || ms < 0) return null;
  const s = ms / 1000;
  return s < 10 ? s.toFixed(1) + "s" : Math.round(s) + "s";
}

// ─── Maps the last action label to a human-readable completed badge label ─────
function getCompletedLabel(action, durationStr, isThinker) {
  if (!durationStr) return null;

  if (isThinker) return `Thought for ${durationStr}`;

  // Normalize ellipsis variants so matching works regardless of … vs ...
  const a = (action || "").toLowerCase().replace(/…|\.{2,}/g, "");

  if (a.includes("analyzing image") || a.includes("analyse image"))
    return `Analyzed image in ${durationStr}`;
  if (a.includes("reading file") || a.includes("read file"))
    return `Read file in ${durationStr}`;
  if (a.includes("deep_search") || a.includes("searching web") || a.includes("deep search") || a.includes("web search"))
    return `Searched web in ${durationStr}`;
  if (a.startsWith("using:")) {
    const tool = action.replace(/^using:\s*/i, "").trim();
    return `Used ${tool} in ${durationStr}`;
  }
  if (a.includes("thinking"))
    return `Thought for ${durationStr}`;
  if (a.includes("sending"))
    return `Completed in ${durationStr}`;

  return `Completed in ${durationStr}`;
}

// ─── Dot colors per operation type ────────────────────────────────────────────
function getDotColor(action, isThinker, isDark) {
  if (isThinker) return isDark ? "text-violet-400" : "text-violet-600";
  const a = (action || "").toLowerCase();
  if (a.includes("image"))  return isDark ? "text-pink-400"   : "text-pink-600";
  if (a.includes("file"))   return isDark ? "text-amber-400"  : "text-amber-600";
  if (a.includes("search")) return isDark ? "text-blue-400"   : "text-blue-600";
  if (a.startsWith("using")) return isDark ? "text-emerald-400" : "text-emerald-600";
  return isDark ? "text-neutral-400" : "text-neutral-500";
}

// ─── Thinker step icon ────────────────────────────────────────────────────────
function stepIcon(step) {
  const s = (step || "").toLowerCase();
  if (s.includes("plan"))      return "◆";
  if (s.includes("replan"))    return "↺";
  if (s.includes("finaliz"))   return "✦";
  if (s.includes("execut"))    return "→";
  if (s.includes("observ"))    return "◎";
  return "·";
}

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════

export default function ThinkingStatus({ msg, isDark }) {
  const meta = msg?.meta || {};
  const isPending   = meta.isPending;
  const hasContent  = !!(msg?.content);
  const isThinker = meta.skill === "deep_think" || meta.isThinker || (meta.thinkerSteps?.length > 0);
  const action      = meta.pendingAction || "";
  const thinkerSteps = meta.thinkerSteps || [];

  // Completed state (message is done)
  const completedAction = meta.completedAction;
  const durationMs      = meta.durationMs;
  const durationStr     = formatDuration(durationMs);

  const [thinkerOpen, setThinkerOpen] = useState(true);   // auto-expands during run
  const stepsEndRef = useRef(null);

  // Auto-scroll to latest thinker step
  useEffect(() => {
    if (isThinker && isPending && thinkerSteps.length > 0) {
      stepsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [thinkerSteps.length]);

  // Auto-collapse when thinker finishes
  useEffect(() => {
    if (!isPending && isThinker && durationMs) {
      const t = setTimeout(() => setThinkerOpen(false), 800);
      return () => clearTimeout(t);
    }
  }, [isPending, isThinker, durationMs]);

  // ── 1. STREAMING — content is arriving, no status pill ──────────────────────
  if (isPending && hasContent) return null; // streaming cursor already in MessageBubble

  // ── 2. ACTIVE (pending, no content yet) ────────────────────────────────────
  if (isPending && !hasContent) {
    const dotColor = getDotColor(action, isThinker, isDark);

    return (
      <div className="flex flex-col gap-2 mt-1">

        {/* ── Active status — bare, no bubble ── */}
        <div className="inline-flex items-center gap-2.5 self-start">
          {/* Breathing dots */}
          <span className={"flex items-center gap-[3px] " + dotColor}>
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </span>

          {/* Label */}
          <span className={
            "text-[14.5px] font-medium tracking-tight " +
            (isThinker
              ? (isDark ? "text-violet-300" : "text-violet-600")
              : (isDark ? "text-neutral-400" : "text-neutral-500"))
          }>
            {action || "Thinking…"}
          </span>
        </div>

        {/* ── Thinker reasoning panel (ONLY for deep_think) ── */}
        {isThinker && thinkerSteps.length > 0 && (
          <ThinkerPanel
            steps={thinkerSteps}
            isActive={true}
            isOpen={thinkerOpen}
            onToggle={() => setThinkerOpen(v => !v)}
            isDark={isDark}
            stepsEndRef={stepsEndRef}
          />
        )}
      </div>
    );
  }

  // ── 3. COMPLETED — show persistent badge + optional thinker panel ───────────
  const completedLabel = getCompletedLabel(completedAction, durationStr, isThinker);
  if (!completedLabel && !isThinker) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-2">

      {/* Completed badge */}
      {completedLabel && (
        <button
          onClick={isThinker && thinkerSteps.length > 0 ? () => setThinkerOpen(v => !v) : undefined}
          className={
            "status-badge-enter inline-flex items-center gap-1.5 self-start " +
            "px-3 py-1 rounded-full text-[12px] font-medium border " +
            "transition-all duration-200 " +
            (isThinker
              ? (isDark
                  ? "bg-violet-500/10 border-violet-500/25 text-violet-300 hover:bg-violet-500/20"
                  : "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100")
              : (isDark
                  ? "bg-neutral-800/60 border-neutral-700/50 text-neutral-500 cursor-default"
                  : "bg-zinc-100/80 border-zinc-200 text-zinc-400 cursor-default")
            ) +
            (isThinker && thinkerSteps.length > 0 ? " cursor-pointer" : "")
          }
        >
          {isThinker
            ? <Brain size={10} className="opacity-80 flex-shrink-0" />
            : <span className="opacity-70 text-[9px]">✓</span>
          }
          <span>{completedLabel}</span>
          {isThinker && thinkerSteps.length > 0 && (
            thinkerOpen
              ? <ChevronUp size={10} className="opacity-60 ml-0.5" />
              : <ChevronDown size={10} className="opacity-60 ml-0.5" />
          )}
        </button>
      )}

      {/* Thinker history panel */}
      {isThinker && thinkerSteps.length > 0 && (
        <ThinkerPanel
          steps={thinkerSteps}
          isActive={false}
          isOpen={thinkerOpen}
          onToggle={() => setThinkerOpen(v => !v)}
          isDark={isDark}
          stepsEndRef={stepsEndRef}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ThinkerPanel — collapsible reasoning trace
// ══════════════════════════════════════════════════════════════════════════════

function ThinkerPanel({ steps, isActive, isOpen, onToggle, isDark, stepsEndRef }) {
  if (!isOpen) return null;

  return (
    <div
      className={
        "rounded-xl border overflow-hidden transition-all duration-300 " +
        (isDark
          ? "bg-neutral-900/60 border-neutral-700/50"
          : "bg-zinc-50/80 border-zinc-200/80") +
        " max-w-md"
      }
    >
      {/* Panel header */}
      <button
        onClick={onToggle}
        className={
          "w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold " +
          "tracking-wider uppercase opacity-60 transition-opacity hover:opacity-90 " +
          (isDark ? "text-violet-300" : "text-violet-700")
        }
      >
        <span className="flex items-center gap-1.5">
          <Brain size={10} />
          Reasoning
        </span>
        {isActive && (
          <span className={
            "flex items-center gap-[3px] text-violet-400 " +
            (isDark ? "text-violet-400" : "text-violet-600")
          }>
            <span className="thinking-dot w-[4px] h-[4px]" />
            <span className="thinking-dot w-[4px] h-[4px]" />
            <span className="thinking-dot w-[4px] h-[4px]" />
          </span>
        )}
      </button>

      {/* Step list */}
      <div className="px-4 pb-4 flex flex-col gap-1.5 max-h-72 overflow-y-auto no-scrollbar">
        {steps.map((step, i) => (
          <div
            key={i}
            className={
              "thinker-step-enter flex items-baseline gap-2.5 text-[13.5px] leading-relaxed " +
              (isDark ? "text-neutral-400" : "text-zinc-500")
            }
          >
            <span className={
              "flex-shrink-0 text-[12px] font-mono " +
              (isDark ? "text-violet-400/70" : "text-violet-500/70")
            }>
              {stepIcon(step)}
            </span>
            <span>{step}</span>
          </div>
        ))}
        <div ref={stepsEndRef} />
      </div>
    </div>
  );
}
