const isDev = process.env.NODE_ENV !== "production";

export function errorHandler(error, _req, res, _next) {
  if (isDev) {
    console.error(error);
  }

  if (error.code === "28000" || error.code === "28P01") {
    return res.status(500).json({
      message: isDev
        ? `数据库认证失败，请检查 apps/server/.env 中的 DB_USER / DB_PASSWORD（${error.message}）`
        : "服务器内部错误"
    });
  }

  if (error.code === "3D000") {
    return res.status(500).json({
      message: isDev
        ? `数据库不存在，请先创建并导入 lab4/lab4_schema_seed.sql（${error.message}）`
        : "服务器内部错误"
    });
  }

  if (error.code === "23505") {
    return res.status(409).json({
      message: error.constraint?.includes("eventparticipation")
        ? "您已报名该活动"
        : "用户名、手机号或邮箱已存在"
    });
  }

  if (error.code === "23514") {
    return res.status(400).json({ message: "提交的数据不符合数据库约束" });
  }

  if (error.code === "23503") {
    return res.status(409).json({ message: "该数据正在被其他数据引用，不能删除或修改为无效引用" });
  }

  const status = error.status ?? 500;
  return res.status(status).json({
    message: status === 500 ? "服务器内部错误" : error.message
  });
}
