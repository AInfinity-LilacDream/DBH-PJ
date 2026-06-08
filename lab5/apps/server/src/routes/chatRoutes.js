import { Router } from "express";
import { confirmSqlWrite, streamChat } from "../controllers/chatController.js";

export const chatRoutes = Router();

chatRoutes.post("/chat", streamChat);
chatRoutes.post("/chat/sql-confirmations/:confirmationId", confirmSqlWrite);
