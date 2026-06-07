export function createSearchController(repository) {
  return {
    async search(req, res, next) {
      try {
        const rows = await repository.search(req.query);
        res.json({ data: rows });
      } catch (error) {
        next(error);
      }
    }
  };
}
