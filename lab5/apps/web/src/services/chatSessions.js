import { request } from "./http.js";

export function createChatSession() {
  return request("/api/chat/sessions", {
    method: "POST"
  });
}

export function listChatSessions() {
  return request("/api/chat/sessions");
}

export function getChatSessionMessages(sessionId) {
  return request(`/api/chat/sessions/${sessionId}/messages`);
}

export function listAdminChatSessions(params = {}) {
  const normalizedParams = typeof params === "string" ? { keyword: params } : params;
  const queryParams = new URLSearchParams();

  Object.entries(normalizedParams ?? {}).forEach(([key, value]) => {
    const normalizedValue = typeof value === "string" ? value.trim() : value;

    if (normalizedValue) {
      queryParams.set(key, normalizedValue);
    }
  });

  const queryString = queryParams.toString();
  return request(`/api/admin/chat-sessions${queryString ? `?${queryString}` : ""}`);
}

export function getAdminChatSessionDetail(sessionId) {
  return request(`/api/admin/chat-sessions/${sessionId}`);
}
