import { useState, useRef } from "react";
import { makeId, makeMessage } from "../utils/ChatHelpers";
import { sendMessage, abortChat } from "../api/ChatApi";

const MIN_ACTION_MS = 1500;

// ── Format a tool event (string or {name, args} dict) into a human-readable label
function formatToolEvent(data) {
    if (!data) return "";
    if (typeof data === "string") return data;
    const name = data.name || "";
    const args = data.args || {};
    const SKIP = new Set(["gmail_user", "gmail_password", "password", "on_progress"]);
    const parts = Object.entries(args)
        .filter(([k, v]) => !SKIP.has(k) && v !== null && v !== undefined && v !== "")
        .map(([k, v]) => {
            let sv = String(v);
            if (sv.length > 60) sv = sv.slice(0, 57) + "...";
            return `${k}=${sv}`;
        });
    return parts.length > 0 ? `${name}(${parts.join(", ")})` : name;
}

export function useChat(updateActiveMessages, getSessionId, getMessages) {
    const [isTyping, setIsTyping] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [editResendTarget, setEditResendTarget] = useState(null);

    const abortControllerRef = useRef(null);
    const pendingMsgIdRef = useRef(null);
    const actionQueueRef = useRef([]);
    const actionCurrentRef = useRef(null);
    const actionTimerRef = useRef(null);
    const actionCallbackRef = useRef(null);
    // Timing + completion tracking
    const startTimeRef = useRef(null);
    const lastActionRef = useRef(null);    // last pendingAction label shown
    const pendingSkillRef = useRef(null);  // "deep_think" or null
    const streamingStartedRef = useRef(false); // true once first chunk arrives

    // ── Smooth display queue (ChatGPT-style typewriter effect) ────────────────
    // Incoming text is buffered here and drained at a fixed char rate by a RAF
    // loop so the visual typing speed is smooth regardless of network jitter.
    const chunkQueueRef   = useRef(""); // characters waiting to be rendered
    const displayedRef    = useRef(""); // characters already on screen
    const displayRafRef   = useRef(null); // requestAnimationFrame handle

    const _setPendingAction = (label) => {
        const id = pendingMsgIdRef.current;
        if (!id) return;
        lastActionRef.current = label;  // track for completed badge
        const isThinker = pendingSkillRef.current === "deep_think";
        updateActiveMessages(getMessages().map((m) =>
            m.id === id ? {
                ...m,
                meta: {
                    ...m.meta,
                    pendingAction: label,
                    // Accumulate step trace for ALL thinking modes
                    thinkerSteps: [...(m.meta?.thinkerSteps || []), label],
                    isThinker: isThinker,
                }
            } : m
        ));
    };

    const _flushQueue = () => {
        actionTimerRef.current = null;
        if (actionQueueRef.current.length > 0) {
            const next = actionQueueRef.current.shift();
            actionCurrentRef.current = next;
            _setPendingAction(next);
            actionTimerRef.current = setTimeout(_flushQueue, MIN_ACTION_MS);
        } else {
            actionCurrentRef.current = null;
            const cb = actionCallbackRef.current;
            actionCallbackRef.current = null;
            cb?.();
        }
    };

    const showAction = (label) => {
        const lastQueued =
            actionQueueRef.current.length > 0
                ? actionQueueRef.current[actionQueueRef.current.length - 1]
                : actionCurrentRef.current;
        if (lastQueued === label) return;
        if (actionCurrentRef.current === null) {
            actionCurrentRef.current = label;
            _setPendingAction(label);
            if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
            actionTimerRef.current = setTimeout(_flushQueue, MIN_ACTION_MS);
        } else {
            actionQueueRef.current.push(label);
        }
    };

    const finishAction = (onDone) => {
        if (
            actionCurrentRef.current === null &&
            actionQueueRef.current.length === 0
        ) {
            onDone();
        } else {
            actionCallbackRef.current = onDone;
        }
    };

    const _resetActionQueue = () => {
        if (actionTimerRef.current) {
            clearTimeout(actionTimerRef.current);
            actionTimerRef.current = null;
        }
        actionQueueRef.current = [];
        actionCurrentRef.current = null;
        actionCallbackRef.current = null;
        startTimeRef.current = null;
        lastActionRef.current = null;
        pendingSkillRef.current = null;
    };

    // Characters to reveal per animation frame.  5 chars @ 60 fps ≈ 300 chars/sec —
    // fast enough to keep up with even a quick model, but spread out a sudden burst
    // so text flows smoothly instead of "snapping" in.
    const DISPLAY_CHARS_PER_FRAME = 5;

    // Start (or resume) the RAF drain loop for the given pending message id.
    const _scheduleDisplayDrain = (id) => {
        if (displayRafRef.current) return; // loop already running
        const drain = () => {
            const queue = chunkQueueRef.current;
            if (!queue) { displayRafRef.current = null; return; }
            const take = queue.slice(0, DISPLAY_CHARS_PER_FRAME);
            chunkQueueRef.current = queue.slice(DISPLAY_CHARS_PER_FRAME);
            displayedRef.current += take;
            updateActiveMessages(
                getMessages().map((m) =>
                    m.id === id
                        ? { ...m, content: displayedRef.current, meta: { ...m.meta, isStreaming: true } }
                        : m
                )
            );
            displayRafRef.current = chunkQueueRef.current
                ? requestAnimationFrame(drain)
                : null;
        };
        displayRafRef.current = requestAnimationFrame(drain);
    };

    // Cancel the RAF loop and wipe all display state (called at start of new send).
    const _resetDisplayQueue = () => {
        if (displayRafRef.current) { cancelAnimationFrame(displayRafRef.current); displayRafRef.current = null; }
        chunkQueueRef.current = "";
        displayedRef.current  = "";
    };

    // Cancel the RAF loop and instantly flush remaining queue (called before finalize / stop).
    // Does NOT update React state — the caller is about to do a full message update anyway.
    const _flushDisplayQueue = () => {
        if (displayRafRef.current) { cancelAnimationFrame(displayRafRef.current); displayRafRef.current = null; }
        displayedRef.current += chunkQueueRef.current;
        chunkQueueRef.current = "";
    };

    const handleStop = () => {
        _resetActionQueue();
        _flushDisplayQueue(); // flush remaining queue into displayedRef

        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        abortChat(getSessionId?.() ?? "default_user");
        
        const pendingId = pendingMsgIdRef.current;
        pendingMsgIdRef.current = null;
        setIsTyping(false);

        // displayedRef.current holds everything that was streamed + any flushed remainder
        const stoppedContent = displayedRef.current || "";
        _resetDisplayQueue();

        updateActiveMessages(
            getMessages().map((m) =>
                m.id === pendingId
                    ? {
                        ...m,
                        // Use flushed display content so nothing visible is lost on stop
                        content: stoppedContent || m.content || "_Response was interrupted._",
                        meta: { ...m.meta, isPending: false, isStreaming: false, pendingAction: undefined },
                    }
                    : m
            )
        );
    };

    const getThinkingLabel = (files = [], attachments = []) => {
        const hasImage = files?.some((f) => f.type?.startsWith("image/")) || attachments?.some((a) => a.type?.startsWith("image/"));
        if (hasImage) {
            return "Analyzing image…";
        }

        if (files?.length > 0 || attachments?.length > 0) {
            return "Reading files…";
        }

        return "Thinking…";
    };

    // Helper: build completed meta fields (for the persistent badge)
    const buildCompletedMeta = (baseMeta = {}) => ({
        ...baseMeta,
        completedAction: lastActionRef.current,
        durationMs: startTimeRef.current ? Date.now() - startTimeRef.current : null,
        isThinker: pendingSkillRef.current === "deep_think",
    });

    // Helper: finalize the pending message in-place (no visual snap / message re-creation)
    // Always uses authorContent (= data.response) as the final content — it is the complete,
    // authoritative response from the backend. Streamed m.content can be partial or garbled.
    const finalizePendingMsg = (pendingId, completedMeta, authorContent) => {
        updateActiveMessages(
            getMessages().map((m) => {
                if (m.id !== pendingId) return m;
                return {
                    ...m,
                    content: authorContent || "",   // always the correct full response
                    meta: {
                        ...m.meta,
                        ...completedMeta,
                        isPending: false,
                        isStreaming: false,
                        pendingAction: undefined,
                    },
                };
            })
        );
    };

    const handleSend = async ({
        input,
        toolHint = "",
        files,
        editResendTarget: editTarget,
        routineName,
        setInput,
        setFiles,
        textareaRef,
    }) => {
        const text = input.trim();
        const hasFiles = files.length > 0;
        const currentFiles = files;

        const originalMsgForEdit = editTarget ? getMessages().find((m) => m.id === editTarget) : null;
        
        // Parse skill from explicit toolHint, or inherit from the message being edited
        const parsedSkillName = toolHint ? toolHint.match(/\[FORCE_TOOL:(\w+)\]/)?.[1] || null : null;
        const finalSkillName = parsedSkillName || originalMsgForEdit?.meta?.skill || null;
        
        // Inherit routine state if we are resending/editing a routine execution
        const finalRoutineName = routineName || originalMsgForEdit?.meta?.routineName || null;
        const finalIsRoutine = !!finalRoutineName;

        // If inherited from edit, we must rebuild the toolHint string so the backend actually runs it
        const finalToolHint = parsedSkillName ? toolHint : (finalSkillName ? `[FORCE_TOOL:${finalSkillName}] ` : "");

        abortControllerRef.current?.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        _resetActionQueue();
        _resetDisplayQueue();                // clear any leftover display state from previous send
        startTimeRef.current = new Date().getTime();
        pendingSkillRef.current = finalSkillName; // track skill for thinker detection
        streamingStartedRef.current = false; // reset for each new send

        const onEvent = (type, data) => {
            if (type === "tool") {
                // Don't update label once the AI has started streaming response text
                if (streamingStartedRef.current) return;
                
                // Format tool name + parameters for display
                const toolLabel = formatToolEvent(data);
                const toolName = typeof data === "string" ? data : (data?.name || "");

                // Keep underscores for UI display as requested
                showAction(`Using: ${toolLabel}`);
                const id = pendingMsgIdRef.current;
                if (id) {
                    updateActiveMessages(getMessages().map(m => {
                        if (m.id !== id) return m;
                        return {
                            ...m,
                            meta: {
                                ...m.meta,
                                thinkerSteps: [...(m.meta.thinkerSteps || []), `Using ${toolLabel}`],
                                ...(finalIsRoutine ? { routineSteps: [...(m.meta.routineSteps || []), toolName] } : {})
                            }
                        };
                    }));
                }
            }

            else if (type === "thinking") {
                // Don't flip back to "Thinking..." once streaming has already started
                if (streamingStartedRef.current) return;
                if (data) {
                    showAction(data);
                } else {
                    showAction(getThinkingLabel(currentFiles, originalMsgForEdit?.attachments));
                }
            }


            else if (type === "thinker_step") {
                // Rich Thinker step — always use the step label directly
                if (data) showAction(data);
            }

            else if (type === "chunk") {
                const id = pendingMsgIdRef.current;
                if (!id) return;
                streamingStartedRef.current = true; // mark that real content is flowing
                // Push new text into the smooth display queue instead of updating React
                // state directly.  The RAF drain loop reveals it at a fixed char rate.
                chunkQueueRef.current += data;
                _scheduleDisplayDrain(id);
            }
            // permission_request is handled by polling in ChatController
        };


        // --- Edit & Resend path ---
        if (editTarget) {
            const idx = getMessages().findIndex((m) => m.id === editTarget);
            if (idx === -1) return;

            const base = getMessages().slice(0, idx);
            const attachments = currentFiles.length > 0
                ? currentFiles.map((f) => ({
                    name: f.name,
                    size: f.size,
                    type: f.type || "",
                    url: URL.createObjectURL(f),
                    rawFile: f,
                }))
                : [];

            const editedMsg = makeMessage({
                role: "user",
                content: text,
                attachments: attachments,
                meta: {
                    ...(finalSkillName ? { skill: finalSkillName } : {}),
                    ...(finalIsRoutine ? { isRoutine: true, routineName: finalRoutineName } : {})
                }
            });
            const originalFiles = currentFiles;
            const next = [...base, editedMsg];

            updateActiveMessages(next);
            setInput("");
            setEditResendTarget(null);
            setFiles([]);
            setIsTyping(true);
            showAction(getThinkingLabel(currentFiles, originalMsgForEdit?.attachments));

            const pendingId = makeId();
            pendingMsgIdRef.current = pendingId;
            startTimeRef.current = new Date().getTime(); // start timer for edit path
            const pendingMsg = {
                id: pendingId,
                role: "assistant",
                content: null,
                createdAt: new Date().toISOString(),
                attachments: [],
                meta: {
                    isPending: true,
                    pendingAction: getThinkingLabel(currentFiles, originalMsgForEdit?.attachments),
                    skill: finalSkillName || undefined,
                    isThinker: finalSkillName === "deep_think",
                    thinkerSteps: finalSkillName === "deep_think" ? [] : undefined,
                },
            };
            updateActiveMessages([...next, pendingMsg]);

            try {
                const data = await sendMessage(finalToolHint + text, originalFiles, onEvent, getSessionId?.() ?? "default_user", [], abortControllerRef.current?.signal);

                if (data?.aborted) {
                    pendingMsgIdRef.current = null;
                    setIsTyping(false);
                    return;
                }

                if (data.error) {
                    const errorMsg = makeMessage({ role: "assistant", content: data.message || "Something went wrong.", meta: { isError: true } });
                    finishAction(() => {
                        pendingMsgIdRef.current = null;
                        setIsTyping(false);
                        updateActiveMessages([...next, errorMsg]);
                    });
                    return;
                }

                if (data.email_preview) {

                    // ✅ SAVE EMAIL
                    if (data.email_preview?.to) {
                        saveEmailToStorage(data.email_preview.to);
                    }

                    updateActiveMessages(getMessages().map(m => m.id === pendingId ? {
                        ...m,
                        meta: { ...m.meta, pendingAction: "editing_email", emailDraft: data.email_preview }
                    } : m));
                    return;
                }

                const responseText = data.response || "";
                // Capture thinkerSteps NOW before finishAction queue delay can clear the pending message
                const capturedSteps = pendingSkillRef.current === "deep_think"
                    ? (getMessages().find(m => m.id === pendingId)?.meta?.thinkerSteps || [])
                    : undefined;
                const completedMeta = buildCompletedMeta({
                    ...(data.tool ? { tool: data.tool } : {}),
                    ...(data.files?.length ? { files: data.files } : {}),
                    ...(data.sources?.length ? { sources: data.sources } : {}),
                    ...(capturedSteps ? {
                        thinkerSteps: capturedSteps,
                        skill: "deep_think",
                    } : {}),
                });

                finishAction(() => {
                    _flushDisplayQueue(); // drain any remaining queued chars before finalizing
                    pendingMsgIdRef.current = null;
                    setIsTyping(false);
                    finalizePendingMsg(pendingId, completedMeta, responseText);
                });
            } catch {
                const errorMsg = makeMessage({
                    role: "assistant", content: "Cannot connect to the server. Please make sure the server is running.",
                    meta: { isError: true }
                });
                finishAction(() => {
                    pendingMsgIdRef.current = null;
                    setIsTyping(false);
                    updateActiveMessages([...next, errorMsg]);
                });
            }
            return;
        }

        // --- Normal send path ---
        if (!text && !hasFiles) return;

        const attachments = hasFiles
            ? files.map((f) => ({
                name: f.name,
                size: f.size,
                type: f.type || "",
                url: URL.createObjectURL(f),
                rawFile: f,
            }))
            : [];

        const next = [
            ...getMessages(),
            makeMessage({ 
                role: "user", 
                content: text, 
                attachments, 
                meta: {
                    ...(finalSkillName ? { skill: finalSkillName } : {}),
                    ...(finalIsRoutine ? { isRoutine: true, routineName: finalRoutineName } : {})
                }
            }),
        ];

        updateActiveMessages(next);
        setInput("");
        setFiles([]);

        if (textareaRef?.current) {
            textareaRef.current.style.height = "40px";
        }

        setIsTyping(true);
        showAction(getThinkingLabel(currentFiles));

        const pendingId = makeId();
        pendingMsgIdRef.current = pendingId;
        startTimeRef.current = new Date().getTime();
        const pendingMsg = {
                id: pendingId,
                role: "assistant",
                content: null,
                createdAt: new Date().toISOString(),
                attachments: [],
                meta: {
                    isPending: true,
                    pendingAction: getThinkingLabel(currentFiles),
                    skill: finalSkillName || undefined,
                    isThinker: finalSkillName === "deep_think",
                    thinkerSteps: finalSkillName === "deep_think" ? [] : undefined,
                },
            };
            updateActiveMessages([...next, pendingMsg]);

            try {
                const data = await sendMessage(finalToolHint + text, currentFiles, onEvent, getSessionId?.() ?? "default_user", [], abortControllerRef.current?.signal);

            if (data?.aborted) {
                pendingMsgIdRef.current = null;
                setIsTyping(false);
                return;
            }

            if (data.error) {
                const errorMsg = makeMessage({ role: "assistant", content: data.message || "Something went wrong.", meta: { isError: true } });
                finishAction(() => {
                    pendingMsgIdRef.current = null;
                    setIsTyping(false);
                    updateActiveMessages([...next, errorMsg]);
                });
                return;
            }

            if (data.email_preview) {
                if (data.email_preview?.to) {
                    saveEmailToStorage(data.email_preview.to);
                }

                finishAction(() => {
                    setIsTyping(false);
                    updateActiveMessages(getMessages().map(m => m.id === pendingId ? {
                        ...m,
                        meta: { 
                            ...m.meta, 
                            pendingAction: "editing_email", 
                            thinkerSteps: [...(m.meta.thinkerSteps || []), "editing email"],
                            emailDraft: data.email_preview 
                        }
                    } : m));
                });
                return;
            }


            const responseText = data.response || "";
            // Capture thinkerSteps and routineSteps NOW before finishAction queue delay can clear the pending message
            const capturedThinkerSteps = pendingSkillRef.current === "deep_think"
                ? (getMessages().find(m => m.id === pendingId)?.meta?.thinkerSteps || [])
                : undefined;
            const capturedRoutineSteps = finalIsRoutine
                ? (getMessages().find(m => m.id === pendingId)?.meta?.routineSteps || [])
                : undefined;

            const completedMeta = {
                ...(data.tool ? { tool: data.tool } : {}),
                ...(data.files?.length ? { files: data.files } : {}),
                ...(data.sources?.length ? { sources: data.sources } : {}),
                completedAction: lastActionRef.current,
                durationMs: startTimeRef.current ? new Date().getTime() - startTimeRef.current : null,
                isThinker: pendingSkillRef.current === "deep_think",
                ...(capturedThinkerSteps ? {
                    thinkerSteps: capturedThinkerSteps,
                    skill: "deep_think",
                } : {}),
                ...(capturedRoutineSteps ? {
                    routineSteps: capturedRoutineSteps,
                    isRoutine: true,
                } : {}),
            };

            finishAction(() => {
                _flushDisplayQueue(); // drain any remaining queued chars before finalizing
                 pendingMsgIdRef.current = null;
                setIsTyping(false);
                finalizePendingMsg(pendingId, completedMeta, responseText);
            });
        } catch {
            const errorMsg = makeMessage({
                role: "assistant", content: "Cannot connect to the server. Please make sure the server is running.",
                meta: { isError: true }
            });
            finishAction(() => {
                pendingMsgIdRef.current = null;
                setIsTyping(false);
                updateActiveMessages([...next, errorMsg]);
            });
        }
    };

    const handleClearChat = ({ setFiles }) => {
        updateActiveMessages([]);
        setFiles([]);
        setCopiedMessageId(null);   // use internal state directly
        setIsTyping(false);
        setEditResendTarget(null);
    };

    const handleCopyMessage = async (msg) => {
        try {
            await navigator.clipboard.writeText(msg.content || "");
            setCopiedMessageId(msg.id);
            setTimeout(() => setCopiedMessageId(null), 1200);
        } catch { /* ignore */ }
    };

    const startEditResend = (msg, setInput, textareaRef, setFiles) => {
        setInput(msg.content);
        if (setFiles && msg.attachments?.length > 0) {
            setFiles(msg.attachments.map(a => a.rawFile).filter(Boolean));
        }
        setEditResendTarget(msg.id);
        textareaRef?.current?.focus();
    };

    const handleResend = async ({ msgId, content }) => {
        if (!content?.trim()) return;

        // Derive context FIRST
        const allMessages = getMessages();
        const msgIndex = allMessages.findIndex((m) => m.id === msgId);
        const originalMessage = msgIndex !== -1 ? allMessages[msgIndex] : null;
        if (!originalMessage) return;

        let targetUserMsg = originalMessage;
        if (originalMessage.role === "assistant") {
            for (let i = msgIndex - 1; i >= 0; i--) {
                if (allMessages[i].role === "user") {
                    targetUserMsg = allMessages[i];
                    break;
                }
            }
        }

        if (!targetUserMsg || targetUserMsg.role !== "user") return;

        const skillName = targetUserMsg.meta?.skill || null;
        const toolHint = skillName ? `[FORCE_TOOL:${skillName}]` : "";

        // Use the rock-solid Edit & Resend path that already handles slicing,
        // streaming, and the smooth display queue properly.
        handleSend({
            input: targetUserMsg.content,
            toolHint,
            files: targetUserMsg.attachments?.map(a => a.rawFile).filter(Boolean) || [],
            editResendTarget: targetUserMsg.id,
            setInput: () => { }, // Protect current chat box input
            setFiles: () => { }, // Protect current chat box files
            textareaRef: null,
        });
    };

    const retryMessage = (errorMsgId, { setFiles, textareaRef }) => {
        const messages = getMessages();
        const errorIndex = messages.findIndex((m) => m.id === errorMsgId);
        if (errorIndex === -1) return;

        let userMsg = null;
        for (let i = errorIndex - 1; i >= 0; i--) {
            if (messages[i].role === "user") {
                userMsg = messages[i];
                break;
            }
        }
        if (!userMsg) return;

        // Remove error message(s) after the user message
        const cleaned = messages.slice(0, errorIndex);
        updateActiveMessages(cleaned);

        // Use the edit-resend path: it will re-slice from userMsg.id and re-send
        handleSend({
            input: userMsg.content,
            files: [],
            editResendTarget: userMsg.id,
            setInput: () => { },
            setFiles,
            textareaRef,
        });
    };


    const resolvePendingMessage = async (prompt, extraMeta = {}) => {
        const pendingId = pendingMsgIdRef.current;
        if (!pendingId) return;

        // Switch the UI back to Thinking state
        updateActiveMessages(getMessages().map(m => m.id === pendingId ? {
            ...m,
            content: "",
            meta: { 
                ...m.meta, 
                isPending: true, 
                pendingAction: "sending", 
                thinkerSteps: [...(m.meta.thinkerSteps || []), "sending"],
                emailDraft: null 
            }
        } : m));

        // Let the UI stream the AI's dynamic response
        const onEvent = (type, data) => {
            if (type === "chunk") {
                updateActiveMessages(getMessages().map((msg) =>
                    msg.id === pendingId ? { ...msg, content: (msg.content || "") + data } : msg
                ));
            } else if (type === "status") {
                updateActiveMessages(getMessages().map((msg) =>
                    msg.id === pendingId ? { ...msg, meta: { ...msg.meta, pendingAction: data } } : msg
                ));
            }
        };


        try {
            // Secretly invoke the AI!
            const data = await sendMessage(prompt, [], onEvent, getSessionId?.() ?? "default_user");

            finishAction(() => {
                _flushDisplayQueue();
                pendingMsgIdRef.current = null;
                setIsTyping(false);

                const existingMsg = getMessages().find(m => m.id === pendingId);
                const capturedThinkerSteps = existingMsg?.meta?.thinkerSteps;

                const completedMeta = buildCompletedMeta({
                    ...(data.tool ? { tool: data.tool } : {}),
                    ...(data.files?.length ? { files: data.files } : {}),
                    ...(data.sources?.length ? { sources: data.sources } : {}),
                    ...(capturedThinkerSteps ? { thinkerSteps: capturedThinkerSteps } : {}),
                    ...(extraMeta.files?.length ? { files: [...(data.files || []), ...extraMeta.files] } : {}),
                    emailDraft: undefined,
                });

                finalizePendingMsg(pendingId, completedMeta, data.response || "Finished.");
            });
        } catch (err) {
            console.error("AI dynamic resolve failed:", err);
            finishAction(() => {
                pendingMsgIdRef.current = null;
                setIsTyping(false);
            });
        }
    };

    const saveEmailToStorage = (email) => {
        if (!email) return;

        const clean = email.trim().toLowerCase();

        // ✅ basic validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;

        try {
            const existing = JSON.parse(localStorage.getItem("savedEmails") || "[]");

            const exists = existing.some(
                e => e.email.trim().toLowerCase() === clean
            );

            if (exists) return;

            const updated = [...existing, { email: clean }];
            localStorage.setItem("savedEmails", JSON.stringify(updated));
        } catch { /* ignore */ }
    };

    return {
        isTyping,
        copiedMessageId,
        editResendTarget,
        setEditResendTarget,
        handleSend,
        handleStop,
        handleClearChat,
        handleCopyMessage,
        startEditResend,
        resolvePendingMessage,
        retryMessage,
        handleResend,
    };
}
