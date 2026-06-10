import { get } from "../http.js";

export function searchLocations(filters = {}) {
  return get("/api/locations", filters);
}

export function searchCourses(filters = {}) {
  return get("/api/courses", filters);
}

export function searchEvents(filters = {}, peopleId) {
  return get("/api/events", { ...filters, peopleId });
}
