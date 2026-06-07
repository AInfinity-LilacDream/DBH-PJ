import { createSearchController } from "../utils/createSearchController.js";
import * as locationQueryRepository from "../repositories/locationQueryRepository.js";
import * as courseQueryRepository from "../repositories/courseQueryRepository.js";
import * as eventQueryRepository from "../repositories/eventQueryRepository.js";

export const locationQueryController = createSearchController(locationQueryRepository);
export const courseQueryController = createSearchController(courseQueryRepository);

export const eventQueryController = {
  async search(req, res, next) {
    try {
      const peopleId = req.query.peopleId ? Number(req.query.peopleId) : null;
      const rows = await eventQueryRepository.search(req.query, peopleId);
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  }
};
