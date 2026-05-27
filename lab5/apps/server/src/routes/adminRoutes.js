import { Router } from "express";
import {
  createRow,
  deleteRow,
  listFieldOptions,
  listRows,
  updateRow
} from "../controllers/adminController.js";

export const adminRoutes = Router();

adminRoutes.get("/admin/options/:optionKey", listFieldOptions);
adminRoutes.get("/admin/:moduleName", listRows);
adminRoutes.post("/admin/:moduleName", createRow);
adminRoutes.put("/admin/:moduleName/:id", updateRow);
adminRoutes.delete("/admin/:moduleName/:id", deleteRow);
