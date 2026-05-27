import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { catalogRoutes } from "./routes/catalogRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", catalogRoutes);
app.use("/api", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "接口不存在" });
});

app.use(errorHandler);
