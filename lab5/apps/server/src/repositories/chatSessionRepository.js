import { query } from "../db/pool.js";
import { HttpError } from "../utils/httpError.js";
import { requireNumber, requireText } from "../utils/payload.js";

const SESSION_LIST_LIMIT = 50;
const MESSAGE_ROLES = new Set(["user", "assistant", "tool", "system"]);

function normalizeLimit(limit) {
  const value = Number(limit);
  return Number.isFinite(value) && value > 0 ? Math.min(value, SESSION_LIST_LIMIT) : SESSION_LIST_LIMIT;
}

export async function create(payload) {
  const result = await query(
    `
      INSERT INTO ChatSession (user_id)
      VALUES ($1)
      RETURNING
        session_id AS id,
        user_id AS "userId",
        title,
        title_status AS "titleStatus",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [requireNumber(payload.userId, "用户")]
  );

  return result.rows[0];
}

export async function listByUser(userId, limit) {
  const result = await query(
    `
      SELECT
        cs.session_id AS id,
        cs.user_id AS "userId",
        cs.title,
        cs.title_status AS "titleStatus",
        cs.created_at AS "createdAt",
        cs.updated_at AS "updatedAt",
        COUNT(cm.message_id)::INT AS "messageCount",
        MAX(cm.created_at) AS "lastMessageAt"
      FROM ChatSession cs
      LEFT JOIN ChatMessage cm ON cm.session_id = cs.session_id
      WHERE cs.user_id = $1
      GROUP BY cs.session_id
      ORDER BY cs.updated_at DESC
      LIMIT $2
    `,
    [requireNumber(userId, "用户"), normalizeLimit(limit)]
  );

  return result.rows;
}

export async function findOwned(sessionId, userId) {
  const result = await query(
    `
      SELECT
        session_id AS id,
        user_id AS "userId",
        title,
        title_status AS "titleStatus",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ChatSession
      WHERE session_id = $1 AND user_id = $2
      LIMIT 1
    `,
    [requireNumber(sessionId, "对话"), requireNumber(userId, "用户")]
  );

  return result.rows[0] ?? null;
}

export async function touch(sessionId) {
  await query("UPDATE ChatSession SET updated_at = CURRENT_TIMESTAMP WHERE session_id = $1", [
    requireNumber(sessionId, "对话")
  ]);
}

export async function updateTitle(sessionId, title, titleStatus) {
  const result = await query(
    `
      UPDATE ChatSession
      SET title = $1, title_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $3
      RETURNING
        session_id AS id,
        title,
        title_status AS "titleStatus",
        updated_at AS "updatedAt"
    `,
    [requireText(title, "标题"), requireText(titleStatus, "标题状态"), requireNumber(sessionId, "对话")]
  );

  return result.rows[0] ?? null;
}

export async function updatePendingTitle(sessionId, title, titleStatus) {
  const result = await query(
    `
      UPDATE ChatSession
      SET title = $1, title_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $3 AND title_status = 'pending'
      RETURNING
        session_id AS id,
        title,
        title_status AS "titleStatus",
        updated_at AS "updatedAt"
    `,
    [requireText(title, "标题"), requireText(titleStatus, "标题状态"), requireNumber(sessionId, "对话")]
  );

  return result.rows[0] ?? null;
}

export async function countConversationMessages(sessionId) {
  const result = await query(
    `
      SELECT COUNT(*)::INT AS count
      FROM ChatMessage
      WHERE session_id = $1 AND role IN ('user', 'assistant')
    `,
    [requireNumber(sessionId, "对话")]
  );

  return result.rows[0]?.count ?? 0;
}

export async function getMessages(sessionId) {
  const result = await query(
    `
      SELECT
        message_id AS id,
        session_id AS "sessionId",
        role,
        content,
        COALESCE(metadata, '{}'::jsonb) AS metadata,
        created_at AS "createdAt"
      FROM ChatMessage
      WHERE session_id = $1
      ORDER BY created_at ASC, message_id ASC
    `,
    [requireNumber(sessionId, "对话")]
  );

  return result.rows;
}

export async function createMessage(payload) {
  const role = requireText(payload.role, "消息角色");

  if (!MESSAGE_ROLES.has(role)) {
    throw new HttpError(400, "消息角色无效");
  }

  const result = await query(
    `
      INSERT INTO ChatMessage (session_id, role, content, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING
        message_id AS id,
        session_id AS "sessionId",
        role,
        content,
        COALESCE(metadata, '{}'::jsonb) AS metadata,
        created_at AS "createdAt"
    `,
    [
      requireNumber(payload.sessionId, "对话"),
      role,
      requireText(payload.content, "消息内容"),
      payload.metadata ?? null
    ]
  );

  await touch(payload.sessionId);
  return result.rows[0];
}

export async function listAllForAdmin({ keyword } = {}) {
  const normalizedKeyword = String(keyword ?? "").trim();
  const params = [];
  let whereSql = "";

  if (normalizedKeyword) {
    params.push(`%${normalizedKeyword}%`);
    whereSql = "WHERE cs.title ILIKE $1 OR u.username ILIKE $1";
  }

  const result = await query(
    `
      SELECT
        cs.session_id AS id,
        cs.user_id AS "userId",
        u.username,
        cs.title,
        cs.title_status AS "titleStatus",
        cs.created_at AS "createdAt",
        cs.updated_at AS "updatedAt",
        COUNT(cm.message_id)::INT AS "messageCount"
      FROM ChatSession cs
      JOIN SysUser u ON u.user_id = cs.user_id
      LEFT JOIN ChatMessage cm ON cm.session_id = cs.session_id
      ${whereSql}
      GROUP BY cs.session_id, u.username
      ORDER BY cs.updated_at DESC
      LIMIT ${SESSION_LIST_LIMIT}
    `,
    params
  );

  return result.rows;
}

export async function getAdminDetail(sessionId) {
  const sessionResult = await query(
    `
      SELECT
        cs.session_id AS id,
        cs.user_id AS "userId",
        u.username,
        cs.title,
        cs.title_status AS "titleStatus",
        cs.created_at AS "createdAt",
        cs.updated_at AS "updatedAt"
      FROM ChatSession cs
      JOIN SysUser u ON u.user_id = cs.user_id
      WHERE cs.session_id = $1
      LIMIT 1
    `,
    [requireNumber(sessionId, "对话")]
  );

  const session = sessionResult.rows[0];
  if (!session) {
    return null;
  }

  const messages = await getMessages(sessionId);
  const queryRecordResult = await query(
    `
      SELECT
        record_id AS id,
        session_id AS "sessionId",
        message_id AS "messageId",
        raw_question AS "rawQuestion",
        query_time AS "queryTime",
        COALESCE(query_result, '') AS "queryResult"
      FROM QueryRecord
      WHERE session_id = $1
      ORDER BY query_time ASC, record_id ASC
    `,
    [requireNumber(sessionId, "对话")]
  );

  return {
    session,
    messages,
    queryRecords: queryRecordResult.rows
  };
}
