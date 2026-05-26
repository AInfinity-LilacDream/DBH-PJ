import * as authService from "../services/authService.js";

export async function register(req, res, next) {
  try {
    const session = await authService.register(req.body);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const session = await authService.login(req.body);
    res.json(session);
  } catch (error) {
    next(error);
  }
}
