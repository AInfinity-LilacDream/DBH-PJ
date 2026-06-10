import { isPagedResult, parsePagination } from "./pagination.js";

export function createSearchController(repository) {
  return {
    async search(req, res, next) {
      try {
        const result = await repository.search(req.query, parsePagination(req.query));
        if (isPagedResult(result)) {
          res.json({ data: result.rows, pagination: result.pagination });
          return;
        }

        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    }
  };
}
