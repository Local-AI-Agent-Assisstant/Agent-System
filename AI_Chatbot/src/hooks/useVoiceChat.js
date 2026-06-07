import { useState, useRef, useCallback, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");

/**
 * useVoiceChat — WebSocket streaming voice chat hook.
 *
 * - Live partial transcript
 * - Live agent text streaming (word by word)
 * - Voice interrupt: if user speaks during AI response, stops playback & listens
 * - Conversation history (only finalized entries)
 */
export function useVoiceChat({ sessionId = "default_user", onUserTranscript, onAgentResponse } = {}) {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceError, setVoiceError] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [agentStreamText, setAgentStreamText] = useState("");     // live word-by-word
  const [agentReasoning, setAgentReasoning] = useState([]);
  const [reasoningHistory, setReasoningHistory] = useState([]);   // past reasonings
  const [voiceHistory, setVoiceHistory] = useState([]);           // finalized entries only
  
  // Mute state
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  
  // Voice interrupt setting
  const [voiceInterruptEnabled, setVoiceInterruptEnabled] = useState(false);
  const voiceInterruptEnabledRef = useRef(false);

  // Refs
  const cbTranscriptRef = useRef(onUserTranscript);
  const cbAgentRef = useRef(onAgentResponse);
  useEffect(() => { cbTranscriptRef.current = onUserTranscript; }, [onUserTranscript]);
  useEffect(() => { cbAgentRef.current = onAgentResponse; }, [onAgentResponse]);

  const wsRef = useRef(null);
  const micCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const workletRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const playSourceRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false); // tracks if we paused TTS due to user speaking
  const agentChunksRef = useRef("");
  const agentReasoningRef = useRef([]);
  const lastUserTextRef = useRef("");  // for history dedup
  const stopRef = useRef(null);               // forward ref so start() can call stop() safely
  const playNextChunkRef = useRef(null);       // forward ref so playNextChunk can be recursive safely

  const killPlayback = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    isPausedRef.current = false;
    if (playSourceRef.current) {
      try { playSourceRef.current.pause(); } catch { /* ignore */ }
      try { playSourceRef.current.src = ""; } catch { /* ignore */ }
      playSourceRef.current = null;
    }
  }, []);

  // ── TTS Playback ──
  const playNextChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      // Add agent response to history now that speaking is done
      // Strip reasoning from history
      const fullText = agentChunksRef.current.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();
      if (fullText) {
        setVoiceHistory(prev => [...prev, {
          role: "assistant",
          text: fullText,
          timestamp: Date.now(),
        }]);
      }
      // NOTE: Do NOT flush reasoning to history here — it stays visible
      // in the live panel until the user starts a new command.
      // History commit happens in final_transcript.

      // Clear live stream text and automatically start hearing again
      setAgentStreamText("");
      agentChunksRef.current = "";

      // Go back to listening when audio finishes
      setVoiceState("listening");
      return;
    }


    isPlayingRef.current = true;
    setVoiceState("speaking");

    const chunk = audioQueueRef.current.shift();
    try {
      // By using standard HTML5 Audio, we completely bypass the Chromium Web Audio API 
      // WASAPI mixing bugs that cause the renderer to crash!
      const audioUrl = "data:audio/wav;base64," + chunk.audio;
      const audioObj = new Audio(audioUrl);
      
      audioObj.onended = () => {
        if (playNextChunkRef.current) playNextChunkRef.current();
      };
      
      audioObj.onerror = (e) => {
        console.error("HTML5 Audio playback error:", e);
        if (playNextChunkRef.current) playNextChunkRef.current();
      };

      playSourceRef.current = audioObj;
      
      const playPromise = audioObj.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("Audio playback interrupted:", err);
          if (playNextChunkRef.current) playNextChunkRef.current();
        });
      }
    } catch (err) {
      console.error("Audio setup error:", err);
      if (playNextChunkRef.current) try { playNextChunkRef.current(); } catch { /* ignore */ }
    }
  }, []);

  // ── WebSocket handler ──
  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case "vad":
        if (msg.state === "speech_start") {
          setVoiceState("speech_detected");
          setPartialTranscript("");
          
          // INSTANT INTERRUPT: Pause playback the exact moment user makes a sound
          // If it turns out to be noise, we resume on "idle". If real, we kill on "interrupt".
          if (voiceInterruptEnabledRef.current && isPlayingRef.current) {
            if (playSourceRef.current) {
              try { playSourceRef.current.pause(); } catch { /* ignore */ }
            }
            isPausedRef.current = true;
          }
        } else if (msg.state === "speech_end") {
          setVoiceState("transcribing");
        }
        break;

      case "interrupt":
        // Server detected user speaking during AI response → stop playback
        killPlayback();
        // Add whatever agent text we have so far to history
        if (agentChunksRef.current.trim()) {
          const partialAgent = agentChunksRef.current.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").replace(/\{[\s\S]*/, "").trim();
          if (partialAgent) {
            setVoiceHistory(prev => [...prev, {
              role: "assistant",
              text: partialAgent + " [interrupted]",
              timestamp: Date.now(),
            }]);
          }
        }
        if (agentReasoningRef.current.length > 0) {
          setReasoningHistory(prev => [...prev, [...agentReasoningRef.current]]);
        }
        setAgentStreamText("");
        agentChunksRef.current = "";
        setAgentReasoning([]);
        agentReasoningRef.current = [];
        setPartialTranscript("");
        setVoiceState("speech_detected");
        break;

      case "partial_transcript":
        setPartialTranscript(msg.text || "");
        setVoiceState("speech_detected");
        break;

      case "final_transcript":
        // A new user command has been finalized.
        // Force kill any old audio playing so it doesn't overlap!
        killPlayback();
        if (msg.text?.trim()) {
          lastUserTextRef.current = msg.text;
          setPartialTranscript(msg.text);
          // Add to history
          setVoiceHistory(prev => [...prev, {
            role: "user",
            text: msg.text,
            timestamp: Date.now(),
          }]);
          if (cbTranscriptRef.current) cbTranscriptRef.current(msg.text);
        }
        setVoiceState("thinking");
        // Move previous reasoning to history, then clear for fresh panel
        if (agentReasoningRef.current.length > 0) {
          setReasoningHistory(prev => [...prev, [...agentReasoningRef.current]]);
        }
        setAgentReasoning([]);
        agentReasoningRef.current = [];
        break;

      case "agent_thinking":
        setVoiceState("thinking");
        break;

      case "agent_chunk": {
        // Live streaming — append each word batch
        agentChunksRef.current += (msg.text || "");

        // Dynamically split out <think> tags for the UI (support multiple blocks)
        let fullText = agentChunksRef.current;
        const matches = [...fullText.matchAll(/<think>([\s\S]*?)(?:<\/think>|$)/gi)];
        const reasonings = matches.map(m => m[1].trim()).filter(Boolean);

        if (reasonings.length > 0) {
          // We intentionally do NOT use a Set here, so that repeated tool calls 
          // (like running a loop) stay visible in the reasoning history.
          setAgentReasoning(reasonings);
          agentReasoningRef.current = reasonings;
          fullText = fullText.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();
        }

        // Hide any raw JSON that might leak into the live text stream
        fullText = fullText.replace(/\{[\s\S]*/, "").trim();

        setAgentStreamText(fullText);

        // If we were thinking, switch to responding
        setVoiceState(prev => prev === "thinking" ? "responding" : prev);
        break;
      }

      case "agent_response":
        // Full response from server — use it as final text
        {
          const finalText = (msg.text || agentChunksRef.current).replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").replace(/\{[\s\S]*/, "").trim();
          agentChunksRef.current = finalText;
          setAgentStreamText(finalText);
          
          
          // NOTE: Do NOT flush reasoning to history here. It stays visible in the
          // live panel. History commit happens only in final_transcript.

          if (msg.reasoning) {
            setAgentReasoning([msg.reasoning]);
            agentReasoningRef.current = [msg.reasoning];
          }
          if (finalText.trim() && cbAgentRef.current) {
            cbAgentRef.current(finalText);
          }
          // Clear user's partial since their turn is done
          setPartialTranscript("");
        }
        break;

      case "tts_audio":
        audioQueueRef.current.push(msg);
        if (!isPlayingRef.current) playNextChunk();
        break;

      case "idle":
        if (isPausedRef.current) {
          // It was just noise (fan/cough). Resume the AI's speech!
          isPausedRef.current = false;
          if (playSourceRef.current) {
            try { playSourceRef.current.play(); } catch { /* ignore */ }
          }
          setVoiceState("speaking");
        } else if (!isPlayingRef.current) {
          setVoiceState("listening");
        }
        break;

      case "error":
        console.error("[Voice] Server:", msg.message);
        setVoiceError(msg.message || "Server error");
        setTimeout(() => setVoiceState("listening"), 1500);
        break;

      default:
        break;
    }
  }, [playNextChunk, killPlayback]);

  // ── Interrupt: button or voice ──
  const interruptAI = useCallback(() => {
    killPlayback();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }
    if (agentChunksRef.current.trim()) {
      const cleanHistoryText = agentChunksRef.current.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").replace(/\{[\s\S]*/, "").trim();
      if (cleanHistoryText) {
        setVoiceHistory(prev => [...prev, {
          role: "assistant",
          text: cleanHistoryText,
          timestamp: Date.now(),
        }]);
      }
    }
    if (agentReasoningRef.current.length > 0) {
      setReasoningHistory(prev => [...prev, ...agentReasoningRef.current]);
    }
    setAgentStreamText("");
    agentChunksRef.current = "";
    setAgentReasoning([]);
    agentReasoningRef.current = [];
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "force_speech" }));
    }
    setVoiceState("speech_detected");
  }, [killPlayback]);

  // ── Tell server to forcefully start listening (Click-to-talk) ──
  const forceListening = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "force_speech" }));
    }
    setVoiceState("speech_detected");
  }, []);

  // ── Toggle Voice Interrupt Setting ──
  const toggleVoiceInterrupt = useCallback((enabled) => {
    setVoiceInterruptEnabled(enabled);
    voiceInterruptEnabledRef.current = enabled;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "toggle_voice_interrupt", enabled }));
    }
  }, []);

  // ── Start ──
  const start = useCallback(async () => {
    setVoiceError("");
    setPartialTranscript("");
    setAgentStreamText("");
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    agentChunksRef.current = "";

    setVoiceState("loading");
    try {
      await fetch(`${API_BASE}/api/voice/warmup`, { method: "POST" });
    } catch (e) {
      console.warn("Warmup error", e);
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, channelCount: 1,
          echoCancellation: true, noiseSuppression: true, autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
    } catch {
      setVoiceError("Microphone access denied.");
      setVoiceState("idle");
      return false;
    }

    try {
      const ws = await new Promise((resolve, reject) => {
        const sock = new WebSocket(`${WS_BASE}/ws/voice?session_id=${sessionId}`);
        const t = setTimeout(() => { sock.close(); reject(); }, 5000);
        sock.onopen = () => { clearTimeout(t); resolve(sock); };
        sock.onerror = () => { clearTimeout(t); reject(); };
      });
      ws.onmessage = (e) => { try { handleMessage(JSON.parse(e.data)); } catch { /* ignore parse errors */ } };
      ws.onclose = () => { wsRef.current = null; };
      ws.onerror = () => { setVoiceError("Connection lost."); if (stopRef.current) stopRef.current(); };
      ws.onopen = () => {
        // Send initial interrupt preference
        ws.send(JSON.stringify({ type: "toggle_voice_interrupt", enabled: voiceInterruptEnabledRef.current }));
      };
      wsRef.current = ws;
    } catch {
      setVoiceError("Cannot connect to voice server.");
      stream.getTracks().forEach(t => t.stop());
      setVoiceState("idle");
      return false;
    }

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      micCtxRef.current = ctx;
      const srcNode = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = srcNode;

      try {
        // Create an inline AudioWorklet to replace the deprecated/crashing ScriptProcessor
        const workletCode = `
          class PCMProcessor extends AudioWorkletProcessor {
            process(inputs, outputs, parameters) {
              const input = inputs[0];
              if (input && input.length > 0) {
                const ch = input[0];
                const buf = new Int16Array(ch.length);
                for (let i = 0; i < ch.length; i++) {
                  const s = Math.max(-1, Math.min(1, ch[i]));
                  buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                // Send a COPY of the data, NOT a transferable. 
                // Transferring ArrayBuffers across threads in Electron is what causes the crash!
                this.port.postMessage(buf);
              }
              return true;
            }
          }
          registerProcessor('pcm-processor', PCMProcessor);
        `;
        
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(url);
        
        const worklet = new AudioWorkletNode(ctx, 'pcm-processor');
        worklet.port.onmessage = (e) => {
          // Don't send audio data when muted
          if (isMutedRef.current) return;
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            // e.data is the copied Int16Array. Send as Blob to prevent WebSocket native crashes
            wsRef.current.send(new Blob([e.data.buffer]));
          }
        };

        // Connect to a muted GainNode to keep the graph active without audio feedback
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0;

        srcNode.connect(worklet);
        worklet.connect(gainNode);
        gainNode.connect(ctx.destination);
        workletRef.current = worklet;

      } catch (err) {
        console.error("AudioWorklet setup failed:", err);
        throw err; // cascade to the outer catch
      }
    } catch (e) {
      console.error("AUDIO SETUP ERROR:", e);
      setVoiceError("Microphone setup failed: " + e.message);
      if (stopRef.current) stopRef.current();
      return false;
    }

    setVoiceState("listening");
    return true;
  }, [handleMessage, sessionId]);

  // ── Toggle Mute ──
  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);

    // Tell server so it can ignore any buffered audio / stop VAD
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: next ? "mute" : "unmute" }));
    }

    // Also mute/unmute the actual mic tracks as an extra guarantee
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
    }
  }, []);

  // ── Stop ──
  const stop = useCallback(() => {
    killPlayback();

    // Tell the server to fully terminate the voice session before we tear down
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ type: "stop" })); } catch { /* ignore */ }
    }

    if (workletRef.current) { try { workletRef.current.disconnect(); } catch { /* ignore */ } workletRef.current = null; }
    if (sourceNodeRef.current) { try { sourceNodeRef.current.disconnect(); } catch { /* ignore */ } sourceNodeRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    if (micCtxRef.current?.state !== "closed") { try { micCtxRef.current?.close(); } catch { /* ignore */ } micCtxRef.current = null; }
    if (wsRef.current) { try { wsRef.current.close(); } catch { /* ignore */ } wsRef.current = null; }
    setVoiceState("idle");
    setVoiceError("");
    setPartialTranscript("");
    setAgentStreamText("");
    setAgentReasoning([]);
    agentChunksRef.current = "";
    agentReasoningRef.current = [];
    // Reset mute state for next session
    setIsMuted(false);
    isMutedRef.current = false;
  }, [killPlayback]);

  // Keep refs in sync so callbacks can call these functions safely before declaration order
  useEffect(() => { stopRef.current = stop; }, [stop]);
  useEffect(() => { playNextChunkRef.current = playNextChunk; }, [playNextChunk]);

  // ── Public API ──
  const openVoiceChat = useCallback(async () => {
    setIsVoiceMode(true);
    setVoiceState("idle");
    setVoiceHistory([]);
    setReasoningHistory([]);
    await start();
    // We purposefully DO NOT close the modal on error, so the user can see the error message.
    // if (!ok) setIsVoiceMode(false);
  }, [start]);

  const closeVoiceChat = useCallback(() => {
    stop();
    setIsVoiceMode(false);
    setVoiceError("");
  }, [stop]);

  const stopSpeaking = useCallback(() => {
    interruptAI();
  }, [interruptAI]);

  useEffect(() => () => stop(), [stop]);

  return {
    isVoiceMode, voiceState, voiceError,
    partialTranscript, agentStreamText, agentReasoning, reasoningHistory, voiceHistory,
    isMuted, toggleMute,
    voiceInterruptEnabled, toggleVoiceInterrupt,
    openVoiceChat, closeVoiceChat, stopSpeaking, interruptAI,
    forceListening,
    setVoiceError, setVoiceState,
    // Legacy compat
    toggleVoiceMode: openVoiceChat,
    startRecording: () => { }, stopRecording: async () => null,
    speakResponse: async () => { }, startListening: () => { },
    stopListening: () => { }, stopFallbackRecording: async () => null,
  };
}
