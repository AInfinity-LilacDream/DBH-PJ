export function createCrudController(repository) {
  return {
    async list(req, res, next) {
      try {
        const rows = await repository.listAll();
        res.json({ data: rows });
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
        const row = await repository.update(Number(req.params.id), req.body);
        res.json({ data: row });
      } catch (error) {
        next(error);
      }
    },

    async remove(req, res, next) {
      try {
        await repository.deleteById(Number(req.params.id));
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  };
}
