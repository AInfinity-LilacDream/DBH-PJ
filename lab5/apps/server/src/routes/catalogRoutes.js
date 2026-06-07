import { Router } from "express";
import {
  locationQueryController,
  courseQueryController,
  eventQueryController
} from "../controllers/catalogQueryControllers.js";
import * as catalogOptionsController from "../controllers/catalogOptionsController.js";

export const catalogRoutes = Router();

catalogRoutes.get("/options/:optionKey", catalogOptionsController.list);
catalogRoutes.get("/locations", locationQueryController.search);
catalogRoutes.get("/courses", courseQueryController.search);
catalogRoutes.get("/events", eventQueryController.search);
