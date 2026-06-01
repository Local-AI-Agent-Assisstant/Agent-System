import { useState, useEffect, useRef } from "react";
import { Paperclip, Mic, Square, ArrowUp, RotateCcw, AudioLines } from "lucide-react";
import { SkillPicker, ActiveSkillChip } from "./Skills";
import RoutinesModal from "./RoutinesModal";

function ChatInput({
  isDark,
  input,
  files,
  isTyping,
  hasInput,
  textareaRef,
  fileInputRef,
  handleInputChange,
  handleKeyDown,
  handleSend,
  handleFileClick,
  handleFileChange,
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
    handleKeyDown(e);
  };

  return (
    <div className={"px-4 py-3 " + (isDark ? "bg-neutral-900" : "bg-zinc-100")}>

      {(activeTool || files.length > 0) && (
        <div className="mb-2 flex flex-wrap gap-2">

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
                "text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 " +
                (isDark
                  ? "border-neutral-600 bg-neutral-800/60"
                  : "border-[#d1d5db] bg-[#e5e7eb] text-[#111827]")
              }
            >
              <Paperclip size={14} /> {file.name}
            </span>
          ))}
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
                    : "Type your message..."
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