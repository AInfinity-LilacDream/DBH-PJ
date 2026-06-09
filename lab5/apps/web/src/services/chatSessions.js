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

export function listAdminChatSessions(keyword = "") {
  const query = keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : "";
  return request(`/api/admin/chat-sessions${query}`);
}

export function getAdminChatSessionDetail(sessionId) {
  return request(`/api/admin/chat-sessions/${sessionId}`);
}
