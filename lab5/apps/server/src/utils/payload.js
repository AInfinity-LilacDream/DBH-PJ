import { HttpError } from "./httpError.js";

export function optionalText(value) {
  const text = typeof value === "string" ? value.trim() : value;
  return text || null;
}

export function requireText(value, label) {
  const text = optionalText(value);

  if (!text) {
    throw new HttpError(400, `${label}不能为空`);
  }

  return text;
}

export function optionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    throw new HttpError(400, "ID 必须是整数");
  }

  return numberValue;
}

export function requireNumber(value, label) {
  const numberValue = optionalNumber(value);

  if (!numberValue) {
    throw new HttpError(400, `${label}不能为空`);
  }

  return numberValue;
}

export async function ensureAffected(result) {
  if (result.rowCount === 0) {
    throw new HttpError(404, "数据不存在");
  }

  return result.rows[0];
}
