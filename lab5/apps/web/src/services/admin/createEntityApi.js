import { request } from "../http.js";

export function createEntityApi(basePath) {
  return {
    list() {
      return request(basePath);
    },
    create(payload) {
      return request(basePath, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    update(id, payload) {
      return request(`${basePath}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    remove(id) {
      return request(`${basePath}/${id}`, {
        method: "DELETE"
      });
    }
  };
}
