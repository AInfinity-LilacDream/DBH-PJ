import { createUser, findAuthUserByUsername } from "../repositories/userRepository.js";
import { HttpError } from "../utils/httpError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAuthToken } from "../utils/token.js";

const allowedRoles = new Set(["student", "teacher", "admin"]);
const allowedGenders = new Set(["M", "F", "O"]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function validateRegisterPayload(payload) {
  const name = normalizeText(payload.name);
  const username = normalizeText(payload.username);
  const password = typeof payload.password === "string" ? payload.password : "";
  const gender = normalizeText(payload.gender || "O");
  const roleType = normalizeText(payload.roleType || "student");
  const phone = normalizeOptionalText(payload.phone);
  const email = normalizeOptionalText(payload.email);

  if (name.length < 2) {
    throw new HttpError(400, "姓名至少需要 2 个字符");
  }

  if (!/^[A-Za-z0-9_]{3,50}$/.test(username)) {
    throw new HttpError(400, "用户名需为 3-50 位字母、数字或下划线");
  }

  if (password.length < 6) {
    throw new HttpError(400, "密码至少需要 6 位");
  }

  if (!allowedGenders.has(gender)) {
    throw new HttpError(400, "性别只能是 M、F 或 O");
  }

  if (!allowedRoles.has(roleType)) {
    throw new HttpError(400, "角色只能是 student、teacher 或 admin");
  }

  return { name, username, password, gender, roleType, phone, email };
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
  const user = await createUser({ ...validated, passwordHash });

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
