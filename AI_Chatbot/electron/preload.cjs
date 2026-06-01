const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Bubble lifecycle ────────────────────────────────────────────────────
  createBubble:      () => ipcRenderer.send('create-bubble'),
  closeBubble:       () => ipcRenderer.send('close-bubble'),
  bubbleClicked:     () => ipcRenderer.send('bubble-clicked'),
  notifyVoiceClosed: () => ipcRenderer.send('voice-chat-closed'),
  // ── Window focus management ──────────────────────────────────────────────
  requestMainWindowFocus: () => ipcRenderer.send('request-main-window-focus'),
  releaseMainWindowFocus: () => ipcRenderer.send('release-main-window-focus'),

  // ── Drag engine ──────────────────────────────────────────────────────────
  startDrag: (offset) => ipcRenderer.send('start-bubble-drag', offset),
  stopDrag:  ()       => ipcRenderer.send('stop-bubble-drag'),

  // ── Events from main → renderer ──────────────────────────────────────────
  // Main window: listen for open-voice-chat signal
  onOpenVoiceChat:  (cb) => ipcRenderer.on('open-voice-chat', cb),
  offOpenVoiceChat: (cb) => ipcRenderer.removeListener('open-voice-chat', cb),

  onBasketUpdate:  (cb) => ipcRenderer.on('basket-update', cb),
  offBasketUpdate: (cb) => ipcRenderer.removeListener('basket-update', cb),

  // ── Sync Voice State to Bubble ───────────────────────────────────────────
  sendVoiceState: (state) => ipcRenderer.send('voice-state-changed', state),
  onVoiceStateUpdate: (cb) => ipcRenderer.on('voice-state-update', cb),
  offVoiceStateUpdate: (cb) => ipcRenderer.removeListener('voice-state-update', cb),
});
