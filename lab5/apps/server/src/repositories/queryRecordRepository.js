import { query } from "../db/pool.js";
import { ensureAffected, optionalText, requireNumber, requireText } from "../utils/payload.js";
import { queryPage } from "../utils/pagination.js";

export async function listAll(_filters = {}, pagination) {
  const selectSql = `
    SELECT
      qr.record_id AS id,
      qr.user_id AS "userId",
      u.username,
      qr.session_id AS "sessionId",
      qr.message_id AS "messageId",
      qr.raw_question AS "rawQuestion",
      qr.query_time AS "queryTime",
      COALESCE(qr.query_result, '') AS "queryResult"
    FROM queryrecord qr
    JOIN sysuser u ON u.user_id = qr.user_id
  `;

  if (pagination) {
    return queryPage(query, { selectSql, orderBy: '"queryTime" DESC', pagination });
  }

  const result = await query(`${selectSql} ORDER BY qr.query_time DESC`);
  return result.rows;
}

export async function create(payload) {
  const result = await query(
    `
      INSERT INTO QueryRecord (user_id, raw_question, query_result)
      VALUES ($1, $2, $3)
      RETURNING record_id AS id
    `,
    [
      requireNumber(payload.userId, "用户"),
      requireText(payload.rawQuestion, "原始问题"),
      optionalText(payload.queryResult)
    ]
  );

  return result.rows[0];
}

export async function createWithContext(payload) {
  const result = await query(
    `
      INSERT INTO QueryRecord (user_id, session_id, message_id, raw_question, query_result)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING record_id AS id
    `,
    [
      requireNumber(payload.userId, "用户"),
      payload.sessionId ?? null,
      payload.messageId ?? null,
      requireText(payload.rawQuestion, "原始问题"),
      optionalText(payload.queryResult)
    ]
  );

  return result.rows[0];
}

export async function update(id, payload) {
  const result = await query(
    `
      UPDATE QueryRecord
      SET user_id = $1, raw_question = $2, query_result = $3
      WHERE record_id = $4
      RETURNING record_id AS id
    `,
    [
      requireNumber(payload.userId, "用户"),
      requireText(payload.rawQuestion, "原始问题"),
      optionalText(payload.queryResult),
      id
    ]
  );

  return ensureAffected(result);
}

export async function deleteById(id) {
  const result = await query("DELETE FROM QueryRecord WHERE record_id = $1 RETURNING record_id AS id", [id]);
  return ensureAffected(result);
}
