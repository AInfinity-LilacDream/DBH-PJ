import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAuthToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      peopleId: user.peopleId,
      roleType: user.roleType
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}
