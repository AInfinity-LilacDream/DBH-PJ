import { Router } from "express";
import {
  bindPeople,
  getAccount,
  listPeople,
  unbindPeople,
  updateAccount
} from "../controllers/accountController.js";

export const accountRoutes = Router();

accountRoutes.get("/account/:userId", getAccount);
accountRoutes.put("/account/:userId", updateAccount);
accountRoutes.get("/account/:userId/people", listPeople);
accountRoutes.put("/account/:userId/bind-people", bindPeople);
accountRoutes.delete("/account/:userId/bind-people", unbindPeople);
