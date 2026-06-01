import { useState, useRef } from "react";
import { makeId, makeMessage } from "../utils/ChatHelpers";
import { sendMessage } from "../api/ChatApi";

const MIN_ACTION_MS = 1500;

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

    const handleStop = () => {
        _resetActionQueue();

        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        const pendingId = pendingMsgIdRef.current;
        pendingMsgIdRef.current = null;
        setIsTyping(false);

        updateActiveMessages(
            getMessages().map((m) =>
                m.id === pendingId
                    ? {
                        ...m,
                        content: "_Response was interrupted._",
                        meta: { ...m.meta, isPending: false },
                    }
                    : m
            )
        );
    };

    const getThinkingLabel = (files = []) => {
        if (files?.some((f) => f.type?.startsWith("image/"))) {
            return "Analyzing image…";
        }

        if (files?.length > 0) {
            return "Reading file…";
        }

        return "Thinking…";
    };

    const handleSend = async ({
        input,
        toolHint = "",
        files,
        editResendTarget: editTarget,
        setInput,
        setFiles,
        textareaRef,
        setPermissionRequest,
    }) => {
        const text = input.trim();
        const hasFiles = files.length > 0;
        const currentFiles = files;
        const skillName = toolHint
            ? toolHint.match(/\[FORCE_TOOL:(\w+)\]/)?.[1] || null
            : null;

        abortControllerRef.current?.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        _resetActionQueue();
        startTimeRef.current = Date.now();
        pendingSkillRef.current = skillName; // track skill for thinker detection

        const onEvent = (type, data) => {
            if (type === "tool") {
                showAction(`Using: ${data}`);
            }

            else if (type === "thinking") {
                if (data) {
                    showAction(data);
                } else {
                    showAction(getThinkingLabel(currentFiles));
                }
            }


            else if (type === "thinker_step") {
                // Rich Thinker step — always use the step label directly
                if (data) showAction(data);
            }

            else if (type === "chunk") {
                const id = pendingMsgIdRef.current;
                if (!id) return;
                updateActiveMessages(
                    getMessages().map((m) =>
                        m.id === id
                            ? { ...m, content: (m.content || "") + data, meta: { ...m.meta, isStreaming: true } }
                            : m
                    )
                );
            }
            // permission_request is handled by polling in ChatController
        };

        // Helper: build completed meta fields (for the persistent badge)
        const buildCompletedMeta = (baseMeta = {}) => ({
            ...baseMeta,
            completedAction: lastActionRef.current,
            durationMs: startTimeRef.current ? Date.now() - startTimeRef.current : null,
            isThinker: pendingSkillRef.current === "deep_think" || true, // treat all thinking as thinker
        });


        // --- Edit & Resend path ---
        if (editTarget) {
            const idx = getMessages().findIndex((m) => m.id === editTarget);
            if (idx === -1) return;

            const base = getMessages().slice(0, idx);
            const originalMsg = getMessages().find((m) => m.id === editTarget);
            const editedMsg = makeMessage({
                role: "user",
                content: text,
                attachments: originalMsg?.attachments || [],
            });
            const originalFiles = originalMsg?.attachments
                ?.map((a) => a.rawFile)
                ?.filter(Boolean) || [];
            const next = [...base, editedMsg];

            updateActiveMessages(next);
            setInput("");
            setEditResendTarget(null);
            setFiles([]);
            setIsTyping(true);
            showAction(getThinkingLabel(currentFiles));

            const pendingId = makeId();
            pendingMsgIdRef.current = pendingId;
            startTimeRef.current = Date.now(); // start timer for edit path
            const pendingMsg = {
                id: pendingId,
                role: "assistant",
                content: null,
                createdAt: new Date().toISOString(),
                attachments: [],
                meta: {
                    isPending: true,
                    pendingAction: getThinkingLabel(currentFiles),
                    skill: skillName || undefined,
                    isThinker: skillName === "deep_think",
                    thinkerSteps: skillName === "deep_think" ? [] : undefined,
                },
            };
            updateActiveMessages([...next, pendingMsg]);

            try {
                const data = await sendMessage(toolHint + text, originalFiles, onEvent, getSessionId?.() ?? "default_user", [], abortControllerRef.current?.signal);

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
                const realMsg = makeMessage({
                    role: "assistant",
                    content: responseText,
                    meta: buildCompletedMeta({
                        ...(data.tool ? { tool: data.tool } : {}),
                        ...(data.files?.length ? { files: data.files } : {}),
                        ...(data.sources?.length ? { sources: data.sources } : {}),
                        // Carry over accumulated thinker steps from the pending message
                        ...(capturedSteps ? {
                            thinkerSteps: capturedSteps,
                            skill: "deep_think",
                        } : {}),
                    }),
                });


                finishAction(() => {
                    pendingMsgIdRef.current = null;
                    setIsTyping(false);
                    updateActiveMessages([...next, realMsg]);
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
            makeMessage({ role: "user", content: text, attachments, meta: skillName ? { skill: skillName } : undefined, }),
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
        startTimeRef.current = Date.now();
        const pendingMsg = {
            id: pendingId,
            role: "assistant",
            content: null,
            createdAt: new Date().toISOString(),
            attachments: [],
            meta: {
                isPending: true,
                pendingAction: getThinkingLabel(currentFiles),
                skill: skillName || undefined,
                isThinker: skillName === "deep_think",
                thinkerSteps: skillName === "deep_think" ? [] : undefined,
            },
        };
        updateActiveMessages([...next, pendingMsg]);

        try {
            const data = await sendMessage(toolHint + text, currentFiles, onEvent, getSessionId?.() ?? "default_user", [], abortControllerRef.current?.signal);

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
                        meta: { ...m.meta, pendingAction: "editing_email", emailDraft: data.email_preview }
                    } : m));
                });
                return;
            }


            const responseText = data.response || "";
            // Capture thinkerSteps NOW before finishAction queue delay can clear the pending message
            const capturedSteps = pendingSkillRef.current === "deep_think"
                ? (getMessages().find(m => m.id === pendingId)?.meta?.thinkerSteps || [])
                : undefined;
            const realMsg = makeMessage({
                role: "assistant",
                content: responseText,
                meta: buildCompletedMeta({
                    ...(data.tool ? { tool: data.tool } : {}),
                    ...(data.files?.length ? { files: data.files } : {}),
                    ...(data.sources?.length ? { sources: data.sources } : {}),
                    // Carry over accumulated thinker steps from the pending message
                    ...(capturedSteps ? {
                        thinkerSteps: capturedSteps,
                        skill: "deep_think",
                    } : {}),
                }),
            });

            finishAction(() => {
                pendingMsgIdRef.current = null;
                setIsTyping(false);
                updateActiveMessages([...next, realMsg]);
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

    const startEditResend = (msg, setInput, textareaRef) => {
        setInput(msg.content);
        setEditResendTarget(msg.id);
        textareaRef?.current?.focus();
    };

    const handleResend = async ({ msgId, content, setPermissionRequest }) => {
        if (!content?.trim()) return;

        // Derive context FIRST (needed for skillName before onEvent is built)
        const allMessages = getMessages();
        const msgIndex = allMessages.findIndex((m) => m.id === msgId);
        const originalMessage = msgIndex !== -1 ? allMessages[msgIndex] : null;
        const skillName = originalMessage?.meta?.skill || null;
        const originalFiles = originalMessage?.attachments
            ?.map((a) => a.rawFile)
            ?.filter(Boolean) || [];

        abortControllerRef.current?.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        _resetActionQueue();
        startTimeRef.current = Date.now();


        pendingSkillRef.current = skillName;

        const onEvent = (type, data) => {
            if (type === "tool") {
                showAction(`Using: ${data}`);
            }

            else if (type === "thinking") {
                if (data) {
                    showAction(data);
                } else {
                    showAction(getThinkingLabel(originalFiles));
                }
            }


            else if (type === "thinker_step") {
                if (data) showAction(data);
            }

            else if (type === "chunk") {
                const id = pendingMsgIdRef.current;
                if (!id) return;

                updateActiveMessages(
                    getMessages().map((m) =>
                        m.id === id
                            ? {
                                ...m,
                                content: (m.content || "") + data,
                                meta: { ...m.meta, isStreaming: true }
                            }
                            : m
                    )
                );
            }
        };

        const recreatedUserMessage = makeMessage({
            role: "user",
            content,
            attachments: originalMessage?.attachments || [],
            meta: skillName ? { skill: skillName } : undefined,
        });

        const snapshot =
            msgIndex !== -1
                ? [...allMessages.slice(0, msgIndex), recreatedUserMessage]
                : [...allMessages, recreatedUserMessage];

        updateActiveMessages(snapshot);

        setIsTyping(true);

        const pendingId = makeId();
        pendingMsgIdRef.current = pendingId;
        startTimeRef.current = Date.now();
        const pendingMsg = {
            id: pendingId,
            role: "assistant",
            content: null,
            createdAt: new Date().toISOString(),
            attachments: [],
            meta: {
                isPending: true,
                pendingAction: getThinkingLabel(originalFiles),
                skill: skillName || undefined,
                isThinker: skillName === "deep_think",
                thinkerSteps: skillName === "deep_think" ? [] : undefined,
            },
        };
        updateActiveMessages([...snapshot, pendingMsg]);

        // First status label fires AFTER pendingMsgIdRef is set so _setPendingAction
        // can find the message and append thinker steps to it correctly.
        showAction(getThinkingLabel(originalFiles));

        try {
            const toolPrefix = skillName
                ? `[FORCE_TOOL:${skillName}] `
                : "";

            const data = await sendMessage(
                toolPrefix + content,
                originalFiles,
                onEvent,
                getSessionId?.() ?? "default_user",
                [],
                abortControllerRef.current?.signal
            );

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
                    updateActiveMessages([...snapshot, errorMsg]);
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
                        meta: { ...m.meta, pendingAction: "editing_email", emailDraft: data.email_preview }
                    } : m));
                });
                return;
            }


            const responseText = data.response || "";
            // Capture thinkerSteps NOW before finishAction queue delay can clear the pending message
            const capturedSteps = pendingSkillRef.current === "deep_think"
                ? (getMessages().find(m => m.id === pendingId)?.meta?.thinkerSteps || [])
                : undefined;
            const realMsg = makeMessage({
                role: "assistant",
                content: responseText,
                meta: ({
                    ...(data.tool ? { tool: data.tool } : {}),
                    ...(data.files?.length ? { files: data.files } : {}),
                    ...(data.sources?.length ? { sources: data.sources } : {}),
                    completedAction: lastActionRef.current,
                    durationMs: startTimeRef.current ? Date.now() - startTimeRef.current : null,
                    isThinker: pendingSkillRef.current === "deep_think",
                    ...(capturedSteps ? {
                        thinkerSteps: capturedSteps,
                        skill: "deep_think",
                    } : {}),
                }),
            });
            finishAction(() => {
                pendingMsgIdRef.current = null;
                setIsTyping(false);
                updateActiveMessages([...snapshot, realMsg]);
            });
        } catch {
            const errorMsg = makeMessage({
                role: "assistant",
                content: "Cannot connect to the server. Please make sure the server is running.",
                meta: { isError: true }
            });
            finishAction(() => {
                pendingMsgIdRef.current = null;
                setIsTyping(false);
                updateActiveMessages([...snapshot, errorMsg]);
            });
        }
    };


    const retryMessage = (errorMsgId, { setFiles, textareaRef, setPermissionRequest }) => {
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
            setPermissionRequest,
        });
    };


    const resolvePendingMessage = async (prompt, extraMeta = {}) => {
        const pendingId = pendingMsgIdRef.current;
        if (!pendingId) return;

        // Switch the UI back to Thinking state
        updateActiveMessages(getMessages().map(m => m.id === pendingId ? {
            ...m,
            content: "",
            meta: { ...m.meta, isPending: true, pendingAction: "Sending...", emailDraft: null }
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
                pendingMsgIdRef.current = null;
                setIsTyping(false);
                const filtered = getMessages().filter(m => m.id !== pendingId);
                const finalMsg = makeMessage({
                    role: "assistant",
                    content: data.response || "Finished.",
                    meta: {
                        tool: data.tool,
                        files: [...(data.files || []), ...(extraMeta.files || [])]
                    }
                });
                updateActiveMessages([...filtered, finalMsg]);
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
