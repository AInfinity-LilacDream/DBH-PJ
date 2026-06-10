export function encodeCompositeKey(parts) {
  return parts.map((part) => encodeURIComponent(String(part))).join("__");
}

export function decodeCompositeKey(key) {
  return String(key).split("__").map((part) => decodeURIComponent(part));
}
