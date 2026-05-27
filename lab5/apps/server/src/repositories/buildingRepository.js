import { query } from "../db/pool.js";
import { ensureAffected, optionalText, requireNumber, requireText } from "../utils/payload.js";

export async function listAll() {
  const result = await query(`
    SELECT
      b.building_id AS id,
      b.building_name AS "buildingName",
      b.campus_id AS "campusId",
      c.campus_name AS "campusName",
      b.building_type AS "buildingType",
      COALESCE(b.description, '') AS description
    FROM building b
    JOIN campus c ON c.campus_id = b.campus_id
    ORDER BY b.building_id DESC
  `);

  return result.rows;
}

export async function create(payload) {
  const result = await query(
    `
      INSERT INTO Building (building_name, campus_id, building_type, description)
      VALUES ($1, $2, $3, $4)
      RETURNING building_id AS id
    `,
    [
      requireText(payload.buildingName, "楼宇名称"),
      requireNumber(payload.campusId, "所属校区"),
      requireText(payload.buildingType, "楼宇类型"),
      optionalText(payload.description)
    ]
  );

  return result.rows[0];
}

export async function update(id, payload) {
  const result = await query(
    `
      UPDATE Building
      SET building_name = $1, campus_id = $2, building_type = $3, description = $4
      WHERE building_id = $5
      RETURNING building_id AS id
    `,
    [
      requireText(payload.buildingName, "楼宇名称"),
      requireNumber(payload.campusId, "所属校区"),
      requireText(payload.buildingType, "楼宇类型"),
      optionalText(payload.description),
      id
    ]
  );

  return ensureAffected(result);
}

export async function deleteById(id) {
  const result = await query("DELETE FROM Building WHERE building_id = $1 RETURNING building_id AS id", [id]);
  return ensureAffected(result);
}
