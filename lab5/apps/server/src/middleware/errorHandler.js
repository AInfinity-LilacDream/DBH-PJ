export function errorHandler(error, _req, res, _next) {
  if (error.code === "23505") {
    return res.status(409).json({ message: "用户名、手机号或邮箱已存在" });
  }

  if (error.code === "23514") {
    return res.status(400).json({ message: "提交的数据不符合数据库约束" });
  }

  const status = error.status ?? 500;
  return res.status(status).json({
    message: status === 500 ? "服务器内部错误" : error.message
  });
}
