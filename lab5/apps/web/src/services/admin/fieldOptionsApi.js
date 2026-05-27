import { request } from "../http.js";

export function list(optionKey) {
  return request(`/api/admin/options/${optionKey}`);
}
