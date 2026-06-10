# DBH-PJ

2026 春数据库设计 H Project。

## 项目结构

```text
lab4/
  lab4_schema_seed.sql        PostgreSQL 基础 schema、约束、索引
  check.sql                   完整性约束黑盒检查脚本
lab5/
  apps/server/                Express 后端
  apps/web/                   React 前端
  scripts/                    数据库增量脚本与数据生成脚本
  data/                       演示数据 SQL
setup.sh                      数据库初始化脚本
```

## 数据库初始化

项目使用 PostgreSQL。后端默认读取 `lab5/apps/server/.env` 中的数据库配置：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dbh_pj_lab5
DB_USER=postgres
DB_PASSWORD=postgres
```

首次启动前可以先准备环境变量文件：

```bash
cp lab5/apps/server/.env.example lab5/apps/server/.env
```

然后按实际本机 PostgreSQL 账号修改 `DB_USER`、`DB_PASSWORD` 等配置，再运行：

```bash
chmod +x setup.sh
./setup.sh
```

`setup.sh` 会按顺序执行：

1. 如果目标数据库不存在，先创建数据库。
2. 导入 `lab4/lab4_schema_seed.sql`，重建基础表、约束和索引。
3. 导入 `lab5/scripts/allow-unbound-sysuser.sql`。
4. 导入 `lab5/scripts/add-chat-session-tables.sql`。
5. 导入 `lab5/data/fudan-campus/fudan-campus-events.sql` 和 `lab5/data/fudan-syllabus/fudan-course-upsert.sql` 演示数据。

如果只想建表、不导入演示数据：

```bash
SKIP_DATA=1 ./setup.sh
```

如果 `.env` 放在其他位置：

```bash
ENV_FILE=/path/to/.env ./setup.sh
```

`lab4/check.sql` 是完整性约束测试脚本，会清空业务表并写入测试数据，不建议在正常启动前执行。需要单独验证约束时，可在初始化基础 schema 后手动运行：

```bash
psql -v ON_ERROR_STOP=1 -d dbh_pj_lab5 -f lab4/check.sql
```

## 启动 Lab5

安装依赖：

```bash
cd lab5
npm install
```

分别启动后端和前端：

```bash
npm run dev:server
npm run dev:web
```

也可以在 `lab5` 目录下一次性启动所有 workspace：

```bash
npm run dev
```

默认访问地址：

- 后端健康检查：http://localhost:3001/api/health
- 前端页面：http://localhost:5173
