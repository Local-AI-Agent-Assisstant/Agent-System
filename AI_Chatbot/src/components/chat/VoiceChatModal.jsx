import React, { useState, useEffect, useRef } from "react";
import "./VoiceChatModal.css";

// ── Rich renderer for a single reasoning entry ─────────────────────────────
// Detects "Using tool_name(args)" format and applies styled rendering
function VoiceReasoningEntry({ text, isActive }) {
  const baseColor = isActive ? "#a78bfa" : "#94a3b8";
  const usingMatch = text.match(/^Using\s+([^(]+)(\(.*\))?$/);
  if (usingMatch) {
    const toolName = usingMatch[1].trim();
    const params = usingMatch[2] || null;
    return (
      <div style={{ marginBottom: "0.5rem", display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px" }}>
        <span style={{ color: baseColor }}>Using</span>
        <span style={{ color: "#34d399", fontFamily: "monospace", fontWeight: "600", fontSize: "12.5px" }}>
          {toolName}
        </span>
        {params && (
          <span style={{
            fontFamily: "monospace",
            fontSize: "11px",
            padding: "1px 6px",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.06)",
            color: "#94a3b8",
          }}>
            {params}
          </span>
        )}
      </div>
    );
  }
  return (
    <div style={{ marginBottom: "0.5rem", color: baseColor }}>{text}</div>
  );
}

/**
 * VoiceChatModal — Premium voice chat overlay.
 *
 * Layout:
 *   ┌─────────────────────────────────┐
 *   │  toggles                   [X]  │
 *   │                                 │
 *   │   status                        │
 *   │   [orb]                         │
 *   │                                 │
 *   │  ┌──────────┐  ┌─────────────┐  │
 *   │  │ main     │  │ thinking    │  │
 *   │  │ history  │  │ side panel  │  │
 *   │  │ + live   │  │             │  │
 *   │  └──────────┘  └─────────────┘  │
 *   │                                 │
 *   │        [interrupt] [close]      │
 *   └─────────────────────────────────┘
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("VoiceChatModal Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", background: '#111', color: '#ff4444', zIndex: 99999, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto' }}>
          <h2>UI Render Crashed!</h2>
          <p>Please copy this error and send it to the AI:</p>
          <pre style={{ background: '#000', padding: "20px", whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{ background: '#000', padding: "20px", whiteSpace: 'pre-wrap', marginTop: "10px" }}>{this.state.error && this.state.error.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: "20px", cursor: 'pointer' }}>Reload UI</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function VoiceChatModalInner({
  voiceState = "idle",
  partialTranscript = "",
  agentStreamText = "",
  agentReasoning = "",
  reasoningHistory = [],
  voiceHistory = [],
  voiceError = "",
  isMuted = false,
  toggleMute,
  voiceInterruptEnabled = false,
  toggleVoiceInterrupt,
  onClose,
  onStopSpeaking,
  onForceSpeech,
}) {
  const [showUserWords, setShowUserWords] = useState(true);
  const [showAIResponse, setShowAIResponse] = useState(true);
  const [showThinking, setShowThinking] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Check if we are running inside Electron
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Opens a separate floating bubble window — main window stays open
  const minimizeToBubble = () => {
    if (isElectron) window.electronAPI.createBubble();
  };

  // When the voice modal is closed/unmounted → close the floating bubble if open
  useEffect(() => {
    return () => {
      if (isElectron && window.electronAPI?.notifyVoiceClosed) {
        window.electronAPI.notifyVoiceClosed();
      }
    };
  }, []);

  const scrollRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [voiceHistory, agentStreamText, partialTranscript]);

  // Escape to close
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const statusMap = {
    idle: "Connecting...",
    loading: "Loading AI Program...",
    listening: "Ready - Ask anything or start talking",
    speech_detected: "Hearing You...",
    transcribing: "Transcribing...",
    thinking: "Thinking...",
    responding: "Speaking",
    speaking: "Speaking",
  };

  const statusLabel = isMuted ? "🔇 Microphone Muted" : (statusMap[voiceState] || "...");
  const isActive = voiceState !== "idle";
  const showThinkingPanel = showThinking;
  const canInterrupt = ["thinking", "responding", "speaking"].includes(voiceState);

  const safeHistory = Array.isArray(reasoningHistory) ? reasoningHistory.filter(Boolean) : [];
  const safeCurrent = Array.isArray(agentReasoning) ? agentReasoning.filter(Boolean) : (typeof agentReasoning === 'string' && agentReasoning ? [agentReasoning] : []);

  return (
    <div className="vcm-overlay">
      {/* Error */}
      {voiceError && <div className="vcm-error">⚠️ {voiceError}</div>}

      {/* Close */}
      <button className="vcm-close" onClick={onClose} title="Close (Esc)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>

      {/* Minimize to Bubble Button — only shown when running in Electron */}
      {isElectron && (
        <button className="vcm-bubble-btn" onClick={minimizeToBubble} title="Minimize to floating bubble">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
          Bubble
        </button>
      )}

      {/* Settings Dropdown */}
      <div className="vcm-settings-container">
        <button 
          className={`vcm-settings-btn ${showSettingsMenu ? "active" : ""}`} 
          onClick={() => setShowSettingsMenu(v => !v)}
        >
          ⚙️ Settings
        </button>
        {showSettingsMenu && (
          <div className="vcm-settings-menu">
            <label className="vcm-settings-item">
              <input type="checkbox" checked={showHistory} onChange={() => setShowHistory(v => !v)} />
              📜 Show History
            </label>
            <label className="vcm-settings-item">
              <input type="checkbox" checked={showUserWords} onChange={() => setShowUserWords(v => !v)} />
              🗣️ Show User Speech
            </label>
            <label className="vcm-settings-item">
              <input type="checkbox" checked={showAIResponse} onChange={() => setShowAIResponse(v => !v)} />
              🤖 Show AI Speech
            </label>
            <label className="vcm-settings-item">
              <input type="checkbox" checked={showThinking} onChange={() => setShowThinking(v => !v)} />
              💭 Show AI Processing
            </label>
            <label className="vcm-settings-item" style={{ borderTop: "1px solid #333", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
              <input type="checkbox" checked={voiceInterruptEnabled} onChange={(e) => toggleVoiceInterrupt?.(e.target.checked)} />
              🎙️ Voice Interruption
            </label>
          </div>
        )}
      </div>

      {/* Top: Status + Orb */}
      <div className="vcm-header">
        <div className={`vcm-status ${isActive ? "active" : ""}`}>{statusLabel}</div>
        <div
          className="vcm-orb-wrap"
          onClick={() => {
            if (voiceState === "listening" && onForceSpeech) {
              onForceSpeech();
            }
          }}
          style={{ cursor: voiceState === "listening" ? "pointer" : "default" }}
          title={voiceState === "listening" ? "Click to force listen" : ""}
        >
          <div className={`vcm-orb-ring ${isActive ? "active" : ""}`} />
          <div className={`vcm-orb ${isMuted ? "muted" : (voiceState || "idle")}`} />
        </div>
      </div>

      {/* Main content area */}
      <div className="vcm-body">
        {/* Left: conversation */}
        <div className="vcm-conversation" ref={scrollRef}>
          {/* History */}
          {showHistory && Array.isArray(voiceHistory) && voiceHistory.map((entry, i) => (
            <div key={i} className={`vcm-msg ${entry?.role || "user"}`}>
              <span className="vcm-msg-role">{entry?.role === "user" ? "You" : "AI"}</span>
              <span className="vcm-msg-text">{entry?.text || ""}</span>
            </div>
          ))}

          {/* Live: user speaking */}
          {showUserWords && partialTranscript && (
            <div className="vcm-live-block user">
              <span className="vcm-live-icon">🗣️</span>
              <span className="vcm-live-text">{partialTranscript}</span>
            </div>
          )}

          {/* Live: AI streaming response */}
          {showAIResponse && agentStreamText && (
            <div className="vcm-live-block ai">
              <span className="vcm-live-icon">🤖</span>
              <span className="vcm-live-text">{agentStreamText}</span>
              {voiceState === "responding" && <span className="vcm-cursor">▊</span>}
            </div>
          )}
        </div>

        {/* Right: thinking side panel */}
        <div className={`vcm-thinking-panel ${showThinkingPanel ? "visible" : ""}`}>
          <div className="vcm-think-header">💭 AI Processing</div>
          <div className="vcm-think-body">
            {voiceState === "thinking" && (
              <div className="vcm-think-status">
                <div className="vcm-think-dots"><span /><span /><span /></div>
                <div className="vcm-think-label">Thinking...</div>
              </div>
            )}
            
            <div className="vcm-think-stream">
              <div className="vcm-think-label">Reasoning Log:</div>
              <div className="vcm-think-preview">
                {safeHistory.map((item, i) => {
                  if (Array.isArray(item)) {
                    if (item.length === 0) return null;
                    return (
                      <div key={`hist-grp-${i}`} className="vcm-history-group" style={{ marginBottom: "0.75rem" }}>
                        <div className="vcm-history-summary" style={{ color: "#94a3b8", fontSize: "0.8rem", userSelect: "none", display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0" }}>
                          <span style={{flex: 1}}>Operation completed ({item.length} steps)</span>
                        </div>
                        <div className="vcm-history-group-content" style={{ paddingLeft: "0.5rem", borderLeft: "2px solid rgba(148, 163, 184, 0.2)", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {item.map((r, j) => (
                            <VoiceReasoningEntry key={`hist-${i}-${j}`} text={String(r)} isActive={false} />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return <VoiceReasoningEntry key={`hist-${i}`} text={String(item)} isActive={false} />;
                })}
                {safeCurrent.map((r, i) => {
                  const isActive = i === safeCurrent.length - 1 && voiceState === "thinking";
                  return (
                    <VoiceReasoningEntry key={`curr-${i}`} text={String(r)} isActive={isActive} />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="vcm-controls">
        {/* Mute button */}
        <button
          className={`vcm-mute ${isMuted ? "muted" : ""}`}
          onClick={toggleMute}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? (
            /* Mic off icon */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.34 2.18" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            /* Mic on icon */
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="1" width="6" height="11" rx="3" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        {canInterrupt && (
          <button className="vcm-interrupt" onClick={onStopSpeaking} title="Interrupt AI">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3" /></svg>
            <span>Interrupt</span>
          </button>
        )}
        <button className="vcm-end" onClick={onClose} title="End voice chat">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Interrupt hint */}
      {canInterrupt && (
        <div className="vcm-hint">💡 Start talking to interrupt, or press the button</div>
      )}
    </div>
  );
}

export default function VoiceChatModal(props) {
  return (
    <ErrorBoundary>
      <VoiceChatModalInner {...props} />
    </ErrorBoundary>
  );
}
