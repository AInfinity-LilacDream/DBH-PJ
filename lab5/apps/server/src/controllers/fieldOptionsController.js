import * as fieldOptionsRepository from "../repositories/fieldOptionsRepository.js";

export async function list(req, res, next) {
  try {
    const options = await fieldOptionsRepository.listByKey(req.params.optionKey, req.query);
    res.json({ data: options });
  } catch (error) {
    next(error);
  }
}
