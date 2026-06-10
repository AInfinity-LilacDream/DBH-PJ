import { isPagedResult, parsePagination } from "./pagination.js";

export function createCrudController(repository) {
  return {
    async list(req, res, next) {
      try {
        const result = await repository.listAll(req.query, parsePagination(req.query));
        if (isPagedResult(result)) {
          res.json({ data: result.rows, pagination: result.pagination });
          return;
        }

        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const row = await repository.create(req.body);
        res.status(201).json({ data: row });
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        const row = await repository.update(req.params.id, req.body);
        res.json({ data: row });
      } catch (error) {
        next(error);
      }
    },

    async remove(req, res, next) {
      try {
        await repository.deleteById(req.params.id);
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  };
}
