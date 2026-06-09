import * as chatSessionRepository from "../repositories/chatSessionRepository.js";
import { HttpError } from "../utils/httpError.js";

export async function createSession(req, res, next) {
  try {
    const session = await chatSessionRepository.create({ userId: req.user.userId });
    res.status(201).json({ data: session });
  } catch (error) {
    next(error);
  }
}

export async function listSessions(req, res, next) {
  try {
    const sessions = await chatSessionRepository.listByUser(req.user.userId);
    res.json({ data: sessions });
  } catch (error) {
    next(error);
  }
}

export async function listMessages(req, res, next) {
  try {
    const session = await chatSessionRepository.findOwned(req.params.sessionId, req.user.userId);

    if (!session) {
      throw new HttpError(404, "对话不存在");
    }

    const messages = await chatSessionRepository.getMessages(session.id);
    res.json({ data: { session, messages } });
  } catch (error) {
    next(error);
  }
}

export async function listAdminSessions(req, res, next) {
  try {
    const sessions = await chatSessionRepository.listAllForAdmin(req.query);
    res.json({ data: sessions });
  } catch (error) {
    next(error);
  }
}

export async function getAdminSessionDetail(req, res, next) {
  try {
    const detail = await chatSessionRepository.getAdminDetail(req.params.sessionId);

    if (!detail) {
      throw new HttpError(404, "对话不存在");
    }

    res.json({ data: detail });
  } catch (error) {
    next(error);
  }
}
