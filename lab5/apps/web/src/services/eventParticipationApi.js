import { get, request } from "./http.js";

export function listMyEvents(userId) {
  return get(`/api/account/${userId}/events`);
}

export function registerForEvent(userId, eventId) {
  return request(`/api/account/${userId}/events/${eventId}/register`, {
    method: "POST"
  });
}

export function unregisterFromEvent(userId, eventId) {
  return request(`/api/account/${userId}/events/${eventId}/register`, {
    method: "DELETE"
  });
}
