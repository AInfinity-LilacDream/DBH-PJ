import { Router } from "express";
import { listCourses, listEvents, listLocations } from "../controllers/catalogController.js";

export const catalogRoutes = Router();

catalogRoutes.get("/locations", listLocations);
catalogRoutes.get("/courses", listCourses);
catalogRoutes.get("/events", listEvents);
