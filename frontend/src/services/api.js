function getCandidateBases() {
  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
  if (isLocalhost) {
    return ["http://localhost:8000/api", "http://127.0.0.1:8000/api"];
  }
  return ["http://127.0.0.1:8000/api", "http://localhost:8000/api"];
}

export function getAuthToken() {
  try {
    return localStorage.getItem("nova_auth_token") || null;
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem("nova_auth_token", token);
    } else {
      localStorage.removeItem("nova_auth_token");
    }
  } catch {
    // ignore
  }
}

async function request(path, options = {}) {
  let response;
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const bases = getCandidateBases();
  for (const base of bases) {
    try {
      response = await fetch(`${base}${path}`, {
        ...options,
        headers,
      });
      if (response) break;
    } catch {
      // Try next candidate base URL
    }
  }

  if (!response) {
    throw new Error("Cannot reach the backend. Start FastAPI on port 8000 and try again.");
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Request failed (${response.status}).`);
  }
  return data;
}

// --------------------------------------------------------------------------
// ASSISTANT & CONVERSATIONS
// --------------------------------------------------------------------------
export function sendCommand(command, conversationId, isVoice = false) {
  return request("/assistant", {
    method: "POST",
    body: JSON.stringify({ command, conversation_id: conversationId, is_voice: isVoice }),
  });
}

export function getConversations() {
  return request("/conversations");
}

export function getConversation(id) {
  return request(`/conversations/${encodeURIComponent(id)}`);
}

export function createConversation(title = "New conversation") {
  return request("/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function renameConversation(id, title) {
  return request(`/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function deleteConversation(id) {
  return request(`/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function clearConversation(id) {
  return request(`/conversations/${encodeURIComponent(id)}/messages`, {
    method: "DELETE",
  });
}

export function regenerateResponse(id) {
  return request(`/conversations/${encodeURIComponent(id)}/regenerate`, {
    method: "POST",
  });
}

export function clearHistory() {
  return request("/history", { method: "DELETE" });
}

// --------------------------------------------------------------------------
// REAL-TIME STREAMING ASSISTANT
// --------------------------------------------------------------------------
export async function streamAssistantCommand(
  command,
  conversationId,
  onDelta,
  onAction,
  onDone,
  onError,
  isVoice = false
) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const bases = getCandidateBases();
  let response = null;

  for (const base of bases) {
    try {
      response = await fetch(`${base}/assistant/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          command,
          conversation_id: conversationId,
          is_voice: isVoice,
        }),
      });
      if (response) break;
    } catch {
      // Try next candidate base URL
    }
  }

  if (!response) {
    onError("Cannot reach the backend. Start FastAPI on port 8000 and try again.");
    return;
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    onError(errData.detail || `Streaming failed (${response.status})`);
    return;
  }

  try {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.delta) onDelta(payload.delta);
            if (payload.type === "action") onAction(payload.result, payload.conversation_id);
            if (payload.done) onDone();
            if (payload.error) onError(payload.error);
          } catch {
            // ignore malformed chunks
          }
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err.message);
  }
}

// --------------------------------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------------------------------
export async function registerUser(email, username, password) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
  if (data.token) setAuthToken(data.token);
  return data;
}

export async function loginUser(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.token) setAuthToken(data.token);
  return data;
}

export function getCurrentUser() {
  return request("/auth/me");
}

export function logoutUser() {
  setAuthToken(null);
}

// --------------------------------------------------------------------------
// TASKS & REMINDERS (Database Persisted)
// --------------------------------------------------------------------------
export function getTasks(filters = {}) {
  const params = new URLSearchParams();
  if (filters.completed !== undefined) params.append("completed", filters.completed);
  if (filters.priority) params.append("priority", filters.priority);
  if (filters.category) params.append("category", filters.category);
  if (filters.search) params.append("search", filters.search);

  const qs = params.toString() ? `?${params.toString()}` : "";
  return request(`/tasks${qs}`);
}

export function createTask(taskData) {
  return request("/tasks", {
    method: "POST",
    body: JSON.stringify(taskData),
  });
}

export function updateTask(id, updateData) {
  return request(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updateData),
  });
}

export function deleteTask(id) {
  return request(`/tasks/${id}`, {
    method: "DELETE",
  });
}

// --------------------------------------------------------------------------
// DOCUMENTS ASSISTANT
// --------------------------------------------------------------------------
export function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/documents/upload", {
    method: "POST",
    body: formData,
  });
}

export function getDocuments() {
  return request("/documents");
}

export function getDocument(id) {
  return request(`/documents/${id}`);
}

export function deleteDocument(id) {
  return request(`/documents/${id}`, {
    method: "DELETE",
  });
}

export function summarizeDocument(id) {
  return request(`/documents/${id}/summarize`, {
    method: "POST",
  });
}

export function askDocumentQuestion(id, question) {
  return request(`/documents/${id}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

// --------------------------------------------------------------------------
// ANALYTICS & DASHBOARD
// --------------------------------------------------------------------------
export function getAnalyticsStats() {
  return request("/analytics/stats");
}

// --------------------------------------------------------------------------
// LONG-TERM MEMORY
// --------------------------------------------------------------------------
export function getMemories() {
  return request("/memory");
}

export function createMemory(key, value, category = "preference") {
  return request("/memory", {
    method: "POST",
    body: JSON.stringify({ key, value, category }),
  });
}

export function deleteMemory(id) {
  return request(`/memory/${id}`, {
    method: "DELETE",
  });
}

// --------------------------------------------------------------------------
// NOTES & WINDOWS NOTEPAD AUTOMATION
// --------------------------------------------------------------------------
export function getNotes(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return request(`/notes${query}`);
}

export function createNote(content, title = null, openInNotepad = true) {
  return request("/notes", {
    method: "POST",
    body: JSON.stringify({ content, title, open_in_notepad: openInNotepad }),
  });
}

export function updateNote(id, data) {
  return request(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteNote(id) {
  return request(`/notes/${id}`, {
    method: "DELETE",
  });
}

export function openNoteInNotepad(id) {
  return request(`/notes/${id}/open`, {
    method: "POST",
  });
}

// --------------------------------------------------------------------------
// CONTACTS DIRECTORY & WHATSAPP
// --------------------------------------------------------------------------
export function getContacts(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return request(`/contacts${query}`);
}

export function createContact(contactData) {
  return request("/contacts", {
    method: "POST",
    body: JSON.stringify(contactData),
  });
}

export function updateContact(id, updateData) {
  return request(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updateData),
  });
}

export function deleteContact(id) {
  return request(`/contacts/${id}`, {
    method: "DELETE",
  });
}
