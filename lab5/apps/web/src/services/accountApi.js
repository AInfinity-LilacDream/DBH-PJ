import { get, request } from "./http.js";

export function getAccount(userId) {
  return get(`/api/account/${userId}`);
}

export function updateAccount(userId, payload) {
  return request(`/api/account/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function listBindablePeople(userId, params) {
  return get(`/api/account/${userId}/people`, params);
}

export function bindPeople(userId, peopleId) {
  return request(`/api/account/${userId}/bind-people`, {
    method: "PUT",
    body: JSON.stringify({ peopleId })
  });
}

export function unbindPeople(userId) {
  return request(`/api/account/${userId}/bind-people`, {
    method: "DELETE"
  });
}
