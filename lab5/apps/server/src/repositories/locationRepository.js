import { query } from "../db/pool.js";
import { ensureAffected, optionalText, requireNumber, requireText } from "../utils/payload.js";

export async function listAll() {
  const result = await query(`
    SELECT
      l.location_id AS id,
      l.location_name AS "locationName",
      l.building_id AS "buildingId",
      b.building_name AS "buildingName",
      l.facility_type AS "facilityType",
      l.open_time AS "openTime",
      COALESCE(l.description, '') AS description
    FROM location l
    JOIN building b ON b.building_id = l.building_id
    ORDER BY l.location_id DESC
  `);

  return result.rows;
}

export async function create(payload) {
  const result = await query(
    `
      INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING location_id AS id
    `,
    [
      requireText(payload.locationName, "地点名称"),
      requireNumber(payload.buildingId, "所属楼宇ID"),
      requireText(payload.facilityType, "设施类型"),
      optionalText(payload.description),
      optionalText(payload.openTime)
    ]
  );

  return result.rows[0];
}

export async function update(id, payload) {
  const result = await query(
    `
      UPDATE Location
      SET location_name = $1, building_id = $2, facility_type = $3, description = $4, open_time = $5
      WHERE location_id = $6
      RETURNING location_id AS id
    `,
    [
      requireText(payload.locationName, "地点名称"),
      requireNumber(payload.buildingId, "所属楼宇ID"),
      requireText(payload.facilityType, "设施类型"),
      optionalText(payload.description),
      optionalText(payload.openTime),
      id
    ]
  );

  return ensureAffected(result);
}

export async function deleteById(id) {
  const result = await query("DELETE FROM Location WHERE location_id = $1 RETURNING location_id AS id", [id]);
  return ensureAffected(result);
}
