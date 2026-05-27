import { get } from "../http.js";

export function searchLocations(keyWord) {
  return get("/api/locations", { keyWord });
}

export function searchCourses(keyWord) {
  return get("/api/courses", { keyWord });
}

export function searchEvents(keyWord) {
  return get("/api/events", { keyWord });
}
