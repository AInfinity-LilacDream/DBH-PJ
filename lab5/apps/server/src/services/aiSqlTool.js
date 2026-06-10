import { jsonSchema, tool } from "ai";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { withTransaction } from "../db/pool.js";
import * as queryRecordRepository from "../repositories/queryRecordRepository.js";

const STATEMENT_TIMEOUT_MS = 8000;
const CONFIRMATION_TTL_MS = 5 * 60 * 1000;
const WRITE_STATEMENTS = new Set(["insert", "update", "delete"]);
const AUDIT_TABLES = ["queryrecord", "chatsession", "chatmessage"];
const pendingWriteConfirmations = new Map();
const PRIVATE_TABLES_FOR_NON_ADMIN = new Set(["sysuser", "queryrecord", "chatsession", "chatmessage"]);
const PEOPLE_PRIVATE_COLUMNS = new Set(["phone", "email"]);
const SQL_RESERVED_WORDS = new Set([
  "where",
  "join",
  "left",
  "right",
  "inner",
  "outer",
  "full",
  "cross",
  "on",
  "using",
  "group",
  "order",
  "limit",
  "offset",
  "having",
  "union",
  "intersect",
  "except"
]);
const BLOCKED_KEYWORDS = [
  "alter",
  "analyze",
  "begin",
  "call",
  "cluster",
  "commit",
  "copy",
  "create",
  "drop",
  "execute",
  "grant",
  "listen",
  "lock",
  "notify",
  "reindex",
  "reset",
  "revoke",
  "rollback",
  "set",
  "truncate",
  "vacuum"
];

export const DATABASE_SCHEMA_FOR_AI = `
PostgreSQL database schema:

General write rules:
- Omit SERIAL primary keys in INSERT unless the user explicitly provides an existing ID reference. Let PostgreSQL generate Campus.campus_id, Building.building_id, Location.location_id, People.people_id, Department.dep_id, SysUser.user_id, Course.course_id, Event.event_id, QueryRecord.record_id.
- For foreign keys, query the referenced row first and use the existing ID. Do not invent FK IDs.
- For nullable FK fields, use NULL when the referenced row is unknown and the constraint allows SET NULL.

Tables and constraints:

Campus(
  campus_id SERIAL PRIMARY KEY,
  campus_name VARCHAR(50) NOT NULL UNIQUE,
  address VARCHAR(200) NOT NULL
)

Building(
  building_id SERIAL PRIMARY KEY,
  building_name VARCHAR(100) NOT NULL,
  campus_id INT NOT NULL REFERENCES Campus(campus_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  building_type VARCHAR(20) NOT NULL CHECK building_type IN ('教学楼','宿舍楼','食堂楼','图书馆','行政楼','实验楼','体育设施','医疗卫生','其他'),
  description TEXT,
  UNIQUE(building_name, campus_id)
)

Location(
  location_id SERIAL PRIMARY KEY,
  location_name VARCHAR(100) NOT NULL,
  building_id INT NOT NULL REFERENCES Building(building_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  facility_type VARCHAR(20) NOT NULL CHECK facility_type IN ('教室','食堂','咖啡店','自习室','图书馆','实验室','运动场地','办公室','医务室','其他'),
  description TEXT,
  open_time VARCHAR(100),
  UNIQUE(location_name, building_id)
)

People(
  people_id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  gender CHAR(1) NOT NULL CHECK gender IN ('M','F','O'); use 'M' for 男, 'F' for 女, 'O' for 其他/未知,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(100) UNIQUE
)

Department(
  dep_id SERIAL PRIMARY KEY,
  dep_name VARCHAR(100) NOT NULL UNIQUE,
  contact_info VARCHAR(200),
  office_location_id INT REFERENCES Location(location_id) ON DELETE SET NULL ON UPDATE CASCADE,
  manager_id INT REFERENCES People(people_id) ON DELETE SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  description TEXT
)

Student(
  people_id INT PRIMARY KEY REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
  student_no VARCHAR(20) NOT NULL UNIQUE,
  grade VARCHAR(10) NOT NULL CHECK grade IN ('大一','大二','大三','大四','研一','研二','研三','博一','博二','博三','博四','其他'),
  major VARCHAR(100) NOT NULL,
  dep_id INT NOT NULL REFERENCES Department(dep_id) ON DELETE RESTRICT ON UPDATE CASCADE
)

Teacher(
  people_id INT PRIMARY KEY REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
  staff_no VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(20) NOT NULL CHECK title IN ('助教','讲师','副教授','教授','研究员','特聘教授','其他'),
  dept_id INT NOT NULL REFERENCES Department(dep_id) ON DELETE RESTRICT ON UPDATE CASCADE
)

SysUser(
  user_id SERIAL PRIMARY KEY,
  people_id INT NOT NULL UNIQUE REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_type VARCHAR(10) NOT NULL CHECK role_type IN ('student','teacher','admin'),
  verification_status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK verification_status IN ('pending','verified','rejected'),
  dep_id INT REFERENCES Department(dep_id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

Course(
  course_id SERIAL PRIMARY KEY,
  course_name VARCHAR(200) NOT NULL,
  dep_id INT NOT NULL REFERENCES Department(dep_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  description TEXT,
  UNIQUE(course_name, dep_id)
)

Teaching(
  teacher_id INT NOT NULL REFERENCES Teacher(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
  course_id INT NOT NULL REFERENCES Course(course_id) ON DELETE CASCADE ON UPDATE CASCADE,
  semester CHAR(11) NOT NULL CHECK semester matches 'YYYY-YYYY-1' or 'YYYY-YYYY-2', for example '2024-2025-1',
  PRIMARY KEY(teacher_id, course_id, semester)
)

Enrollment(
  student_id INT NOT NULL REFERENCES Student(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
  course_id INT NOT NULL REFERENCES Course(course_id) ON DELETE CASCADE ON UPDATE CASCADE,
  semester CHAR(11) NOT NULL CHECK semester matches 'YYYY-YYYY-1' or 'YYYY-YYYY-2',
  grade NUMERIC(5,2) CHECK grade IS NULL OR grade BETWEEN 0 AND 100,
  PRIMARY KEY(student_id, course_id, semester)
)

Event(
  event_id SERIAL PRIMARY KEY,
  event_name VARCHAR(200) NOT NULL,
  event_type VARCHAR(20) NOT NULL CHECK event_type IN ('讲座','论坛','文艺演出','体育赛事','学术交流','招聘宣讲','志愿服务','其他'),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP CHECK end_time IS NULL OR end_time > start_time,
  location_id INT REFERENCES Location(location_id) ON DELETE SET NULL ON UPDATE CASCADE,
  host_dep_id INT REFERENCES Department(dep_id) ON DELETE SET NULL ON UPDATE CASCADE,
  description TEXT
)

EventParticipation(
  participant_id INT NOT NULL REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
  event_id INT NOT NULL REFERENCES Event(event_id) ON DELETE CASCADE ON UPDATE CASCADE,
  register_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(participant_id, event_id)
)

QueryRecord(
  record_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES SysUser(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  session_id INT REFERENCES ChatSession(session_id) ON DELETE SET NULL ON UPDATE CASCADE,
  message_id INT REFERENCES ChatMessage(message_id) ON DELETE SET NULL ON UPDATE CASCADE,
  raw_question TEXT NOT NULL,
  query_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  query_result TEXT
)

ChatSession(
  session_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES SysUser(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  title VARCHAR(100) NOT NULL DEFAULT '新对话',
  title_status VARCHAR(20) NOT NULL CHECK title_status IN ('pending','generated','failed'),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

ChatMessage(
  message_id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES ChatSession(session_id) ON DELETE CASCADE ON UPDATE CASCADE,
  role VARCHAR(20) NOT NULL CHECK role IN ('user','assistant','tool','system'),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)

Trigger/business constraints:
- A person cannot be both a Student and a Teacher. Before inserting into Student, ensure the same people_id is not in Teacher. Before inserting into Teacher, ensure the same people_id is not in Student.

Useful joins:
- Teacher.people_id = People.people_id, Teacher.dept_id = Department.dep_id
- Student.people_id = People.people_id, Student.dep_id = Department.dep_id
- Course.dep_id = Department.dep_id
- Teaching.teacher_id = Teacher.people_id and Teaching.course_id = Course.course_id
- Enrollment.student_id = Student.people_id and Enrollment.course_id = Course.course_id
- Location.building_id = Building.building_id and Building.campus_id = Campus.campus_id
- Event.location_id = Location.location_id and Event.host_dep_id = Department.dep_id
- QueryRecord.session_id = ChatSession.session_id and QueryRecord.message_id = ChatMessage.message_id
`.trim();

function normalizeSql(sql) {
  const normalized = String(sql ?? "").trim();

  if (!normalized) {
    throw new Error("SQL 不能为空");
  }

  if (normalized.includes("\0")) {
    throw new Error("SQL 包含非法字符");
  }

  if (normalized.includes("--") || normalized.includes("/*") || normalized.includes("*/")) {
    throw new Error("SQL 注释已被禁用");
  }

  const withoutTrailingSemicolon = normalized.endsWith(";") ? normalized.slice(0, -1).trim() : normalized;

  if (withoutTrailingSemicolon.includes(";")) {
    throw new Error("一次只允许执行一条 SQL 语句");
  }

  return withoutTrailingSemicolon;
}

function getStatementType(sql) {
  const match = sql.match(/^\s*([a-z]+)/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function assertAllowedSql(sql) {
  const statementType = getStatementType(sql);
  const allowedStatements = ["select", "with", "insert", "update", "delete"];

  if (!allowedStatements.includes(statementType)) {
    throw new Error("只允许 SELECT/WITH/INSERT/UPDATE/DELETE");
  }

  const lowered = sql.toLowerCase();
  const blockedKeyword = BLOCKED_KEYWORDS.find((keyword) => new RegExp(`\\b${keyword}\\b`, "i").test(lowered));

  if (blockedKeyword) {
    throw new Error(`SQL 包含被禁用的关键字：${blockedKeyword.toUpperCase()}`);
  }

  if (statementType === "with" && /\b(insert|update|delete|merge)\b/i.test(sql)) {
    throw new Error("WITH 查询中不允许包含写操作");
  }

  if (WRITE_STATEMENTS.has(statementType) && !env.ai.sqlWriteEnabled) {
    throw new Error("当前环境未开启 AI 写表能力");
  }

  if (
    WRITE_STATEMENTS.has(statementType) &&
    AUDIT_TABLES.some((tableName) => new RegExp(`\\b${tableName}\\b`, "i").test(sql))
  ) {
    throw new Error("AI 不允许修改对话或查询审计记录");
  }

  return statementType;
}

function normalizeUserId(user) {
  return user?.userId ? String(user.userId) : "guest";
}

function isAdminUser(user) {
  return user?.roleType === "admin";
}

function normalizeSqlForPrivacyCheck(sql) {
  return sql
    .replace(/\$[a-z_][\w$]*\$[\s\S]*?\$[a-z_][\w$]*\$/gi, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/'(?:''|[^'])*'/g, " ")
    .replace(/"((?:[^"]|"")*)"/g, (_, identifier) => identifier.replace(/""/g, '"'))
    .toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeIdentifier(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .split(".")
    .at(-1)
    ?.replace(/^"+|"+$/g, "")
    .toLowerCase();
}

function collectTableAliases(normalizedSql) {
  const aliasesByTable = new Map();
  const tableRefPattern = /\b(?:from|join)\s+([a-z_][\w$]*(?:\s*\.\s*[a-z_][\w$]*)?)(?:\s+(?:as\s+)?([a-z_][\w$]*))?/gi;

  for (const match of normalizedSql.matchAll(tableRefPattern)) {
    const tableName = normalizeIdentifier(match[1]);
    const alias = normalizeIdentifier(match[2]);

    if (!tableName || SQL_RESERVED_WORDS.has(tableName)) {
      continue;
    }

    if (!aliasesByTable.has(tableName)) {
      aliasesByTable.set(tableName, new Set());
    }

    aliasesByTable.get(tableName).add(tableName);

    if (alias && !SQL_RESERVED_WORDS.has(alias)) {
      aliasesByTable.get(tableName).add(alias);
    }
  }

  return aliasesByTable;
}

function getAliasesForTable(aliasesByTable, tableName) {
  return [...(aliasesByTable.get(tableName) ?? new Set([tableName]))];
}

function referencesTable(normalizedSql, aliasesByTable, tableName) {
  return aliasesByTable.has(tableName) || new RegExp(`\\b${escapeRegExp(tableName)}\\b`, "i").test(normalizedSql);
}

function hasAliasWildcard(normalizedSql, aliases) {
  return aliases.some((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\s*\\.\\s*\\*`, "i").test(normalizedSql));
}

function hasUnqualifiedSelectWildcard(normalizedSql) {
  return /\bselect\s+(?:all\s+|distinct\s+)?\*/i.test(normalizedSql) || /,\s*\*/i.test(normalizedSql);
}

function hasQualifiedColumnReference(normalizedSql, aliases, column) {
  return aliases.some((alias) => {
    const escapedAlias = escapeRegExp(alias);
    const escapedColumn = escapeRegExp(column);
    return new RegExp(`\\b${escapedAlias}\\s*\\.\\s*${escapedColumn}\\b`, "i").test(normalizedSql);
  });
}

function hasUnqualifiedColumnReference(normalizedSql, column) {
  return new RegExp(`(^|[^.a-z0-9_$])${escapeRegExp(column)}\\b`, "i").test(normalizedSql);
}

function hasUnsafeSelfQueryShape(normalizedSql) {
  return /\b(or|union|intersect|except)\b/i.test(normalizedSql);
}

function isAliasRestrictedToCurrentPerson(normalizedSql, alias, idColumn, peopleId) {
  const currentPeopleId = Number(peopleId);

  if (!Number.isInteger(currentPeopleId) || hasUnsafeSelfQueryShape(normalizedSql)) {
    return false;
  }

  const idValue = String(currentPeopleId);
  const escapedAlias = escapeRegExp(alias);
  const escapedColumn = escapeRegExp(idColumn);
  const columnEqualsId = new RegExp(`\\b${escapedAlias}\\s*\\.\\s*${escapedColumn}\\s*=\\s*${idValue}\\b`, "i");
  const idEqualsColumn = new RegExp(`\\b${idValue}\\s*=\\s*${escapedAlias}\\s*\\.\\s*${escapedColumn}\\b`, "i");

  return columnEqualsId.test(normalizedSql) || idEqualsColumn.test(normalizedSql);
}

function isSingleAliasRestrictedToCurrentPerson(normalizedSql, aliases, idColumn, peopleId) {
  const currentPeopleId = Number(peopleId);

  if (aliases.length !== 1 || !Number.isInteger(currentPeopleId) || hasUnsafeSelfQueryShape(normalizedSql)) {
    return false;
  }

  return new RegExp(`\\b${escapeRegExp(idColumn)}\\s*=\\s*${currentPeopleId}\\b`, "i").test(normalizedSql);
}

function getAliasesWithQualifiedColumnReference(normalizedSql, aliases, column) {
  return aliases.filter((alias) =>
    new RegExp(`\\b${escapeRegExp(alias)}\\s*\\.\\s*${escapeRegExp(column)}\\b`, "i").test(normalizedSql)
  );
}

function getAliasesWithWildcardReference(normalizedSql, aliases) {
  return aliases.filter((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\s*\\.\\s*\\*`, "i").test(normalizedSql));
}

function areAliasesRestrictedToCurrentPerson(normalizedSql, aliases, idColumn, peopleId) {
  if (aliases.length === 0) {
    return false;
  }

  if (aliases.every((alias) => isAliasRestrictedToCurrentPerson(normalizedSql, alias, idColumn, peopleId))) {
    return true;
  }

  return isSingleAliasRestrictedToCurrentPerson(normalizedSql, aliases, idColumn, peopleId);
}

function createPrivacyDenial(message) {
  return {
    ok: false,
    denied: true,
    privacyDenied: true,
    message
  };
}

function getSqlPrivacyDenial(sql, { user, statementType }) {
  if (isAdminUser(user) || !["select", "with"].includes(statementType)) {
    return null;
  }

  const normalizedSql = normalizeSqlForPrivacyCheck(sql);
  const aliasesByTable = collectTableAliases(normalizedSql);

  for (const privateTable of PRIVATE_TABLES_FOR_NON_ADMIN) {
    if (referencesTable(normalizedSql, aliasesByTable, privateTable)) {
      return createPrivacyDenial("该 SQL 试图访问用户账号或查询记录等私密数据，已拒绝执行。");
    }
  }

  if (referencesTable(normalizedSql, aliasesByTable, "people")) {
    const peopleAliases = getAliasesForTable(aliasesByTable, "people");
    const privateColumnAliases = new Set();

    for (const column of PEOPLE_PRIVATE_COLUMNS) {
      for (const alias of getAliasesWithQualifiedColumnReference(normalizedSql, peopleAliases, column)) {
        privateColumnAliases.add(alias);
      }
    }

    for (const alias of getAliasesWithWildcardReference(normalizedSql, peopleAliases)) {
      privateColumnAliases.add(alias);
    }

    const touchesUnqualifiedPrivatePeopleColumns =
      [...PEOPLE_PRIVATE_COLUMNS].some((column) => hasUnqualifiedColumnReference(normalizedSql, column)) ||
      hasUnqualifiedSelectWildcard(normalizedSql);
    const aliasesToRestrict = touchesUnqualifiedPrivatePeopleColumns ? peopleAliases : [...privateColumnAliases];

    if (
      aliasesToRestrict.length > 0 &&
      !areAliasesRestrictedToCurrentPerson(normalizedSql, aliasesToRestrict, "people_id", user?.peopleId)
    ) {
      console.log("该 SQL 可能泄露其他人的手机号或邮箱，已拒绝执行。");
      return createPrivacyDenial("该 SQL 可能泄露其他人的手机号或邮箱，已拒绝执行。");
    }
  }

  if (referencesTable(normalizedSql, aliasesByTable, "enrollment")) {
    const enrollmentAliases = getAliasesForTable(aliasesByTable, "enrollment");
    const gradeAliases = new Set([
      ...getAliasesWithQualifiedColumnReference(normalizedSql, enrollmentAliases, "grade"),
      ...getAliasesWithWildcardReference(normalizedSql, enrollmentAliases)
    ]);
    const touchesUnqualifiedGrade =
      hasUnqualifiedColumnReference(normalizedSql, "grade") || hasUnqualifiedSelectWildcard(normalizedSql);
    const aliasesToRestrict = touchesUnqualifiedGrade ? enrollmentAliases : [...gradeAliases];

    if (
      aliasesToRestrict.length > 0 &&
      !areAliasesRestrictedToCurrentPerson(normalizedSql, aliasesToRestrict, "student_id", user?.peopleId)
    ) {
      return createPrivacyDenial("该 SQL 可能泄露其他学生的成绩，已拒绝执行。");
    }
  }

  return null;
}

function createSqlError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function pruneExpiredConfirmations() {
  const now = Date.now();

  for (const [id, confirmation] of pendingWriteConfirmations.entries()) {
    if (confirmation.expiresAt <= now) {
      pendingWriteConfirmations.delete(id);
    }
  }
}

function createWriteConfirmation({ user, sql, reason, statementType, sessionId, messageId }) {
  pruneExpiredConfirmations();

  const confirmationId = crypto.randomUUID();
  pendingWriteConfirmations.set(confirmationId, {
    userId: normalizeUserId(user),
    sessionId: sessionId ?? null,
    messageId: messageId ?? null,
    sql,
    reason,
    statementType,
    expiresAt: Date.now() + CONFIRMATION_TTL_MS
  });

  return confirmationId;
}

function consumeWriteConfirmation({ user, confirmationId, sql, statementType, confirmedConfirmationIds }) {
  pruneExpiredConfirmations();

  const confirmation = pendingWriteConfirmations.get(confirmationId);

  if (!confirmation) {
    throw createSqlError(410, "确认操作不存在或已过期，请重新发起数据库修改请求");
  }

  if (!confirmedConfirmationIds?.has(confirmationId)) {
    throw createSqlError(409, "该数据库修改尚未收到用户确认，不能执行");
  }

  if (confirmation.userId !== normalizeUserId(user)) {
    throw createSqlError(403, "确认操作不属于当前用户");
  }

  if (confirmation.sql !== sql || confirmation.statementType !== statementType) {
    throw createSqlError(409, "确认操作与待执行 SQL 不一致，已拒绝执行");
  }

  pendingWriteConfirmations.delete(confirmationId);
  return confirmation;
}

function getPendingConfirmationForUser({ user, confirmationId }) {
  pruneExpiredConfirmations();

  const confirmation = pendingWriteConfirmations.get(confirmationId);

  if (!confirmation) {
    throw createSqlError(410, "确认操作不存在或已过期，请重新发起数据库修改请求");
  }

  if (confirmation.userId !== normalizeUserId(user)) {
    throw createSqlError(403, "确认操作不属于当前用户");
  }

  return confirmation;
}

function summarizeRows(rows, maxRows) {
  return {
    rows: rows.slice(0, maxRows),
    returnedRows: Math.min(rows.length, maxRows),
    truncated: rows.length > maxRows
  };
}

export async function executeAiSql(rawSql, { userId, sessionId, messageId } = {}) {
  const sql = normalizeSql(rawSql);
  const statementType = assertAllowedSql(sql);
  const maxRows = Number.isFinite(env.ai.sqlMaxRows) && env.ai.sqlMaxRows > 0 ? env.ai.sqlMaxRows : 50;

  const execResult = await withTransaction(async (client) => {
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);

    const result = await client.query(sql);
    const isWrite = WRITE_STATEMENTS.has(statementType);
    const rowSummary = summarizeRows(result.rows ?? [], maxRows);

    let recordId = null;

    if (userId) {
      try {
        const record = await queryRecordRepository.createWithContext({
          userId,
          sessionId,
          messageId,
          rawQuestion: `[${statementType.toUpperCase()}] ${sql}`,
          queryResult: JSON.stringify({
            statementType,
            isWrite,
            rowCount: result.rowCount ?? 0,
            returnedRows: rowSummary.returnedRows,
            truncated: rowSummary.truncated
          })
        });
        recordId = record.id;
      } catch (_recordError) {
        // 记录失败不影响主流程
      }
    }

    return {
      ok: true,
      statementType,
      isWrite,
      rowCount: result.rowCount ?? 0,
      ...rowSummary,
      recordId
    };
  });

  return execResult;
}

export async function resolveAiSqlConfirmation({ user, confirmationId, approved }) {
  if (!isAdminUser(user)) {
    throw createSqlError(403, "只有管理员可以确认或拒绝 AI 数据库修改操作");
  }

  const confirmation = getPendingConfirmationForUser({ user, confirmationId });

  if (!approved) {
    pendingWriteConfirmations.delete(confirmationId);
    return {
      ok: true,
      approved: false,
      confirmationId,
      statementType: confirmation.statementType,
      reason: confirmation.reason,
      sql: confirmation.sql,
      message: "已拒绝该数据库修改操作，未执行 SQL。"
    };
  }

  const result = await executeAiSql(confirmation.sql, {
    userId: Number(confirmation.userId),
    sessionId: confirmation.sessionId,
    messageId: confirmation.messageId
  });
  pendingWriteConfirmations.delete(confirmationId);

  return {
    ok: true,
    approved: true,
    confirmationId,
    statementType: confirmation.statementType,
    reason: confirmation.reason,
    sql: confirmation.sql,
    result,
    message: "已确认并执行该数据库修改操作。"
  };
}

export function createAiSqlTool({ user, confirmedConfirmationIds = new Set(), sessionId = null, messageId = null } = {}) {
  const userId = user?.userId ? Number(user.userId) : null;

  return tool({
    description:
      "Execute one PostgreSQL statement against the campus information database. Use it when the user asks for precise data or clearly requests creating/updating/deleting data. Prefer SELECT for questions. Non-admin users can only query. Admin write operations require a previous confirmationId returned by this tool.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        sql: {
          type: "string",
          description:
            "A single PostgreSQL statement. Allowed statement types: SELECT, WITH, INSERT, UPDATE, DELETE. Do not include comments or multiple statements."
        },
        reason: {
          type: "string",
          description: "Brief reason for this SQL statement."
        },
        confirmationId: {
          type: "string",
          description:
            "Required only when retrying an admin INSERT/UPDATE/DELETE after the user explicitly confirmed the pending operation."
        }
      },
      required: ["sql", "reason"],
      additionalProperties: false
    }),
    execute: async ({ sql: rawSql, reason, confirmationId }) => {
      const sql = normalizeSql(rawSql);
      const statementType = assertAllowedSql(sql);
      const isWrite = WRITE_STATEMENTS.has(statementType);

      if (isWrite && !isAdminUser(user)) {
        return {
          ok: false,
          denied: true,
          statementType,
          isWrite,
          reason,
          sql,
          message: "当前用户不是管理员，只允许通过 AI 执行 SELECT/WITH 查询，不能修改数据库。"
        };
      }

      if (isWrite && !confirmationId) {
        const nextConfirmationId = createWriteConfirmation({ user, sql, reason, statementType, sessionId, messageId });

        return {
          ok: false,
          needsConfirmation: true,
          confirmationId: nextConfirmationId,
          statementType,
          isWrite,
          reason,
          sql,
          expiresInSeconds: Math.floor(CONFIRMATION_TTL_MS / 1000),
          message: "该操作可能修改数据库，已暂停执行，等待管理员确认或拒绝。"
        };
      }

      if (isWrite) {
        consumeWriteConfirmation({ user, confirmationId, sql, statementType, confirmedConfirmationIds });
      }

      const privacyDenial = getSqlPrivacyDenial(sql, { user, statementType });
      if (privacyDenial) {
        return {
          ...privacyDenial,
          statementType,
          isWrite,
          reason,
          sql
        };
      }

      return {
        reason,
        sql,
        confirmationId: confirmationId ?? null,
        result: await executeAiSql(sql, { userId, sessionId, messageId })
      };
    }
  });
}
