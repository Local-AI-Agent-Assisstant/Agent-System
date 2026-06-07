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

// ─── Thinker step icon ──────────────────────────────────────────────────────────────────────
function stepIcon(step) {
  const s = (step || "").toLowerCase();
  if (s.includes("plan"))      return "◆";
  if (s.includes("replan"))    return "↺";
  if (s.includes("finaliz"))   return "✦";
  if (s.includes("execut"))    return "→";
  if (s.includes("observ"))    return "◎";
  if (s.startsWith("using "))  return "▶";
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

  // ── 1. Determine Visibility ────────────────────────────────────────────────
  // The panel should only appear for tools, thinker, multi-step, etc.
  // Normal conversational replies without tools should not show a reasoning panel.
  const hasReasoningSteps = thinkerSteps.length > 0;
  
  // Hide completely if it's just a normal reply actively streaming
  if (isPending && hasContent && !isThinker && !hasReasoningSteps) return null;

  // ── 2. Determine State & Labels ────────────────────────────────────────────
  let badgeLabel = null;
  let isCompletedState = false;

  if (isPending) {
    // Active / Streaming state
    badgeLabel = action || "Thinking…";
  } else {
    // Completed state
    badgeLabel = getCompletedLabel(completedAction, durationStr, isThinker);
    isCompletedState = true;
    if (!badgeLabel && !isThinker) return null;
  }

  // ── 3. Render ─────────────────────────────────────────────────────────────
  const showPanel = isThinker && hasReasoningSteps;
  if (!badgeLabel && !showPanel && !isPending) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-2 mb-1">
      {/* ── Compact Status Badge (Clickable if there's reasoning) ── */}
      {badgeLabel && (
        <button
          onClick={showPanel ? () => setThinkerOpen(v => !v) : undefined}
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
            (showPanel ? " cursor-pointer" : "")
          }
        >
          {isCompletedState ? (
            isThinker 
              ? <Brain size={10} className="opacity-80 flex-shrink-0" /> 
              : <span className="opacity-70 text-[9px]">✓</span>
          ) : (
            <span className={"flex items-center gap-[3px] " + getDotColor(action, isThinker, isDark)}>
              <span className="thinking-dot w-[3.5px] h-[3.5px]" />
              <span className="thinking-dot w-[3.5px] h-[3.5px]" />
              <span className="thinking-dot w-[3.5px] h-[3.5px]" />
            </span>
          )}
          
          <span>{badgeLabel}</span>
          
          {showPanel && (
            thinkerOpen
              ? <ChevronUp size={10} className="opacity-60 ml-0.5" />
              : <ChevronDown size={10} className="opacity-60 ml-0.5" />
          )}
        </button>
      )}

      {/* ── Reasoning Panel ── */}
      {showPanel && (
        <ThinkerPanel
          steps={thinkerSteps}
          isActive={isPending}
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
        {steps.map((step, i) => {
          // Parse "Using tool_name(args)" steps for richer rendering
          const usingMatch = step.match(/^Using\s+([^(]+)(\(.*\))?$/);
          return (
            <div
              key={i}
              className={
                "thinker-step-enter flex items-baseline gap-2.5 text-[13px] leading-relaxed " +
                (isDark ? "text-neutral-400" : "text-zinc-500")
              }
            >
              <span className={
                "flex-shrink-0 text-[12px] font-mono " +
                (isDark ? "text-violet-400/70" : "text-violet-500/70")
              }>
                {stepIcon(step)}
              </span>
              {usingMatch ? (
                <span className="flex flex-wrap items-baseline gap-0.5">
                  <span className={isDark ? "text-neutral-300" : "text-zinc-400"}>Using</span>
                  {" "}
                  <span className={"font-semibold font-mono text-[12.5px] " + (isDark ? "text-emerald-400" : "text-emerald-600")}>
                    {usingMatch[1].trim()}
                  </span>
                  {usingMatch[2] && (
                    <span className={
                      "font-mono text-[11px] px-1.5 py-0.5 rounded " +
                      (isDark ? "bg-neutral-800 text-neutral-400" : "bg-zinc-100 text-zinc-500")
                    }>
                      {usingMatch[2]}
                    </span>
                  )}
                </span>
              ) : (
                <span>{step}</span>
              )}
            </div>
          );
        })}
        <div ref={stepsEndRef} />
      </div>
    </div>
  );
}
