export function registerCrudRoutes(router, basePath, controller) {
  router.get(basePath, controller.list);
  router.post(basePath, controller.create);
  router.put(`${basePath}/:id`, controller.update);
  router.delete(`${basePath}/:id`, controller.remove);
}
