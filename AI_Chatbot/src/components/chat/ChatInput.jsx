import { useState, useEffect, useRef } from "react";
import { Paperclip, Mic, Square, ArrowUp, RotateCcw, AudioLines } from "lucide-react";
import { SkillPicker, ActiveSkillChip, SKILLS, SKILL_ICONS } from "./Skills";
import RoutinesModal from "./RoutinesModal";

function ChatInput({
  isDark,
  input,
  files,
  setFiles,
  isTyping,
  hasInput,
  textareaRef,
  fileInputRef,
  handleInputChange,
  handleKeyDown,
  handleSend,
  handleFileClick,
  handleFileChange,
  handleDragOver,
  handleDrop,
  fileError,
  setFileError,
  isDictating,
  onToggleDictation,
  editResendTarget,
  isVoiceMode,
  voiceState,
  voiceError,
  setVoiceError,
  toggleVoiceMode,
  startRecording,
  handleVoiceSend,
  stopSpeaking,
  activeTool,
  setActiveTool,
  handleStop,
  partialTranscript,
  startListening,
  stopListening,
}) {


  // ---------------- EMAIL STORAGE ----------------
  const [emails, setEmails] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredEmails, setFilteredEmails] = useState([]);
  const dropdownRef = useRef(null);

  // ---------------- SLASH COMMANDS ----------------
  const [showSlashDropdown, setShowSlashDropdown] = useState(false);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const slashDropdownRef = useRef(null);
  const [isRoutinesOpen, setIsRoutinesOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleRoutineExecute = (name) => {
    handleSend({
      input: name,
      toolHint: "[FORCE_TOOL:execute_routine]",
      routineName: name,
      setInput: () => { },
      setFiles: () => { },
      textareaRef
    });
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("savedEmails") || "[]");
    setEmails(saved);
  }, []);

  // ---------------- DETECT @ ----------------
  useEffect(() => {
    const cursor = textareaRef.current?.selectionStart || 0;
    const text = input.slice(0, cursor);

    const match = text.match(/@([\w.]*)$/);

    setTimeout(() => {
      if (match) {
        const query = match[1].toLowerCase();
        const filtered = emails.filter(e =>
          e.email.toLowerCase().includes(query)
        );
        setFilteredEmails(filtered);
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    }, 0);
  }, [input, emails]);

  // ---------------- CLICK OUTSIDE TO CLOSE DROPDOWN ----------------
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  // ---------------- DETECT / ----------------
  useEffect(() => {
    const cursor = textareaRef.current?.selectionStart || 0;
    const text = input.slice(0, cursor);

    const match = text.match(/(^|\s)\/([\w]*)$/);

    setTimeout(() => {
      if (match) {
        const query = match[2].toLowerCase();
        const filtered = SKILLS.filter(s =>
          s.name.toLowerCase().includes(query) || s.backendKey.toLowerCase().includes(query)
        );
        setFilteredSkills(filtered);
        setShowSlashDropdown(true);
      } else {
        setShowSlashDropdown(false);
      }
    }, 0);
  }, [input]);

  useEffect(() => {
    if (!showSlashDropdown) return;
    const handleClickOutside = (e) => {
      if (slashDropdownRef.current && !slashDropdownRef.current.contains(e.target)) {
        setShowSlashDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSlashDropdown]);

  // ---------------- AUTO-FOCUS ON TYPING ----------------
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't intercept if already in an input/textarea or if modifiers are pressed
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA" ||
        e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1
      ) {
        return;
      }
      if (textareaRef.current) {
        e.preventDefault();
        textareaRef.current.focus();
        // Append the character directly so the first keystroke isn't lost
        handleInputChange({ target: { value: input + e.key } });
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [textareaRef]);

  // ---------------- INSERT EMAIL ----------------
  const insertEmail = (email) => {
    // If not focused, fallback to end of string to avoid deleting when cursor=0
    let cursor = textareaRef.current?.selectionStart ?? input.length;
    if (cursor === 0 && input.includes("@")) {
      cursor = input.length;
    }

    const before = input.slice(0, cursor);
    const after = input.slice(cursor);

    // Only replace the last @ match
    const newBefore = before.replace(/@[\w.]*$/, email + " ");

    // Fallback if no match was found (e.g. they clicked after losing focus and regex failed)
    const newValue = (newBefore === before && !before.match(/@[\w.]*$/))
      ? before + email + " " + after
      : newBefore + after;

    setShowDropdown(false);

    handleInputChange({ target: { value: newValue } });

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  // ---------------- INSERT SKILL ----------------
  const insertSkill = (skill) => {
    let cursor = textareaRef.current?.selectionStart ?? input.length;
    if (cursor === 0 && input.includes("/")) {
      cursor = input.length;
    }

    const before = input.slice(0, cursor);
    const after = input.slice(cursor);

    const newBefore = before.replace(/(^|\s)\/[\w]*$/, "$1");

    // Fallback if regex failed
    const newValue = (newBefore === before && !before.match(/(^|\s)\/[\w]*$/))
      ? before + after
      : newBefore + after;

    setShowSlashDropdown(false);
    handleInputChange({ target: { value: newValue } });
    setActiveTool(skill);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  // ------------------ DELETE SAVED EMAILS ---------
  const deleteEmail = (email) => {
    try {
      const existing = JSON.parse(localStorage.getItem("savedEmails") || "[]");

      const updated = existing.filter(
        e => e.email !== email
      );

      localStorage.setItem("savedEmails", JSON.stringify(updated));
      setEmails(updated);
    } catch { }
  };


  const handleLocalKeyDown = (e) => {
    if (e.key === "Tab" && showDropdown && filteredEmails.length > 0) {
      e.preventDefault();
      insertEmail(filteredEmails[0].email);
      return;
    }
    if (e.key === "Tab" && showSlashDropdown && filteredSkills.length > 0) {
      e.preventDefault();
      insertSkill(filteredSkills[0]);
      return;
    }
    handleKeyDown(e);
  };

  return (
    <div 
      className={"px-4 py-3 " + (isDark ? "bg-neutral-900" : "bg-zinc-100")}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >

      {(activeTool || files.length > 0 || fileError) && (
        <div className="mb-2 flex flex-col gap-2">
          {/* File Error Message */}
          {fileError && (
            <div className="text-red-500 text-xs font-medium flex items-center justify-between bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
              <span>⚠️ {fileError}</span>
              <button onClick={() => setFileError(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {/* Active skill chip — from Skills.jsx */}
            <ActiveSkillChip
              isDark={isDark}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
            />

            {/* File chips */}
            {files.map((file, idx) => (
              <span
                key={idx}
                className={
                  "text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 " +
                  (isDark
                    ? "border-neutral-600 bg-neutral-800/60"
                    : "border-[#d1d5db] bg-[#e5e7eb] text-[#111827]")
                }
              >
                <Paperclip size={14} /> 
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="ml-0.5 opacity-60 hover:opacity-100 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className={
          "relative flex items-center gap-2 rounded-full px-3 py-1 border " +
          (isDark
            ? "bg-neutral-800 border-neutral-700"
            : "bg-white border-zinc-300")
        }
      >
        {/* Skill Picker — from Skills.jsx */}
        <SkillPicker
          isDark={isDark}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          handleFileClick={handleFileClick}
          onRoutinesClick={() => setIsRoutinesOpen(true)}
          disableUpload={files.length >= 3}
        />

        <RoutinesModal
          isDark={isDark}
          isOpen={isRoutinesOpen}
          onClose={() => setIsRoutinesOpen(false)}
          onExecute={handleRoutineExecute}
        />

        {/* Hidden file input */}
        <input
          type="file"
          accept=".txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.webp"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* TEXTAREA or VOICE BUTTON */}
        {voiceError && (
          <div className="mb-2 px-3 py-1.5 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-between">
            <span>⚠️ {voiceError}</span>
            <button onClick={() => setVoiceError(null)} className="ml-2 text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Always show textarea — voice chat is now a separate fullscreen modal */}
        {(
          <textarea
            ref={textareaRef}
            className={
              "flex-1 bg-transparent outline-none text-sm resize-none h-10 py-2 overflow-hidden " +
              (isDark ? "text-neutral-100" : "text-neutral-900")
            }
            placeholder={
              isTyping
                ? "AI is responding..."
                : isDictating
                  ? "Listening..."
                  : editResendTarget
                    ? "Editing previous message…"
                    : "Ask anything, use / for skills ..."
            }
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleLocalKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isDictating || isTyping}
          />
        )}

        {/* DROPDOWN */}
        {showDropdown && filteredEmails.length > 0 && (
          <div
            ref={dropdownRef}
            className={
              "absolute bottom-full mb-2 left-10 w-56 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50 border " +
              (isDark ? "bg-neutral-800 border-neutral-700 text-neutral-200" : "bg-white border-zinc-200 text-neutral-800")
            }
          >
            {filteredEmails.map((e, i) => (
              <div
                key={i}
                className={
                  "flex items-center justify-between px-3 py-2 text-xs " +
                  (isDark ? "hover:bg-neutral-700" : "hover:bg-zinc-100")
                }
              >

                <span
                  onClick={() => insertEmail(e.email)}
                  className="cursor-pointer flex-1"
                >
                  {e.email}
                </span>

                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    deleteEmail(e.email);
                  }}
                  className="text-red-500 px-2"
                >
                  −
                </button>

              </div>
            ))}
          </div>
        )}

        {/* SLASH DROPDOWN */}
        {showSlashDropdown && filteredSkills.length > 0 && (
          <div
            ref={slashDropdownRef}
            className={
              "absolute bottom-full mb-2 left-10 w-56 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50 border " +
              (isDark ? "bg-neutral-800 border-neutral-700 text-neutral-200" : "bg-white border-zinc-200 text-neutral-800")
            }
          >
            <div className={"px-3 py-2 text-[10px] font-semibold uppercase tracking-wider opacity-50 border-b " + (isDark ? "border-neutral-700" : "border-zinc-200")}>
              Skills
            </div>
            {filteredSkills.map((skill, i) => {
              const IconComp = SKILL_ICONS[skill.backendKey] || SKILL_ICONS.deep_search;
              return (
                <div
                  key={i}
                  onClick={() => insertSkill(skill)}
                  className={
                    "flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition " +
                    (isDark ? "hover:bg-neutral-700" : "hover:bg-zinc-100")
                  }
                >
                  <span className={"flex items-center justify-center w-6 h-6 rounded-md " + (isDark ? "bg-neutral-700 text-neutral-300" : "bg-zinc-100 text-zinc-600")}>
                    <IconComp size={12} />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium">{skill.name}</span>
                    <span className={"text-[10px] truncate max-w-[150px] " + (isDark ? "text-neutral-400" : "text-zinc-500")}>
                      {skill.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MIC */}
        <button
          type="button"
          onClick={onToggleDictation}
          disabled={isVoiceMode}
          className={
            "h-8 w-8 flex items-center justify-center rounded-full " +
            (isDictating ? "bg-red-500 text-white" : "hover:bg-black/10") +
            (isVoiceMode ? " opacity-30 cursor-not-allowed" : "")
          }
        >
          <Mic size={16} />
        </button>

        {/* VOICE CHAT TOGGLE */}
        <button
          type="button"
          onClick={toggleVoiceMode}
          data-tooltip="Voice Chat Mode"
          disabled={isDictating}
          className={
            "h-8 w-8 flex items-center justify-center rounded-full " +
            (isVoiceMode ? "bg-purple-600 text-white" : "hover:bg-black/10") +
            (isDictating ? " opacity-30 cursor-not-allowed" : "")
          }
        >
          <AudioLines size={16} />
        </button>

        {/* SEND / STOP */}
        {isTyping ? (
          <button
            onClick={handleStop}
            data-tooltip="Stop response"
            className="h-8 w-8 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-all hover:scale-110 shadow-lg shadow-red-500/30"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            disabled={!hasInput || isDictating}
            onClick={handleSend}
            data-tooltip={editResendTarget ? "Resend" : "Send"}
            className={
              "h-8 w-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30 " +
              (isDark
                ? (isFocused || hasInput)
                  ? "bg-neutral-200 text-neutral-900 hover:bg-white"
                  : "bg-neutral-700 hover:bg-neutral-600 text-neutral-100 disabled:cursor-not-allowed"
                : (isFocused || hasInput)
                  ? "bg-zinc-800 text-white hover:bg-black"
                  : "bg-zinc-800 hover:bg-zinc-700 text-white disabled:cursor-not-allowed")
            }
          >
            {editResendTarget
              ? <RotateCcw size={14} />
              : <ArrowUp size={14} strokeWidth={2.5} />}
          </button>
        )}

      </div>
    </div >
  );
}

export default ChatInput;