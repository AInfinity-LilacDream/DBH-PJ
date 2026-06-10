import { HttpError } from "../utils/httpError.js";
import { verifyAuthToken } from "../utils/token.js";

export function readAuthUser(req) {
  const header = req.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return null;
  }

  try {
    return verifyAuthToken(match[1]);
  } catch (_error) {
    return null;
  }
}

export function requireAuth(req, _res, next) {
  const user = readAuthUser(req);

  if (!user) {
    next(new HttpError(401, "请先登录"));
    return;
  }

  req.user = user;
  next();
}

export function requireAdmin(req, _res, next) {
  const user = readAuthUser(req);

  if (!user) {
    next(new HttpError(401, "请先登录"));
    return;
  }

  if (user.roleType !== "admin") {
    next(new HttpError(403, "当前账号不是管理员"));
    return;
  }

  req.user = user;
  next();
}
