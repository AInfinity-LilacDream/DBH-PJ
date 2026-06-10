import { get } from "../http.js";

export function listCatalogOptions(optionKey, params = {}) {
  return get(`/api/options/${optionKey}`, params);
}
