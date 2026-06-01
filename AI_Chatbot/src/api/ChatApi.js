const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Sends a chat message to the backend. Automatically routes to the correct 
 * endpoint based on whether files are attached.
 * 
 * @param {string} message - The plaintext message from the user.
 * @param {File[]} [files=[]] - Optional array of File objects to attach.
 * @param {Function} [onEvent=null] - Optional callback for streaming events (SSE).
 * @returns {Promise<{response: string, tool: string|null, files: any[]}>} The AI's full response.
 * @throws {Error} If the backend request fails.
 */
export async function sendMessage(message, files = [], onEvent = null, sessionId = "default_user", history = [], signal = null) {

  // CASE 1: text-only message → use streaming SSE endpoint
  if (!files || files.length === 0) {
    const formData = new FormData();
    const creds = JSON.parse(localStorage.getItem("gmail_credentials") || "{}");
    formData.append("message", message);
    formData.append("email", creds.email || "");
    formData.append("password", "");  // password is never stored in localStorage
    formData.append("session_id", sessionId);
    formData.append("history", JSON.stringify(history));

    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      body: formData,
      signal,
    });

    if (!res.ok) throw new Error("Backend chat error");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE spec: events are separated by double newlines
        const events = buffer.split("\n\n");
        buffer = events.pop(); // last element may be incomplete
        for (const eventBlock of events) {
          for (const line of eventBlock.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "done") {
                finalResult = event.data;
              } else if (onEvent) {
                await Promise.resolve(onEvent(event.type, event.data));
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        // Cleanly aborted — return a special marker
        return { aborted: true };
      }
      throw err;
    }

    if (finalResult?.error) {
      return { error: true, message: finalResult.message ?? "An unknown error occurred." };
    }
    return {
      response: finalResult?.response ?? "",
      tool: finalResult?.tool ?? null,
      files: finalResult?.files ?? [],
      sources: finalResult?.sources ?? [],
      email_preview: finalResult?.email_preview ?? null,
    };
  }

  // CASE 2: message with files
  const form = new FormData();
  const creds = JSON.parse(localStorage.getItem("gmail_credentials") || "{}");
  form.append("instruction", message || "");
  form.append("email", creds.email || "");
  form.append("password", "");  // password is never stored in localStorage
  form.append("session_id", sessionId);
  form.append("history", JSON.stringify(history));
  files.forEach((file) => form.append("file", file));

  const res = await fetch(`${API_BASE}/api/file`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error("Backend file upload error");

  const data = await res.json();
  if (data?.error) {
    return { error: true, message: data.message ?? "An unknown error occurred." };
  }
  return {
    response: data.response,
    tool: data.tool || null,
    files: data.files || [],
    sources: data.sources || [],
    email_preview: data.email_preview || null,
  };
}

/**
 * Fetches the currently selected AI model from the backend.
 * 
 * @returns {Promise<{model: string}>} Object containing the current model identifier.
 */
export async function getModel() {
  const res = await fetch(`${API_BASE}/api/model`);
  if (!res.ok) throw new Error("Failed to get model");
  return res.json();
}

/**
 * Sets the active AI model on the backend.
 * 
 * @param {string} model - The model identifier to set (e.g., "qwen2.5:7b").
 * @returns {Promise<any>} The server response.
 */
export async function setModel(model) {
  try {
    const form = new FormData();
    form.append("model", model);

    const res = await fetch(`${API_BASE}/api/model`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) throw new Error("Failed to set model");

    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Fetches the available TTS voices from the backend.
 * 
 * @returns {Promise<{voices: string[], active: string}>} Object containing voices and active voice.
 */
export async function getVoices() {
  const res = await fetch(`${API_BASE}/api/voices`);
  if (!res.ok) throw new Error("Failed to get voices");
  return res.json();
}

/**
 * Sets the active TTS voice on the backend.
 * 
 * @param {string} voice - The voice identifier to set.
 * @returns {Promise<any>} The server response.
 */
export async function setVoice(voice) {
  try {
    const form = new FormData();
    form.append("voice", voice);

    const res = await fetch(`${API_BASE}/api/voices/set`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) throw new Error("Failed to set voice");

    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}



export async function toggleToolPermission(toolName, allowed, sessionId = "default_user") {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("tool_name", toolName);
  form.append("allowed", allowed ? "true" : "false");

  const res = await fetch(`${API_BASE}/api/permissions/toggle`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to toggle permission");
  return res.json();
}

export async function getToolPermissions(sessionId = "default_user") {
  const res = await fetch(`${API_BASE}/api/permissions?session_id=${sessionId}`);
  if (!res.ok) throw new Error("Failed to get permissions");
  return res.json();
}


/**
 * Sends text to the Piper TTS backend and returns an audio Blob.
 *
 * @param {string} text - The text to convert to speech.
 * @returns {Promise<Blob>} A .wav audio blob ready to play.
 */
export async function requestTTS(text) {
  const form = new FormData();
  form.append("text", text);

  const res = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error("TTS request failed");

  return await res.blob(); // Returns a binary audio Blob
}

/**
 * Fetches all saved routines from the backend.
 * 
 * @returns {Promise<{ok: boolean, routines: Record<string, {description: string, steps: any[]}>}>}
 */
export async function getRoutines() {
  const res = await fetch(`${API_BASE}/api/routines`);
  if (!res.ok) throw new Error("Failed to fetch routines");
  return res.json();
}

/**
 * Deletes a routine by name.
 * 
 * @param {string} name - The name of the routine to delete.
 * @returns {Promise<{ok: boolean}>}
 */
export async function deleteRoutine(name) {
  const res = await fetch(`${API_BASE}/api/routines/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete routine");
  return res.json();
}

/**
 * Updates the custom execution prompt for a routine.
 * 
 * @param {string} name - The name of the routine.
 * @param {string} prompt - The new custom prompt text.
 * @returns {Promise<{ok: boolean}>}
 */
export async function updateRoutinePrompt(name, prompt) {
  const form = new FormData();
  form.append("prompt", prompt);
  const res = await fetch(`${API_BASE}/api/routines/${encodeURIComponent(name)}/prompt`, {
    method: "PATCH",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to update routine prompt");
  return res.json();
}

