import { request } from "../http.js";

export function list(optionKey, keyword = "") {
  const params = new URLSearchParams();

  if (keyword.trim()) {
    params.set("keyword", keyword.trim());
  }

  const queryString = params.toString();
  return request(`/api/admin/options/${optionKey}${queryString ? `?${queryString}` : ""}`);
}
