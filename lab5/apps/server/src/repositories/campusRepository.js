import { query } from "../db/pool.js";
import { ensureAffected, requireText } from "../utils/payload.js";

export async function listAll() {
  const result = await query(`
    SELECT
      campus_id AS id,
      campus_name AS "campusName",
      address
    FROM campus
    ORDER BY campus_id DESC
  `);

  return result.rows;
}

export async function create(payload) {
  const result = await query(
    `
      INSERT INTO Campus (campus_name, address)
      VALUES ($1, $2)
      RETURNING campus_id AS id
    `,
    [requireText(payload.campusName, "校区名称"), requireText(payload.address, "地址")]
  );

  return result.rows[0];
}

export async function update(id, payload) {
  const result = await query(
    `
      UPDATE Campus
      SET campus_name = $1, address = $2
      WHERE campus_id = $3
      RETURNING campus_id AS id
    `,
    [requireText(payload.campusName, "校区名称"), requireText(payload.address, "地址"), id]
  );

  return ensureAffected(result);
}

export async function deleteById(id) {
  const result = await query("DELETE FROM Campus WHERE campus_id = $1 RETURNING campus_id AS id", [id]);
  return ensureAffected(result);
}
