import { Router } from "express";
import {
  bindPeople,
  getAccount,
  listPeople,
  unbindPeople,
  updateAccount
} from "../controllers/accountController.js";
import {
  listMyEvents,
  registerForEvent,
  unregisterFromEvent
} from "../controllers/eventParticipationController.js";

export const accountRoutes = Router();

accountRoutes.get("/account/:userId", getAccount);
accountRoutes.put("/account/:userId", updateAccount);
accountRoutes.get("/account/:userId/people", listPeople);
accountRoutes.put("/account/:userId/bind-people", bindPeople);
accountRoutes.delete("/account/:userId/bind-people", unbindPeople);
accountRoutes.get("/account/:userId/events", listMyEvents);
accountRoutes.post("/account/:userId/events/:eventId/register", registerForEvent);
accountRoutes.delete("/account/:userId/events/:eventId/register", unregisterFromEvent);
