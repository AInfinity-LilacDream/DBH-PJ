import { createSearchController } from "../utils/createSearchController.js";
import * as locationQueryRepository from "../repositories/locationQueryRepository.js";
import * as courseQueryRepository from "../repositories/courseQueryRepository.js";
import * as eventQueryRepository from "../repositories/eventQueryRepository.js";

export const locationQueryController = createSearchController(locationQueryRepository);
export const courseQueryController = createSearchController(courseQueryRepository);
export const eventQueryController = createSearchController(eventQueryRepository);
