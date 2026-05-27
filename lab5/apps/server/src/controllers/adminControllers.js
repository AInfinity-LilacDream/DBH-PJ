import { createCrudController } from "../utils/createCrudController.js";
import * as campusRepository from "../repositories/campusRepository.js";
import * as buildingRepository from "../repositories/buildingRepository.js";
import * as locationRepository from "../repositories/locationRepository.js";
import * as departmentRepository from "../repositories/departmentRepository.js";
import * as courseRepository from "../repositories/courseRepository.js";
import * as eventRepository from "../repositories/eventRepository.js";
import * as peopleRepository from "../repositories/peopleRepository.js";

export const campusController = createCrudController(campusRepository);
export const buildingController = createCrudController(buildingRepository);
export const locationController = createCrudController(locationRepository);
export const departmentController = createCrudController(departmentRepository);
export const courseController = createCrudController(courseRepository);
export const eventController = createCrudController(eventRepository);
export const peopleController = createCrudController(peopleRepository);
