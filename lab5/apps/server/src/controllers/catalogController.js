import * as catalogRepository from "../repositories/catalogRepository.js";

export async function listLocations(req, res, next) {
  try {
    const locations = await catalogRepository.listLocations(req.query.keyWord);
    res.json({ data: locations });
  } catch (error) {
    next(error);
  }
}

export async function listCourses(req, res, next) {
  try {
    const courses = await catalogRepository.listCourses(req.query.keyWord);
    res.json({ data: courses });
  } catch (error) {
    next(error);
  }
}

export async function listEvents(req, res, next) {
  try {
    const events = await catalogRepository.listEvents(req.query.keyWord);
    res.json({ data: events });
  } catch (error) {
    next(error);
  }
}
