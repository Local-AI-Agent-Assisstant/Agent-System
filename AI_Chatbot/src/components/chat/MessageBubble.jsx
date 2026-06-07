import { useState, useEffect, useRef, memo } from "react";
import { Copy, Check, Pencil, FileDown, RotateCw } from "lucide-react";
import { formatTime, isSameDay, formatDateLabel } from "../../utils/ChatHelpers";
import { MarkdownMessage } from "./MarkdownMessages";
import { SKILLS, SKILL_ICONS } from "./Skills";
import ThinkingStatus from "./ThinkingStatus";

function extractReasoning(content) {
  if (!content) return { reasoning: null, text: "" };
  const thinkStart = content.indexOf("<think>");
  if (thinkStart === -1) return { reasoning: null, text: content };
  const thinkEnd = content.indexOf("</think>", thinkStart);
  let reasoning = "";
  let text = "";
  if (thinkEnd !== -1) {
    reasoning = content.substring(thinkStart + 7, thinkEnd).trim();
    text = content.substring(0, thinkStart) + content.substring(thinkEnd + 8);
  } else {
    reasoning = content.substring(thinkStart + 7).trim();
    text = content.substring(0, thinkStart);
  }
  return { reasoning, text };
}

function ReasoningBlock({ reasoning, isThinking, isDark }) {
  const [isOpen, setIsOpen] = useState(true);
  useEffect(() => {
    if (!isThinking && reasoning) {
      const timer = setTimeout(() => setIsOpen(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isThinking, reasoning]);

  if (!reasoning) return null;

  return (
    <div className={"rounded-xl border overflow-hidden transition-all duration-300 max-w-md my-2 " + (isDark ? "bg-neutral-900/60 border-neutral-700/50" : "bg-zinc-50/80 border-zinc-200/80")}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={"w-full flex items-center justify-between px-4 py-2 text-[12px] font-semibold tracking-wide uppercase opacity-70 hover:opacity-100 " + (isDark ? "text-violet-300" : "text-violet-700")}
      >
        <span className="flex items-center gap-1.5">
           💭 Reasoning
        </span>
        {isThinking && (
           <span className="flex items-center gap-[3px] text-violet-400">
             <span className="thinking-dot w-[4px] h-[4px]" />
             <span className="thinking-dot w-[4px] h-[4px]" />
             <span className="thinking-dot w-[4px] h-[4px]" />
           </span>
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 max-h-72 overflow-y-auto no-scrollbar">
          <div className={"text-[13px] leading-relaxed whitespace-pre-wrap " + (isDark ? "text-neutral-400" : "text-zinc-500")}>
            {reasoning}
          </div>
        </div>
      )}
    </div>
  );
}

function InlineEmailEditor({ draft, isDark, onSend, onCancel }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      setTo(draft?.to || "");
      setSubject(draft?.subject || "");
      setBody(draft?.body || "");
    }, 0);

    // Auto scroll down when email editor appears
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  }, [draft]);

  const handleSendClick = async () => {
    setIsSending(true);
    await onSend({ to, subject, body, attachment: draft?.attachment || null });
  };

  const inputClasses =
    "w-full mb-2 p-2 rounded text-sm outline-none transition-colors " +
    (isDark
      ? "bg-neutral-900 border border-neutral-700 focus:border-neutral-500 text-neutral-100 placeholder-neutral-500"
      : "bg-white border border-neutral-300 focus:border-neutral-400 text-neutral-900 placeholder-neutral-400");

  return (
    <div
      ref={containerRef}
      className={
        "mt-4 p-4 rounded-xl border w-full min-w-[300px] max-w-full " +
        (isDark ? "bg-neutral-800/80 border-neutral-700" : "bg-zinc-50 border-zinc-200 shadow-sm")
      }
    >
      <div className="flex items-center justify-between mb-3">
        <span className="opacity-80 text-xs font-semibold tracking-wider">EMAIL DRAFT</span>
        {(draft?.attachments?.length > 0 || draft?.attachment) && (
          <div className="flex flex-wrap gap-1">
            {(draft.attachments?.length > 0
              ? draft.attachments
              : [draft.attachment.split(/[/\\]/).pop()]
            ).map((name, i) => (
              <span key={i} className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 flex rounded-full border border-blue-500/30">
                📎 {name}
              </span>
            ))}
          </div>
        )}

      </div>

      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" disabled={isSending} className={inputClasses} />
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" disabled={isSending} className={inputClasses} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Email body..." disabled={isSending} className={inputClasses + " resize-y"} />

      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onCancel}
          disabled={isSending}
          className={
            "px-4 py-1.5 rounded-lg text-sm font-medium transition " +
            (isDark ? "text-neutral-300 hover:bg-neutral-700 disabled:opacity-50" : "text-zinc-600 hover:bg-zinc-200 disabled:opacity-50")
          }
        >
          Cancel
        </button>
        <button
          onClick={handleSendClick}
          disabled={isSending}
          className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-wait flex gap-2 items-center"
        >
          {isSending ? "Sending..." : "Send Email"}
        </button>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  prevMsg,
  isDark,
  handleCopyMessage,
  copiedMessageId,
  startEditResend,
  handleSendEmail,
  handleCancelEmail,
  onRetry,
  onResend,
}) {
  const showDateSeparator =
    !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);

  return (
    <div className="w-full">

      {/* DATE SEPARATOR */}
      {showDateSeparator && msg.createdAt && (
        <div className="flex justify-center my-2">
          <span
            className={
              "px-3 py-1 rounded-full text-[11px] " +
              (isDark
                ? "bg-neutral-800 text-neutral-200"
                : "bg-[#e5e7eb] text-[#374151]")
            }
          >
            {formatDateLabel(msg.createdAt)}
          </span>
        </div>
      )}

      {/* ================= USER ================= */}
      {msg.role === "user" && (
        <div className="flex justify-end">
          <div className="flex flex-col items-end group">

            {msg.attachments?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 mt-1">
                {msg.attachments.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.url || "#"}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium transition hover:opacity-80 " +
                      (isDark
                        ? "bg-blue-500/20 text-blue-200 border border-blue-500/30"
                        : "bg-blue-500/10 text-blue-700 border border-blue-500/20")
                    }
                    style={{ textDecoration: "none" }}
                  >
                    <span>📎</span>
                    {file.name}
                  </a>
                ))}
              </div>
            )}

            {/* Skill badge — shown above bubble if message was sent with a skill */}
            {msg.meta?.skill && (() => {
              const skillInfo = SKILLS.find(s => s.backendKey === msg.meta.skill);
              const IconComp = SKILL_ICONS[msg.meta.skill];
              const label = skillInfo?.name || msg.meta.skill;
              return (
                <div className="flex justify-end mb-1">
                  <span className={
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border " +
                    (isDark
                      ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                      : "bg-purple-50 border-purple-300 text-purple-700")
                  }>
                    {IconComp && <IconComp size={9} />}
                    {label}
                  </span>
                </div>
              );
            })()}

            {/* USER BUBBLE */}
            <div
              className={
                "inline-block min-w-[180px] max-w-[70%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words " +
                (isDark
                  ? "bg-neutral-800/80 text-neutral-100 backdrop-blur"
                  : "bg-zinc-200 text-zinc-900")
              }
            >
              <span className="block text-[11px] opacity-70 mb-1">
                You
              </span>

              {msg.meta?.isRoutine ? (
                // ── ROUTINE CARD ──
                <div className={
                  "flex items-center gap-3 px-3 py-2 rounded-lg border " +
                  (isDark
                    ? "bg-purple-500/10 border-purple-500/25"
                    : "bg-purple-50 border-purple-200")
                }>
                  <span className="text-xl">⚡</span>
                  <div>
                    <div className={"font-semibold text-sm " + (isDark ? "text-purple-300" : "text-purple-800")}>
                      {msg.meta.routineName}
                    </div>
                    <div className={"text-[10px] opacity-60 mt-0.5 " + (isDark ? "text-purple-400" : "text-purple-700")}>
                      Execute saved flow
                    </div>
                  </div>
                </div>
              ) : (
                // ── NORMAL TEXT ──
                msg.content && <MarkdownMessage content={msg.content} isDark={isDark} />
              )}
              <div className="text-[10px] opacity-60 text-right mt-1">
                {formatTime(msg.createdAt)}
              </div>
            </div>

            {/* ACTIONS */}
            <div className={
              "mt-1 flex items-center gap-1 transition self-end " +
              (copiedMessageId === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")
            }>

              <button
                onClick={() => handleCopyMessage(msg)}
                className={
                  "p-1 rounded-md transition " +
                  (copiedMessageId === msg.id
                    ? "text-green-500"
                    : "hover:bg-black/10")
                }
                data-tooltip={copiedMessageId === msg.id ? "Copied!" : "Copy"}
                data-tooltip-pos="bottom"
              >
                {copiedMessageId === msg.id ? <Check size={14} /> : <Copy size={14} />}
              </button>

              <button
                onClick={() => startEditResend(msg)}
                className="p-1 rounded-md hover:bg-black/10 transition"
                data-tooltip="Edit"
                data-tooltip-pos="bottom"
              >
                <Pencil size={14} />
              </button>

              <button
                onClick={() => onResend(msg)}
                className="p-1 rounded-md hover:bg-black/10 transition"
                data-tooltip="Resend"
                data-tooltip-pos="bottom"
              >
                <RotateCw size={14} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= AI ================= */}
      {msg.role === "assistant" && (
        <div className="flex justify-start">
          <div className="flex flex-col items-start w-full">

            {/* AI label — always visible */}
            <span className={
              "inline-flex items-center gap-1.5 text-[11px] font-medium mb-0.5 " +
              (isDark ? "text-neutral-400" : "text-zinc-500")
            }>
              AI
            </span>

            {/* ── PENDING (thinking / using tool / streaming) ── */}
            {msg.meta?.isPending ? (
              <>
                {/* Premium animated thinking status */}
                <ThinkingStatus msg={msg} isDark={isDark} />

                {msg.content && (() => {
                  const { reasoning, text } = extractReasoning(msg.content);
                  const isThinking = !msg.content.includes("</think>");
                  return (
                    <div className="w-full">
                      <ReasoningBlock reasoning={reasoning} isThinking={isThinking} isDark={isDark} />
                      {(text || !reasoning) && (
                        <div className={"mt-1 w-full " + (isDark ? "text-neutral-200" : "text-neutral-800")}>
                          <MarkdownMessage content={text} isDark={isDark} />
                          <span className="streaming-cursor" />
                        </div>
                      )}
                    </div>
                  );
                })()}
                {msg.meta.emailDraft && (
                  <InlineEmailEditor
                    draft={msg.meta.emailDraft}
                    isDark={isDark}
                    onSend={handleSendEmail}
                    onCancel={handleCancelEmail}
                  />
                )}
              </>
            ) : msg.meta?.isError ? (
              // ── ERROR BUBBLE ──
              <div
                className={
                  "mt-1 px-3 py-2 rounded-xl text-sm leading-relaxed border " +
                  (isDark
                    ? "bg-red-900/30 border-red-500/40 text-red-300"
                    : "bg-red-50 border-red-300 text-red-700")
                }
              >
                <span className="mr-1.5">⚠️</span>
                {msg.content}
                <button
                  onClick={() => onRetry(msg.id)}
                  className={
                    "ml-3 text-[11px] px-2 py-0.5 rounded-md border transition " +
                    (isDark
                      ? "border-red-500/40 text-red-300 hover:bg-red-500/20"
                      : "border-red-300 text-red-700 hover:bg-red-100")
                  }
                  data-tooltip="Retry"
                  data-tooltip-pos="bottom"
                >
                  ↺ Retry
                </button>
              </div>

            ) : (
              // ── NORMAL FINISHED REPLY ──
              <>
                {/* Persistent completed-state badge (timing + operation type) */}
                <ThinkingStatus msg={msg} isDark={isDark} />


                {/* AI-attached files (clickable download links) */}
                {msg.meta?.files?.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1 mb-1">
                    {msg.meta.files.map((file, idx) => {
                      const fileName = typeof file === "string"
                        ? file.split(/[/\\]/).pop()
                        : (file.name || file.filename || `file-${idx + 1}`);
                      const fileUrl = typeof file === "string"
                        ? file
                        : (file.url || file.path || "#");
                      const isDownload = fileUrl.includes("/api/download/");
                      
                      const handleFileClick = async (e) => {
                        if (isDownload) {
                          e.preventDefault();
                          // Get base URL to call /api/open
                          const baseUrl = fileUrl.split("/api/download/")[0];
                          try {
                            const res = await fetch(`${baseUrl}/api/open/${fileName}`);
                            if (!res.ok) throw new Error("Failed to open natively");
                          } catch {
                            // Fallback: open in new tab if native open fails
                            window.open(fileUrl, "_blank");
                          }
                        }
                      };

                      return (
                        <a
                          key={idx}
                          href={fileUrl}
                          onClick={handleFileClick}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium transition-opacity hover:opacity-80 cursor-pointer " +
                            (isDark
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                              : "bg-amber-50 text-amber-700 border border-amber-200")
                          }
                          style={{ textDecoration: "none" }}
                        >
                          <FileDown size={12} />
                          {fileName}
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Message text */}
                {msg.content && (() => {
                  const { reasoning, text } = extractReasoning(msg.content);
                  return (
                    <div className="w-full">
                      <ReasoningBlock reasoning={reasoning} isThinking={false} isDark={isDark} />
                      {(text || !reasoning) && (
                        <div className={"mt-1 " + (isDark ? "text-neutral-200" : "text-neutral-800")}>
                          <MarkdownMessage content={text} isDark={isDark} />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Sources UI Redesign */}
                {msg.meta?.sources?.length > 0 && (
                  <div className={"mt-4 pt-3 border-t " + (isDark ? "border-neutral-700/50" : "border-zinc-200")}>
                    <div className={"text-[11px] font-semibold mb-2 tracking-wide uppercase opacity-70 " + (isDark ? "text-neutral-400" : "text-zinc-500")}>
                      Sources
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.meta.sources.map((src, i) => {
                        let hostname = "Source";
                        try { hostname = new URL(src.url).hostname.replace(/^www\./, ''); } catch { /* ignore */ }
                        
                        return (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={src.title || src.url}
                            className={
                              "group flex flex-col justify-center px-3 py-2 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-sm " +
                              (isDark
                                ? "bg-neutral-800/60 border-neutral-700 hover:bg-neutral-800 hover:border-neutral-600 text-neutral-300"
                                : "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-sm text-zinc-700")
                            }
                            style={{ textDecoration: "none" }}
                          >
                            <span className="text-[12px] font-medium truncate w-full group-hover:text-blue-500 transition-colors">
                              {src.title || hostname}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5 opacity-60">
                              <span className="text-[10px]">🔗</span>
                              <span className="text-[10px] truncate w-full">{hostname}</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default memo(MessageBubble, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.msg.meta === nextProps.msg.meta &&
    prevProps.msg.createdAt === nextProps.msg.createdAt &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.copiedMessageId === nextProps.copiedMessageId &&
    prevProps.prevMsg?.id === nextProps.prevMsg?.id &&
    prevProps.prevMsg?.createdAt === nextProps.prevMsg?.createdAt
  );
});
