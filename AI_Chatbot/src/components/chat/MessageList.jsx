import MessageBubble from "./MessageBubble";

function MessageList({
  messages,
  isDark,
  handleCopyMessage,
  copiedMessageId,
  startEditResend,
  handleSendEmail,
  handleCancelEmail,
  retryMessage,
  handleResend,
}) {

  return (
    <div className="flex flex-col gap-6">
      {messages.map((msg, index) => {

        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            prevMsg={messages[index - 1]}
            isDark={isDark}
            isUser={msg.role === "user"}
            handleCopyMessage={handleCopyMessage}
            copiedMessageId={copiedMessageId}
            startEditResend={startEditResend}
            handleSendEmail={handleSendEmail}
            handleCancelEmail={handleCancelEmail}
            retryMessage={retryMessage}
            onRetry={retryMessage}
            onResend={handleResend}
          />

        );
      })}
    </div>
  );
}

export default MessageList;
