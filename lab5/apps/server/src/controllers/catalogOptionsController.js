import * as fieldOptionsRepository from "../repositories/fieldOptionsRepository.js";
import { HttpError } from "../utils/httpError.js";

const publicOptionKeys = new Set([
  "campuses",
  "buildings",
  "departments",
  "teachers",
  "semesters",
  "locations"
]);

export async function list(req, res, next) {
  try {
    if (!publicOptionKeys.has(req.params.optionKey)) {
      throw new HttpError(404, "Option set not found");
    }

    const options = await fieldOptionsRepository.listByKey(req.params.optionKey, req.query);
    res.json({ data: options });
  } catch (error) {
    next(error);
  }
}
