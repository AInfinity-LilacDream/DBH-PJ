import { createPendingUser, findAuthUserByUsername } from "../repositories/userRepository.js";
import { HttpError } from "../utils/httpError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAuthToken } from "../utils/token.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateRegisterPayload(payload) {
  const username = normalizeText(payload.username);
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!/^[A-Za-z0-9_]{3,50}$/.test(username)) {
    throw new HttpError(400, "用户名需为 3-50 位字母、数字或下划线");
  }

  if (password.length < 6) {
    throw new HttpError(400, "密码至少需要 6 位");
  }

  return { username, password };
}

function createSession(user) {
  return {
    token: signAuthToken(user),
    user
  };
}

export async function register(payload) {
  const validated = validateRegisterPayload(payload);
  const existingUser = await findAuthUserByUsername(validated.username);

  if (existingUser) {
    throw new HttpError(409, "用户名已存在");
  }

  const passwordHash = await hashPassword(validated.password);
  const user = await createPendingUser({ ...validated, passwordHash });

  return createSession(user);
}

export async function login(payload) {
  const username = normalizeText(payload.username);
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!username || !password) {
    throw new HttpError(400, "请输入用户名和密码");
  }

  const user = await findAuthUserByUsername(username);

  if (!user) {
    throw new HttpError(401, "用户名或密码错误");
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    throw new HttpError(401, "用户名或密码错误");
  }

  const { passwordHash, ...safeUser } = user;
  return createSession(safeUser);
}
