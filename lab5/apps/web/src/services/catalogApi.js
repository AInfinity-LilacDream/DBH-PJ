const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function get(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    const normalizedValue = typeof value === "string" ? value.trim() : value;

    if (normalizedValue) {
      url.searchParams.set(key, normalizedValue);
    }
  });

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "请求失败");
  }

  return data;
}

const endpointMap = {
  "location-query": "/api/locations",
  "course-query": "/api/courses",
  "event-query": "/api/events"
};

export function listCatalogItems(type, keyWord) {
  const endpoint = endpointMap[type];

  if (!endpoint) {
    return Promise.resolve({ data: [] });
  }

  return get(endpoint, { keyWord });
}
