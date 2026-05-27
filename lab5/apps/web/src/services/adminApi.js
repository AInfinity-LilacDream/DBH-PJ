const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "请求失败");
  }

  return data;
}

export function listAdminRows(moduleName) {
  return request(`/api/admin/${moduleName}`);
}

export function listAdminFieldOptions(optionKey) {
  return request(`/api/admin/options/${optionKey}`);
}

export function createAdminRow(moduleName, payload) {
  return request(`/api/admin/${moduleName}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateAdminRow(moduleName, id, payload) {
  return request(`/api/admin/${moduleName}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteAdminRow(moduleName, id) {
  return request(`/api/admin/${moduleName}/${id}`, {
    method: "DELETE"
  });
}
