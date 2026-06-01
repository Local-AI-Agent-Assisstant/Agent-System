import { useState, useRef, useEffect, useCallback } from "react";
import ChatLayout from "../components/chat/ChatLayout";
import { useApiStatus } from "../hooks/useApiStatus";
import { useDictation } from "../hooks/useDictation";
import { useConversations } from "../hooks/useConversations";
import { useChat } from "../hooks/useChat";
import { getToolPermissions, sendMessage } from "../api/ChatApi";
import { useVoiceChat } from "../hooks/useVoiceChat";
import { makeMessage } from "../utils/ChatHelpers";
import VoiceChatModal from "../components/chat/VoiceChatModal";
import ToolPermissionModal from "../components/chat/ToolPermissionModal";


// Strip markdown symbols so Piper TTS speaks clean text
function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s+/g, "")           // ## Headings
    .replace(/\*\*(.+?)\*\*/g, "$1")      // **bold**
    .replace(/\*(.+?)\*/g, "$1")          // *italic*
    .replace(/__(.+?)__/g, "$1")          // __bold__
    .replace(/_(.+?)_/g, "$1")            // _italic_
    .replace(/`{3}[\s\S]*?`{3}/g, "")    // ```code blocks```
    .replace(/`(.+?)`/g, "$1")            // `inline code`
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")   // [links](url)
    .replace(/^[-*+]\s+/gm, "")           // - bullet points
    .replace(/^\d+\.\s+/gm, "")           // 1. numbered lists
    .replace(/>\s+/g, "")                 // > blockquotes
    .replace(/---+/g, "")                 // --- horizontal rules
    .replace(/\n{2,}/g, ". ")             // blank lines → pause
    .replace(/\n/g, " ")                  // single newlines → space
    .trim();
}


function ChatController() {
  // UI-only state
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isToolSidebarOpen, setIsToolSidebarOpen] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [isVoiceSending, setIsVoiceSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  messagesRef.current = messages; // always current, no lag
  const lastMessagesLengthRef = useRef(messages.length);
  const sessionIdRef = useRef("default_user");

  const [allowedTools, setAllowedTools] = useState(() => {
    try {
      const saved = localStorage.getItem("allowedTools");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist allowedTools to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("allowedTools", JSON.stringify(allowedTools));
  }, [allowedTools]);

  // ── Planner state ──
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [plannerTasks, setPlannerTasks] = useState([]);

  const fetchPlannerTasks = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/api/planner/tasks`);
      const data = await res.json();
      if (data.ok) setPlannerTasks(data.tasks);
    } catch { /* ignore */ }
  }, []);

  // Refs
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Hooks
  const { apiStatus } = useApiStatus();
  const { isDictating, toggleDictation } = useDictation((transcript) => {
    setInput((prev) => (prev ? prev + " " + transcript : transcript));
  });

  const {
    conversations,
    activeConversationId,
    editingConversationId,
    editingConversationTitle,
    setEditingConversationTitle,
    deleteConversationTargetId,
    setDeleteConversationTargetId,
    chatSuggestions,
    showDeleteAllModal,
    setShowDeleteAllModal,
    updateActiveMessages,
    handleNewChat,
    handleSelectChat,
    handleDeleteChat,
    confirmDeleteChat,
    startEditChatTitle,
    saveChatTitle,
    cancelChatTitleEdit,
    handleDeleteAllChats,
  } = useConversations(setMessages, messages);

  const {
    isVoiceMode,
    voiceState,
    voiceError,
    partialTranscript,
    agentStreamText,
    agentReasoning,
    reasoningHistory,
    voiceHistory,
    openVoiceChat,
    closeVoiceChat,
    stopSpeaking,
    interruptAI,
    forceListening,
    setVoiceError,
    setVoiceState,
    toggleVoiceMode,
    startRecording,
    stopRecording,
    startListening,
    stopListening,
    speakResponse,
    stopFallbackRecording,
    voiceInterruptEnabled,
    toggleVoiceInterrupt
  } = useVoiceChat({
    sessionId: activeConversationId || "default_user",
    onUserTranscript: (text) => {
      const userMsg = makeMessage({ role: "user", content: text });
      updateActiveMessages([...messagesRef.current, userMsg]);
    },
    onAgentResponse: (text) => {
      const aiMsg = makeMessage({ role: "assistant", content: text });
      updateActiveMessages([...messagesRef.current, aiMsg]);
    }
  });


  const {
    isTyping,
    editResendTarget,
    setEditResendTarget,
    resolvePendingMessage,
    handleSend: _handleSend,
    handleResend: _handleResend,
    handleClearChat: _handleClearChat,
    handleCopyMessage,
    startEditResend: _startEditResend,
    retryMessage: _retryMessage,
    copiedMessageId,
    handleStop,
  } = useChat((nextMessages) => updateActiveMessages(nextMessages), () => sessionIdRef.current, () => messagesRef.current);

  useEffect(() => {
    if (!isTyping) fetchPlannerTasks();
  }, [isTyping]);

  useEffect(() => {
    if (activeConversationId) sessionIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // When the floating bubble is clicked, Electron tells the main window to open voice chat
  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
    if (!isElectron) return;

    const handler = () => openVoiceChat();
    window.electronAPI.onOpenVoiceChat(handler);
    return () => window.electronAPI.offOpenVoiceChat(handler);
  }, [openVoiceChat]);

  // Sync voice state to the floating bubble window
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.sendVoiceState) {
      window.electronAPI.sendVoiceState(voiceState);
    }
  }, [voiceState]);

  // Derived
  const isDark = theme === "dark";
  const hasMessages = messages.length > 0;
  const hasInput = input.trim().length > 0 || files.length > 0;

  useEffect(() => {
    const isDark = theme === "dark";

    document.documentElement.classList.toggle("dark", isDark);

    localStorage.setItem("theme", theme);
  }, [theme]);

  // Wrappers that inject local refs/state into hook functions
  const handleSend = (overrides = {}) => {
    const inputToUse = overrides.input !== undefined ? overrides.input : input;
    const toolHintToUse = overrides.toolHint !== undefined
      ? (overrides.toolHint.endsWith("\n") ? overrides.toolHint : overrides.toolHint + "\n")
      : (activeTool ? `[FORCE_TOOL:${activeTool.backendKey}]\n` : "");
    const filesToUse = overrides.files !== undefined ? overrides.files : files;

    _handleSend({
      input: inputToUse,
      toolHint: toolHintToUse,
      files: filesToUse,
      editResendTarget: overrides.editResendTarget || editResendTarget,
      routineName: overrides.routineName,
      setInput: overrides.setInput || setInput,
      setFiles: overrides.setFiles || setFiles,
      textareaRef: overrides.textareaRef || textareaRef,
      setPermissionRequest,
    });
  };

  const handleClearChat = () =>
    _handleClearChat({ setFiles });

  const startEditResend = (msg) =>
    _startEditResend(msg, setInput, textareaRef);

  const handleResend = (msg) =>
    _handleResend({
      msgId: msg?.id,
      content: msg?.content,
      setPermissionRequest,
    });

  const retryMessage = (errorMsgId) =>
    _retryMessage(errorMsgId, {
      setFiles,
      textareaRef,
      setPermissionRequest,
    });

  const handleVoiceSend = async () => {
    const audioBlob = await stopRecording();
    if (!audioBlob) return;

    try {
      // Step 1: Transcribe audio
      setVoiceState("transcribing");
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const form = new FormData();
      const ext = audioBlob.type.includes("ogg") ? "ogg" : "webm";
      form.append("audio", audioBlob, `recording.${ext}`);
      form.append("session_id", sessionIdRef.current);

      const res = await fetch(`${API_BASE}/api/voice`, { method: "POST", body: form });
      const data = await res.json();

      if (data.error) {
        setVoiceState("idle");
        setIsVoiceSending(false);
        return;
      }

      const transcript = data.transcript;

      // Step 2: Show transcript as a user message in the chat
      const userMsg = makeMessage({ role: "user", content: transcript });
      const next = [...messagesRef.current, userMsg];
      updateActiveMessages(next);

      // Step 3: Send transcript to AI
      // Permission requests are handled by the normal visual modal (same as text mode).
      setVoiceState("thinking");
      setIsVoiceSending(true);

      const aiData = await sendMessage(transcript, [], null, sessionIdRef.current);

      // Step 4: Show AI response in chat
      const responseText = aiData.response || aiData.message || "";
      const aiMsg = makeMessage({ role: "assistant", content: responseText });
      updateActiveMessages([...next, aiMsg]);

      // Step 5: Speak the AI response with Piper TTS
      const cleanText = stripMarkdown(responseText);
      if (cleanText) {
        await speakResponse(cleanText);
      } else {
        setVoiceState("idle");
      }
    } catch (err) {
      console.error("Voice chat error:", err);
      setVoiceState("idle");
      setVoiceError("Something went wrong. Check your microphone and server.");
    } finally {
      setIsVoiceSending(false);
    }
  };



  // Input handlers
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "40px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // File handlers
  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (!droppedFiles.length) return;
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  // Theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Scroll
  const handleScrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
          setShowScrollToBottom(distance > 10 && el.scrollTop > 0);
          ticking = false;
        });
        ticking = true;
      }
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [messages.length, isDictating]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const isNewMessage = messages.length > lastMessagesLengthRef.current;
    lastMessagesLengthRef.current = messages.length;

    // Use requestAnimationFrame to avoid synchronous layout thrashing
    requestAnimationFrame(() => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (isNewMessage || distanceFromBottom < 120) {
        el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
      }
    });
  }, [messages]);


  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  const handleAllowPermission = async (dontAskAgain) => {
    if (!permissionRequest) return;
    const toolName = permissionRequest.toolName;
    const requestId = permissionRequest.requestId;

    setPermissionRequest(null);

    await fetch(`${API_BASE}/api/permission`, {
      method: "POST",
      body: new URLSearchParams({
        session_id: permissionRequest.sessionId || sessionIdRef.current,
        request_id: requestId, // Use cached string
        allowed: "true",
        dont_ask_again: dontAskAgain ? "true" : "false",
      }),
    });

    if (dontAskAgain && toolName) {
      const { TOOLS } = await import("../data/tools");
      const match = TOOLS.find(
        (t) => t.backendKey === toolName || t.name === toolName
      );
      const key = match ? match.backendKey : toolName;

      setAllowedTools((prev) => ({ ...prev, [key]: true }));

      // Also sync with backend
      try {
        const { toggleToolPermission } = await import("../api/ChatApi");
        await toggleToolPermission(key, true, sessionIdRef.current);
      } catch (e) {
        console.error("Failed to sync permission:", e);
      }
    }
  };

  const handleDenyPermission = async () => {
    if (!permissionRequest) return;
    const requestId = permissionRequest.requestId;

    // ✅ Clear instantly
    setPermissionRequest(null);

    try {
      await fetch(`${API_BASE}/api/permission`, {
        method: "POST",
        body: new URLSearchParams({
          session_id: sessionIdRef.current,
          request_id: requestId, // Use cached string
          allowed: "false",
        }),
      });
    } catch {
      // ignore
    }
  }

  const handleGrantFullAccess = async (durationSeconds) => {
    if (!permissionRequest) return;
    
    setPermissionRequest(null);

    try {
      await fetch(`${API_BASE}/api/permissions/grant-full-access`, {
        method: "POST",
        body: new URLSearchParams({
          session_id: permissionRequest.sessionId || sessionIdRef.current,
          duration_seconds: durationSeconds.toString(),
        }),
      });
    } catch {
      // ignore
    }
  };


  useEffect(() => {
    async function syncPermissions() {
      try {
        const data = await getToolPermissions(sessionIdRef.current);
        const backendAllowed = {};
        if (data.allowed_tools) {
          data.allowed_tools.forEach(key => { backendAllowed[key] = true; });
        }

        if (Object.keys(backendAllowed).length > 0) {
          // Backend session already has permissions (e.g. mid-session) → use those
          setAllowedTools(backendAllowed);
        } else {
          // Fresh session (server restart) — push localStorage back to backend
          const localStored = JSON.parse(localStorage.getItem("allowedTools") || "{}");
          const keysToRestore = Object.keys(localStored).filter(k => localStored[k]);
          if (keysToRestore.length > 0) {
            await fetch(`${API_BASE}/api/permissions/allow-all`, {
              method: "POST",
              body: new URLSearchParams({
                session_id: sessionIdRef.current,
                tool_names: keysToRestore.join(","),
              }),
            });
            // Keep the existing localStorage state — don't overwrite it
          }
        }
      } catch (err) {
        // ignore
      }
    }
    syncPermissions();
  }, [apiStatus, activeConversationId]);



  const handleResetPermissions = async () => {
    await fetch(`${API_BASE}/api/permission/reset`, {
      method: "POST",
      body: new URLSearchParams({ session_id: sessionIdRef.current }),
    });
    setAllowedTools({});
    localStorage.removeItem("allowedTools");
  };


  useEffect(() => {
    if (!permissionRequest) return;

    const timeout = setTimeout(() => {
      handleDenyPermission();
    }, 60000);

    return () => clearTimeout(timeout);
  }, [permissionRequest]);

  // (Removed email sent handler as it's now handled by resolvePendingMessage)
  useEffect(() => {
    // Run during both text-mode AI calls (isTyping) and voice-mode AI calls
    const isVoiceProcessing = voiceState === "thinking" || voiceState === "responding";
    if (!isTyping && !isVoiceSending && !isVoiceProcessing) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/permissions/pending?session_id=${sessionIdRef.current}`
        );
        const data = await res.json();
        if (data.has_pending && !permissionRequest) {
          setPermissionRequest({
            requestId: data.request_id,
            toolName: data.tool,
            toolArgs: data.args,
            sessionId: sessionIdRef.current,
          });
        }
      } catch { /* ignore */ }
    }, 1000);

    return () => clearInterval(poll);
  }, [isTyping, isVoiceSending, voiceState, permissionRequest]);


  return (
    <>
      <ChatLayout
      messages={messages}
      input={input}
      files={files}
      theme={theme}
      isTyping={isTyping}
      showScrollToBottom={showScrollToBottom}
      copiedMessageId={copiedMessageId}
      isSidebarOpen={isSidebarOpen}
      deleteConversationTargetId={deleteConversationTargetId}
      editingConversationId={editingConversationId}
      editingConversationTitle={editingConversationTitle}
      apiStatus={apiStatus}
      isDictating={isDictating}
      editResendTarget={editResendTarget}
      isToolSidebarOpen={isToolSidebarOpen}
      chatSuggestions={chatSuggestions}
      showDeleteAllModal={showDeleteAllModal}
      permissionRequest={permissionRequest}
      conversations={conversations}
      activeConversationId={activeConversationId}
      isDark={isDark}
      hasMessages={hasMessages}
      hasInput={hasInput}
      fileInputRef={fileInputRef}
      textareaRef={textareaRef}
      messagesContainerRef={messagesContainerRef}
      handleSend={handleSend}
      handleKeyDown={handleKeyDown}
      handleInputChange={handleInputChange}
      handleFileClick={handleFileClick}
      handleFileChange={handleFileChange}
      toggleTheme={toggleTheme}
      handleScrollToBottom={handleScrollToBottom}
      handleClearChat={handleClearChat}
      handleDragOver={handleDragOver}
      handleDrop={handleDrop}
      startEditResend={startEditResend}
      handleCopyMessage={handleCopyMessage}
      setDeleteConversationTargetId={setDeleteConversationTargetId}
      setIsSidebarOpen={setIsSidebarOpen}
      setEditingConversationTitle={setEditingConversationTitle}
      startEditChatTitle={startEditChatTitle}
      saveChatTitle={saveChatTitle}
      confirmDeleteChat={confirmDeleteChat}
      cancelChatTitleEdit={cancelChatTitleEdit}
      onToggleDictation={toggleDictation}
      setIsToolSidebarOpen={setIsToolSidebarOpen}
      setInput={setInput}
      setShowDeleteAllModal={setShowDeleteAllModal}
      handleDeleteAllChats={handleDeleteAllChats}
      handleAllowPermission={handleAllowPermission}
      handleDenyPermission={handleDenyPermission}
      handleResetPermissions={handleResetPermissions}
      handleNewChat={handleNewChat}
      handleSelectChat={handleSelectChat}
      handleDeleteChat={handleDeleteChat}
      resolvePendingMessage={resolvePendingMessage}
      allowedTools={allowedTools}
      setAllowedTools={setAllowedTools}
      retryMessage={retryMessage}
      handleResend={handleResend}
      isVoiceMode={isVoiceMode}
      voiceState={voiceState}
      voiceError={voiceError}
      setVoiceError={setVoiceError}
      toggleVoiceMode={toggleVoiceMode}
      startRecording={startRecording}
      handleVoiceSend={handleVoiceSend}
      stopSpeaking={stopSpeaking}
      isPlannerOpen={isPlannerOpen}
      setIsPlannerOpen={setIsPlannerOpen}
      plannerTasks={plannerTasks}
      fetchPlannerTasks={fetchPlannerTasks}
      activeTool={activeTool}
      setActiveTool={setActiveTool}
      handleStop={handleStop}
    />

      {/* Full-screen voice chat modal */}
      {isVoiceMode && (
        <VoiceChatModal
          voiceState={voiceState}
          partialTranscript={partialTranscript}
          agentStreamText={agentStreamText}
          agentReasoning={agentReasoning}
          reasoningHistory={reasoningHistory}
          voiceHistory={voiceHistory}
          voiceError={voiceError}
          voiceInterruptEnabled={voiceInterruptEnabled}
          toggleVoiceInterrupt={toggleVoiceInterrupt}
          onClose={closeVoiceChat}
          onStopSpeaking={interruptAI}
          onForceSpeech={forceListening}
        />
      )}

      {/* Permission Modal at root level to bypass z-index issues */}
      <ToolPermissionModal
        isDark={isDark}
        show={!!permissionRequest}
        toolName={permissionRequest?.toolName}
        toolArgs={permissionRequest?.toolArgs}
        onAllow={handleAllowPermission}
        onDeny={handleDenyPermission}
        onGrantFullAccess={handleGrantFullAccess}
      />
    </>
  );
}

export default ChatController;
