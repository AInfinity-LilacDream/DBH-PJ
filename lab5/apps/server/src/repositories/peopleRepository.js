import { query } from "../db/pool.js";
import { ensureAffected, optionalText, requireText } from "../utils/payload.js";

export async function listAll() {
  const result = await query(`
    SELECT
      p.people_id AS id,
      p.name,
      p.gender,
      COALESCE(p.phone, '') AS phone,
      COALESCE(p.email, '') AS email
    FROM people p
    ORDER BY p.people_id DESC
  `);

  return result.rows;
}

export async function create(payload) {
  const result = await query(
    `
      INSERT INTO People (name, gender, phone, email)
      VALUES ($1, $2, $3, $4)
      RETURNING people_id AS id
    `,
    [
      requireText(payload.name, "姓名"),
      requireText(payload.gender, "性别"),
      optionalText(payload.phone),
      optionalText(payload.email)
    ]
  );

  return result.rows[0];
}

export async function update(id, payload) {
  const result = await query(
    `
      UPDATE People
      SET name = $1, gender = $2, phone = $3, email = $4
      WHERE people_id = $5
      RETURNING people_id AS id
    `,
    [
      requireText(payload.name, "姓名"),
      requireText(payload.gender, "性别"),
      optionalText(payload.phone),
      optionalText(payload.email),
      id
    ]
  );

  await ensureAffected(result);
  return result.rows[0];
}

export async function deleteById(id) {
  const result = await query("DELETE FROM People WHERE people_id = $1 RETURNING people_id AS id", [id]);
  return ensureAffected(result);
}
