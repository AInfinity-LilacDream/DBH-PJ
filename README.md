# DBH-PJ：复旦百事通校园信息查询与智能问答系统

本仓库为 2026 春数据库设计 H Project。项目主题为“复旦百事通”，目标是面向复旦校园学习与生活场景，构建一个整合地点、课程、活动、人员、选课、授课和问答记录的一体化信息查询系统，并在关系数据库基础上提供传统筛选查询与 AI 自然语言问答两类入口。

项目成员：俞楚凡、赵敬彦。

## 项目背景

校园信息通常分散在教务系统、院系页面、活动通知、地图与生活服务页面中。学生在查询课程安排、教师信息、校园设施、讲座活动、餐饮地点或个人选课信息时，需要在多个系统之间切换，查询效率低，也难以获得统一的数据视图。

本项目以复旦校园信息为背景，使用 PostgreSQL 对校园业务实体进行规范化建模，并实现前后端查询系统。系统既支持地点、课程、活动等结构化检索，也通过 AI Agent 将自然语言问题转换为受控 SQL 查询，再对查询结果生成中文解释。

## 系统功能

- 用户认证与身份绑定：支持注册、登录、JWT 鉴权和密码哈希存储；账号表 `SysUser` 与人员表 `People` 分离，用户可绑定学生或教师身份。
- 校园信息查询：支持地点、课程、活动的多维筛选、分页查询和模糊搜索。
- 活动参与：支持活动报名、取消报名和“我的活动”查看。
- 后台管理：管理员可对校区、建筑、地点、院系、课程、活动、人员、用户、授课、选课、活动参与和查询记录进行 CRUD 管理。
- AI 智能问答：前端聊天面板调用后端 `/api/chat`，后端结合用户上下文、数据库 schema 和工具调用执行受控 SQL 查询，并以流式方式返回回答。
- 审计与安全：数据库记录 `QueryRecord`，Lab5 扩展了对话会话表；AI SQL 工具限制单条语句、禁止危险 SQL、区分普通用户与管理员权限，并对写库操作设计二次确认流程。

## 技术栈

- 数据库：PostgreSQL 16。
- 数据库实现：SQL、PL/pgSQL、主外键约束、CHECK 约束、唯一约束、组合主键、触发器、二级索引。
- 后端：Node.js、Express 4、PostgreSQL `pg`、JWT、bcryptjs、Controller / Service / Repository 分层。
- 前端：React 18、Vite 6、HeroUI、Tailwind CSS、Iconify、React Markdown、remark-gfm。
- AI：Vercel AI SDK、OpenAI provider、Tool Calling、SSE 流式响应、NL2SQL 权限校验。
- 工程组织：Lab5 使用 npm workspaces，`apps/server` 为后端，`apps/web` 为前端，`packages/shared` 预留共享代码。

## 数据库概况

数据库围绕校园信息查询场景划分为四组核心模块：

- 人员与权限模块：`People`、`Student`、`Teacher`、`SysUser`。`People` 存储人员公共属性，`Student` 和 `Teacher` 通过共享主键扩展人员身份，`SysUser` 存储登录账号、角色和认证状态。
- 空间地理模块：`Campus`、`Building`、`Location`。校区、建筑、地点通过外键形成层级结构，支持校园空间与设施查询。
- 组织、课程与活动模块：`Department`、`Course`、`Teaching`、`Enrollment`、`Event`、`EventParticipation`。其中 `Teaching`、`Enrollment` 和 `EventParticipation` 使用组合主键表达多对多关系。
- 系统日志与对话模块：`QueryRecord` 记录问答查询；Lab5 通过 `add-chat-session-tables.sql` 追加聊天会话与消息表。

主要设计特点：

- 采用第三范式拆分实体，避免在建筑、地点、课程等表中重复存储校区名、建筑名或院系名。
- 通过组合主键表达“教师-课程-学期”“学生-课程-学期”“人员-活动”等业务关系。
- 外键级联策略区分业务语义：人员扩展表随人员删除级联清理，空间层级使用 `RESTRICT` 防止误删，活动地点和主办院系等历史信息使用 `SET NULL` 保留记录。
- `CHECK` 约束限制性别、年级、职称、建筑类型、设施类型、学期格式、成绩范围和活动时间。
- 触发器 `check_person_role()` 保证同一人员不能同时注册为学生和教师。

## 运行方式

项目使用 PostgreSQL。后端默认读取 `lab5/apps/server/.env` 中的数据库配置：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dbh_pj_lab5
DB_USER=postgres
DB_PASSWORD=postgres
```

### 1. 初始化数据库

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
2. 导入 `lab4/lab4_schema_seed.sql`，重建基础表、约束、触发器和索引。
3. 导入 `lab5/scripts/allow-unbound-sysuser.sql`，兼容 Lab5 注册后再绑定人员身份的流程。
4. 导入 `lab5/scripts/add-chat-session-tables.sql`，增加 AI 对话会话和消息表。
5. 导入 `lab5/data/fudan-campus/fudan-campus-events.sql` 与 `lab5/data/fudan-syllabus/fudan-course-upsert.sql` 演示数据。

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

### 2. 启动 Lab5

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
- 登录与注册页面：http://localhost:5173/user/login

## API 入口概览

- 认证接口：`POST /api/auth/register`、`POST /api/auth/login`。
- 查询接口：`GET /api/locations`、`GET /api/courses`、`GET /api/events`、`GET /api/options/:optionKey`。
- 活动参与与账户接口：位于 `lab5/apps/server/src/routes/accountRoutes.js` 和相关 controller 中。
- AI 问答接口：`POST /api/chat`、`POST /api/chat/sessions`、`GET /api/chat/sessions`、`GET /api/chat/sessions/:sessionId/messages`。
- AI 写库确认接口：`POST /api/chat/sql-confirmations/:confirmationId`。
- 管理员接口：统一位于 `/api/admin/*`，覆盖 campuses、buildings、locations、departments、courses、events、people、users、teachings、enrollments、event-participations、query-records 等资源。

## 仓库主要文件

```text
.
├── README.md                                  项目入口说明
├── setup.sh                                   数据库初始化脚本
├── lab1/
│   ├── ER.png                                 初始 ER 图
│   └── lab1.pdf                               Lab1 设计文档
├── lab2/
│   ├── lab2.tex                               Lab2 源文档
│   └── lab2.pdf                               Lab2 文档
├── lab3/
│   ├── lab3.md                                数据库逻辑结构定稿
│   └── lab3.pdf                               Lab3 文档
├── lab4/
│   ├── lab4_schema_seed.sql                   PostgreSQL DDL、约束、触发器与索引
│   ├── check.sql                              数据库约束检查脚本
│   ├── lab4.md / lab4.tex                     Lab4 源文档
│   └── lab4.pdf                               Lab4 文档
└── lab5/
    ├── README.md                              Lab5 monorepo 说明
    ├── apps/server/                           Express 后端
    │   ├── README.md                          后端结构说明
    │   ├── .env.example                       后端环境变量示例
    │   └── src/                               路由、控制器、服务、仓储与中间件
    ├── apps/web/                              React 前端
    │   ├── README.md                          前端结构说明
    │   └── src/                               页面、组件、API client 与样式
    ├── data/                                  复旦校区、活动和课程演示数据
    ├── scripts/                               数据库增量脚本、数据生成和 AI API 测试脚本
    └── packages/shared/                       共享常量、类型和校验逻辑预留目录
```

## 推荐阅读顺序

1. 先阅读本 README，了解项目目标、功能边界、技术栈、运行方式和仓库结构。
2. 查看 `lab1/ER.png` 和 `lab1/lab1.pdf`，理解早期实体关系设计。
3. 阅读 `lab3/lab3.md`，了解最终逻辑结构、字段约束、索引和代表性查询。
4. 审阅 `lab4/lab4_schema_seed.sql` 与 `lab4/check.sql`，查看数据库实现与约束测试方式。
5. 阅读 `lab5/apps/server/README.md`、`lab5/apps/web/README.md` 和 `lab5` 源码，查看前后端与 AI 问答实现。
