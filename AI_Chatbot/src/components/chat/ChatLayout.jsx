import { useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import DeleteChatModal from "./DeleteChatModal";
import ToolSidebar from "./ToolSidebar";
import DeleteAllChatsModal from "./DeleteAllModals";
import EmailPreviewModal from "./EmailPreviewModal";
import PlannerSidebar from "./PlannerSidebar";

const GREETINGS = [
  "Hello! How can I assist you today?",
  "Welcome back! What are we working on today?",
  "Give AI a task..",
  "Let’s turn your ideas into action.",
  "Your AI workspace is ready.",
  "What would you like AI to help with today?",
  "Upload files, explore ideas, and get things done.",
  "Let’s make today more productive."
];

function ChatLayout({
  // state
  messages,
  input,
  files,
  setFiles,
  fileError,
  setFileError,
  theme,
  isTyping,
  showScrollToBottom,
  copiedMessageId,
  isSidebarOpen,
  editingConversationId,
  editingConversationTitle,
  apiStatus,
  isDictating,
  isToolSidebarOpen,
  chatSuggestions,
  editResendTarget,
  showDeleteAllModal,
  handleStop,

  // conversation 
  conversations,
  activeConversationId,

  // Derived
  isDark,
  hasMessages,
  hasInput,

  // Refs
  fileInputRef,
  textareaRef,
  messagesContainerRef,

  // Handlers
  handleSend,
  handleKeyDown,
  handleInputChange,
  handleFileClick,
  handleFileChange,
  toggleTheme,
  handleScrollToBottom,
  handleClearChat,
  handleDragOver,
  handleDrop,
  startEditResend,
  handleCopyMessage,
  handleResend,
  retryMessage,
  setEditingConversationTitle,
  startEditChatTitle,
  saveChatTitle,
  confirmDeleteChat,
  cancelChatTitleEdit,
  onToggleDictation,
  setIsToolSidebarOpen,
  setInput,
  setIsSidebarOpen,
  setShowDeleteAllModal,
  handleDeleteAllChats,
  handleResetPermissions,

  // convo handlers
  handleNewChat,
  handleSelectChat,
  handleDeleteChat,
  deleteConversationTargetId,
  setDeleteConversationTargetId,

  resolvePendingMessage,
  allowedTools,
  setAllowedTools,

  // Voice chat
  isVoiceMode,
  voiceState,
  voiceError,
  setVoiceError,
  toggleVoiceMode,
  startRecording,
  handleVoiceSend,
  stopSpeaking,
  partialTranscript,
  startListening,
  stopListening,

  // Planner
  isPlannerOpen,
  setIsPlannerOpen,
  plannerTasks,
  fetchPlannerTasks,

  // Tools
  activeTool,
  setActiveTool,

  // Voice Provider
  voiceProvider,
  changeProvider,
}) {
  const [showSuggestionsAnim, setShowSuggestionsAnim] = useState(false);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  useEffect(() => {
    if (chatSuggestions?.length > 0 && messages.length === 0 && !input) {
      const t = setTimeout(() => setShowSuggestionsAnim(true), 50);
      return () => clearTimeout(t);
    } else {
      setShowSuggestionsAnim(false);
    }
  }, [chatSuggestions, messages.length, input]);

  const handleSendEmail = async (data) => {
    try {
      const creds = JSON.parse(localStorage.getItem("gmail_credentials") || "{}");

      const res = await fetch("http://127.0.0.1:8000/api/send-email-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          email: creds.email,
          password: creds.password
        }),
      });

      const result = await res.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      const extraMeta = {};
      if (data.attachment) {
        // Normalise: attachment can be a single string or an array of strings
        const attachList = Array.isArray(data.attachment)
          ? data.attachment
          : [data.attachment];
        extraMeta.files = attachList.map(
          (att) => "http://127.0.0.1:8000/api/download/" + att.split(/[/\\]/).pop()
        );
      }

      resolvePendingMessage("[System Event]: The email draft was verified and sent successfully by the UI. Please write a brief, friendly confirmation acknowledging the send naturally in your own words.", extraMeta);

    } catch (err) {
      console.error("Email send failed", err);
      resolvePendingMessage(`[System Event]: The email failed to send due to an error: ${err.message}. Briefly inform the user about the failure and ask them to check their Gmail setup (they may need to re-enter their app password).`);
    }
  };

  const handleCancelEmail = () => {
    resolvePendingMessage("[System Event]: The user decided to cancel sending the email draft. Briefly acknowledge this cancellation naturally.");
  };



  return (
    <div
      className={
        "h-screen w-full relative overflow-hidden " +
        (isDark
          ? "bg-neutral-900 text-neutral-100"
          : "bg-zinc-100 text-neutral-900")
      }
    >
      <Sidebar
        isDark={isDark}
        isSidebarOpen={isSidebarOpen}
        conversations={conversations}
        activeConversationId={activeConversationId}
        editingConversationId={editingConversationId}
        editingConversationTitle={editingConversationTitle}
        setEditingConversationTitle={setEditingConversationTitle}
        handleNewChat={handleNewChat}
        handleSelectChat={handleSelectChat}
        handleDeleteChat={handleDeleteChat}
        startEditChatTitle={startEditChatTitle}
        saveChatTitle={saveChatTitle}
        cancelChatTitleEdit={cancelChatTitleEdit}
        setIsSidebarOpen={setIsSidebarOpen}
        setShowDeleteAllModal={setShowDeleteAllModal}
      />

      <ToolSidebar
        isDark={isDark}
        isToolSidebarOpen={isToolSidebarOpen}
        setIsToolSidebarOpen={setIsToolSidebarOpen}
        setInput={setInput}
        textareaRef={textareaRef}
        sessionId={activeConversationId}
        allowedTools={allowedTools}
        setAllowedTools={setAllowedTools}
        handleResetPermissions={handleResetPermissions}
      />

      <PlannerSidebar
        isDark={isDark}
        isPlannerOpen={isPlannerOpen}
        setIsPlannerOpen={setIsPlannerOpen}
        tasks={plannerTasks}
        onRefresh={fetchPlannerTasks}
      />

      {isPlannerOpen && (
        <div
          className="absolute inset-0 z-30"
          onClick={() => setIsPlannerOpen(false)}
        />
      )}


      {/* Click-outside overlay to close tool sidebar */}
      {isToolSidebarOpen && (
        <div
          className="absolute inset-0 z-30"
          onClick={() => setIsToolSidebarOpen(false)}
        />
      )}

      {/* MAIN */}
      <main className="relative z-10 h-full flex flex-col">
        {!hasMessages && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <p className="text-2xl font-semibold text-center opacity-80 pointer-events-auto">
              {greeting}
            </p>
          </div>
        )}

        <Header
          isDark={isDark}
          apiStatus={apiStatus}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleNewChat={handleNewChat}
          handleClearChat={handleClearChat}
          toggleTheme={toggleTheme}
          isToolSidebarOpen={isToolSidebarOpen}
          setIsToolSidebarOpen={setIsToolSidebarOpen}
          isPlannerOpen={isPlannerOpen}
          setIsPlannerOpen={setIsPlannerOpen}
          plannerTaskCount={plannerTasks.filter(t => t.status === "pending" && (t.scheduled_date ?? new Date().toISOString().split("T")[0]) <= new Date().toISOString().split("T")[0]).length}
          voiceProvider={voiceProvider}
          changeProvider={changeProvider}
        />

        {/* CENTER */}
        <div className="flex-1 min-h-0 flex justify-center">
          <div className="relative flex flex-col w-full max-w-3xl h-full min-h-0">
            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 px-4 flex flex-col gap-3 no-scrollbar overflow-y-auto pt-6 pb-4"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <MessageList
                messages={messages}
                isDark={isDark}
                handleCopyMessage={handleCopyMessage}
                copiedMessageId={copiedMessageId}
                startEditResend={startEditResend}
                handleSendEmail={handleSendEmail}
                handleCancelEmail={handleCancelEmail}
                retryMessage={retryMessage}
                handleResend={handleResend}
              />



            </div>

            {/* Scroll button */}
            {showScrollToBottom && (
              <button
                onClick={handleScrollToBottom}
                className={
                  "absolute right-6 bottom-24 w-9 h-9 rounded-full border shadow flex items-center justify-center text-lg " +
                  (isDark ? "bg-neutral-800" : "bg-white border-zinc-300")
                }
              >
                ↓
              </button>
            )}

            {chatSuggestions?.length > 0 &&
              messages.length === 0 &&
              !input && (
                <div
                  className={
                    "px-4 pb-2 flex justify-center transition-all duration-300 ease-out " +
                    (showSuggestionsAnim
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2")
                  }
                >

                  <div className="w-full max-w-3xl flex justify-center">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {chatSuggestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInput(prev => prev ? prev + " " + q : q);
                            textareaRef.current?.focus();
                          }}
                          className={
                            "shrink-0 text-xs px-3 py-1.5 rounded-full border transition " +
                            (isDark
                              ? "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                              : "border-zinc-300 text-zinc-700 hover:bg-zinc-200")
                          }
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}


            <ChatInput
              isDark={isDark}
              input={input}
              files={files}
              setFiles={setFiles}
              isTyping={isTyping}
              hasInput={hasInput}
              textareaRef={textareaRef}
              fileInputRef={fileInputRef}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              handleSend={handleSend}
              handleFileClick={handleFileClick}
              handleFileChange={handleFileChange}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              fileError={fileError}
              setFileError={setFileError}
              isDictating={isDictating}
              onToggleDictation={onToggleDictation}
              editResendTarget={editResendTarget}
              isVoiceMode={isVoiceMode}
              voiceState={voiceState}
              toggleVoiceMode={toggleVoiceMode}
              startRecording={startRecording}
              handleVoiceSend={handleVoiceSend}
              stopSpeaking={stopSpeaking}
              voiceError={voiceError}
              setVoiceError={setVoiceError}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              handleStop={handleStop}
              partialTranscript={partialTranscript}
              startListening={startListening}
              stopListening={stopListening}
            />

            <div className="text-center text-sm text-zinc-500 dark:text-neutral-500 -mt-1 pb-2">
              Learn more about the system in the{" "}
              <a
                href="#/docs"
                className="text-zinc-500 dark:text-neutral-500 hover:text-purple-700 dark:hover:text-purple-400 transition-colors duration-300"
              >
                documentation
              </a>.
            </div>

            <DeleteChatModal
              isDark={isDark}
              deleteConversationTargetId={deleteConversationTargetId}
              setDeleteConversationTargetId={setDeleteConversationTargetId}
              confirmDeleteChat={confirmDeleteChat}
            />

            <DeleteAllChatsModal
              isDark={isDark}
              show={showDeleteAllModal}
              onCancel={() => setShowDeleteAllModal(false)}
              confirmDeleteAllChats={handleDeleteAllChats}
            />

          </div>
        </div>
      </main>
    </div>
  );
}

export default ChatLayout;
