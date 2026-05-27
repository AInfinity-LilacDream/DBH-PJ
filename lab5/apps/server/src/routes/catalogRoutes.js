import { Router } from "express";
import {
  locationQueryController,
  courseQueryController,
  eventQueryController
} from "../controllers/catalogQueryControllers.js";

export const catalogRoutes = Router();

catalogRoutes.get("/locations", locationQueryController.search);
catalogRoutes.get("/courses", courseQueryController.search);
catalogRoutes.get("/events", eventQueryController.search);
