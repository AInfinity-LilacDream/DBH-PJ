import { Router } from "express";
import { streamChat } from "../controllers/chatController.js";

export const chatRoutes = Router();

chatRoutes.post("/chat", streamChat);
