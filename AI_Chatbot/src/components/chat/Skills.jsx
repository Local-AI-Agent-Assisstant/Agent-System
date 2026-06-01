// ============================================================
//  Skills.jsx — Everything for the + button in the chat input
// ============================================================
//
//  This file is INDEPENDENT from tools.js (the sidebar).
//  Changes here ONLY affect the + button popup.
//
//  HOW TO ADD A SKILL:
//    1. Add an object to SKILLS[] below
//    2. Add its icon to SKILL_ICONS{}
//    3. backendKey must match Python's TOOL_REGISTRY key
//
//  HOW TO REMOVE A SKILL:
//    Delete its object from SKILLS[].
//    Optionally remove its icon from SKILL_ICONS{}.
//
// ============================================================

import { useState, useRef, useEffect } from "react";
import { Globe, Paperclip, X, Plus, Zap, Brain} from "lucide-react";

// ─────────────────────────────────────────────────────────────
//  1. SKILLS LIST  (only name, backendKey, description needed)
//     Edit this array to add / remove from the + popup.
// ─────────────────────────────────────────────────────────────
export const SKILLS = [
  {
    name: "Deep Search",
    backendKey: "deep_search",
    description: "Search the web for up-to-date info and cited sources.",
  },
  {
    name: "Thinker",
    backendKey: "deep_think",
    description: "Autonomous agent — plans, executes, and re-plans automatically.",
  },
];

// ─────────────────────────────────────────────────────────────
//  2. SKILL ICONS
//     Maps backendKey → Lucide icon component.
//     Browse icons at: https://lucide.dev
// ─────────────────────────────────────────────────────────────
export const SKILL_ICONS = {
  deep_search: Globe,
  deep_think: Brain,
};

// ─────────────────────────────────────────────────────────────
//  3. SKILL PICKER POPUP
//     Opens when the user clicks + in the chat input bar.
// ─────────────────────────────────────────────────────────────
export function SkillPicker({ isDark, activeTool, setActiveTool, handleFileClick, onRoutinesClick }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const label = (text, extraClass = "pt-3") => (
    <div className={
      "px-3 pb-1 " + extraClass +
      " text-[11px] font-semibold uppercase tracking-wider opacity-50 " +
      (isDark ? "text-neutral-300" : "text-zinc-500")
    }>
      {text}
    </div>
  );

  const iconBox = (IconComp, active) => (
    <span className={
      "flex items-center justify-center w-7 h-7 rounded-lg " +
      (active
        ? "bg-purple-500 text-white"
        : (isDark ? "bg-neutral-700 text-neutral-300" : "bg-zinc-100 text-zinc-600"))
    }>
      <IconComp size={14} />
    </span>
  );

  const row = "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ";

  return (
    <div className="relative" ref={pickerRef}>

      {/* + Button */}
      <button
        onClick={() => setOpen(v => !v)}
        data-tooltip="Add files and more"
        className={
          "h-8 w-8 flex items-center justify-center rounded-full transition-colors " +
          (open
            ? (isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600")
            : "hover:bg-black/10")
        }
      >
        <Plus size={16} />
      </button>

      {/* Popup */}
      {open && (
        <div className={
          "absolute bottom-full mb-2 left-0 z-50 w-64 rounded-2xl border shadow-2xl overflow-hidden " +
          (isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-zinc-200")
        }>

          {/* Actions */}
          {label("Actions")}
          <button
            onClick={() => { handleFileClick(); setOpen(false); }}
            className={row + (isDark ? "hover:bg-neutral-700 text-neutral-200" : "hover:bg-zinc-100 text-zinc-800")}
          >
            {iconBox(Paperclip, false)}
            <div className="flex flex-col items-start">
              <span className="font-medium text-[13px]">Attach File</span>
              <span className="text-[11px] opacity-50">Upload a file to the AI</span>
            </div>
          </button>

          <button
            onClick={() => { onRoutinesClick(); setOpen(false); }}
            className={row + (isDark ? "hover:bg-neutral-700 text-neutral-200" : "hover:bg-zinc-100 text-zinc-800")}
          >
            {iconBox(Zap, false)}
            <div className="flex flex-col items-start">
              <span className="font-medium text-[13px]">My Routines</span>
              <span className="text-[11px] opacity-50">Run saved task chains</span>
            </div>
          </button>

          {/* Divider */}
          <div className={"mx-3 my-1 border-t " + (isDark ? "border-neutral-700" : "border-zinc-200")} />

          {/* Skills */}
          {label("Skills", "")}
          <div className="pb-2">
            {SKILLS.map((skill) => {
              const IconComp = SKILL_ICONS[skill.backendKey] || Globe;
              const isActive = activeTool?.backendKey === skill.backendKey;
              return (
                <button
                  key={skill.backendKey + skill.name}
                  onClick={() => { setActiveTool(isActive ? null : skill); setOpen(false); }}
                  className={
                    row +
                    (isActive
                      ? (isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-50 text-purple-700")
                      : (isDark ? "hover:bg-neutral-700 text-neutral-200" : "hover:bg-zinc-100 text-zinc-800"))
                  }
                >
                  {iconBox(IconComp, isActive)}
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-[13px]">{skill.name}</span>
                    <span className="text-[11px] opacity-50 leading-tight">{skill.description}</span>
                  </div>
                  {isActive && <span className="ml-auto text-purple-400 text-xs">✓</span>}
                </button>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  4. ACTIVE SKILL CHIP
//     Purple pill shown above the input when a skill is active.
// ─────────────────────────────────────────────────────────────
export function ActiveSkillChip({ isDark, activeTool, setActiveTool }) {
  if (!activeTool) return null;
  const IconComp = SKILL_ICONS[activeTool.backendKey] || Globe;

  return (
    <span className={
      "text-[11px] px-2 py-1 rounded-full border flex items-center gap-1.5 font-medium " +
      (isDark
        ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
        : "border-purple-400/50 bg-purple-50 text-purple-700")
    }>
      <IconComp size={12} />
      {activeTool.name}
      <button onClick={() => setActiveTool(null)} className="ml-0.5 opacity-60 hover:opacity-100">
        <X size={11} />
      </button>
    </span>
  );
}
