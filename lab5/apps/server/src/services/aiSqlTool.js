import { jsonSchema, tool } from "ai";
import { env } from "../config/env.js";
import { withTransaction } from "../db/pool.js";

const STATEMENT_TIMEOUT_MS = 8000;
const WRITE_STATEMENTS = new Set(["insert", "update", "delete"]);
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

Campus(campus_id PK, campus_name, address)
Building(building_id PK, building_name, campus_id FK -> Campus.campus_id, building_type, description)
Location(location_id PK, location_name, building_id FK -> Building.building_id, facility_type, description, open_time)
People(people_id PK, name, gender, phone, email)
Department(dep_id PK, dep_name, contact_info, office_location_id FK -> Location.location_id, manager_id FK -> People.people_id, description)
Student(people_id PK/FK -> People.people_id, student_no, grade, major, dep_id FK -> Department.dep_id)
Teacher(people_id PK/FK -> People.people_id, staff_no, title, dept_id FK -> Department.dep_id)
SysUser(user_id PK, people_id FK -> People.people_id, username, password_hash, role_type, verification_status, dep_id FK -> Department.dep_id, created_at)
Course(course_id PK, course_name, dep_id FK -> Department.dep_id, description)
Teaching(teacher_id FK -> Teacher.people_id, course_id FK -> Course.course_id, semester, PK(teacher_id, course_id, semester))
Enrollment(student_id FK -> Student.people_id, course_id FK -> Course.course_id, semester, grade, PK(student_id, course_id, semester))
Event(event_id PK, event_name, event_type, start_time, end_time, location_id FK -> Location.location_id, host_dep_id FK -> Department.dep_id, description)
EventParticipation(participant_id FK -> People.people_id, event_id FK -> Event.event_id, register_time, PK(participant_id, event_id))
QueryRecord(record_id PK, user_id FK -> SysUser.user_id, raw_question, query_time, query_result)

Useful joins:
- Teacher.people_id = People.people_id, Teacher.dept_id = Department.dep_id
- Student.people_id = People.people_id, Student.dep_id = Department.dep_id
- Course.dep_id = Department.dep_id
- Teaching.teacher_id = Teacher.people_id and Teaching.course_id = Course.course_id
- Enrollment.student_id = Student.people_id and Enrollment.course_id = Course.course_id
- Location.building_id = Building.building_id and Building.campus_id = Campus.campus_id
- Event.location_id = Location.location_id and Event.host_dep_id = Department.dep_id
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

  return statementType;
}

function summarizeRows(rows, maxRows) {
  return {
    rows: rows.slice(0, maxRows),
    returnedRows: Math.min(rows.length, maxRows),
    truncated: rows.length > maxRows
  };
}

export async function executeAiSql(rawSql) {
  const sql = normalizeSql(rawSql);
  const statementType = assertAllowedSql(sql);
  const maxRows = Number.isFinite(env.ai.sqlMaxRows) && env.ai.sqlMaxRows > 0 ? env.ai.sqlMaxRows : 50;

  return withTransaction(async (client) => {
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);

    const result = await client.query(sql);
    const isWrite = WRITE_STATEMENTS.has(statementType);
    const rowSummary = summarizeRows(result.rows ?? [], maxRows);

    return {
      ok: true,
      statementType,
      isWrite,
      rowCount: result.rowCount ?? 0,
      ...rowSummary
    };
  });
}

export const aiSqlTool = tool({
  description:
    "Execute one PostgreSQL statement against the campus information database. Use it when the user asks for precise data or clearly requests creating/updating/deleting data. Prefer SELECT for questions. Only use INSERT/UPDATE/DELETE when the user explicitly asks to change data.",
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
      }
    },
    required: ["sql", "reason"],
    additionalProperties: false
  }),
  execute: async ({ sql, reason }) => ({
    reason,
    sql,
    result: await executeAiSql(sql)
  })
});
