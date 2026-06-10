import { request } from "../http.js";

export function list(optionKey, criteria = "") {
  const normalizedCriteria = typeof criteria === "string" ? { keyword: criteria } : criteria ?? {};
  const params = new URLSearchParams();

  Object.entries(normalizedCriteria).forEach(([key, value]) => {
    const normalizedValue = typeof value === "string" ? value.trim() : value;

    if (normalizedValue) {
      params.set(key, normalizedValue);
    }
  });

  const queryString = params.toString();
  return request(`/api/admin/options/${optionKey}${queryString ? `?${queryString}` : ""}`);
}
