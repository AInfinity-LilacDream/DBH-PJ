import { Router } from "express";
import {
  campusController,
  buildingController,
  locationController,
  departmentController,
  courseController,
  eventController,
  peopleController
} from "../controllers/adminControllers.js";
import * as fieldOptionsController from "../controllers/fieldOptionsController.js";
import { registerCrudRoutes } from "../utils/registerCrudRoutes.js";

export const adminRoutes = Router();

adminRoutes.get("/admin/options/:optionKey", fieldOptionsController.list);

const adminResources = [
  ["campuses", campusController],
  ["buildings", buildingController],
  ["locations", locationController],
  ["departments", departmentController],
  ["courses", courseController],
  ["events", eventController],
  ["people", peopleController]
];

for (const [resource, controller] of adminResources) {
  registerCrudRoutes(adminRoutes, `/admin/${resource}`, controller);
}
