import { Router } from "express";
import { confirmSqlWrite, streamChat } from "../controllers/chatController.js";
import { createSession, listMessages, listSessions } from "../controllers/chatSessionController.js";
import { requireAuth } from "../middleware/auth.js";

export const chatRoutes = Router();

chatRoutes.post("/chat/sessions", requireAuth, createSession);
chatRoutes.get("/chat/sessions", requireAuth, listSessions);
chatRoutes.get("/chat/sessions/:sessionId/messages", requireAuth, listMessages);
chatRoutes.post("/chat", streamChat);
chatRoutes.post("/chat/sql-confirmations/:confirmationId", confirmSqlWrite);
