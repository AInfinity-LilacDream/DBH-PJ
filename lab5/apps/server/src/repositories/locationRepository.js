import { query } from "../db/pool.js";
import { ensureAffected, optionalText, requireNumber, requireText } from "../utils/payload.js";
import { queryPage } from "../utils/pagination.js";

function addFilter(filters, params, value, sql) {
  if (!value) {
    return;
  }

  params.push(value);
  filters.push(sql(params.length));
}

export async function listAll(filters = {}, pagination) {
  const params = [];
  const whereFilters = [];

  addFilter(whereFilters, params, filters.campusId, (index) => `c.campus_id = $${index}`);
  addFilter(whereFilters, params, filters.buildingId, (index) => `b.building_id = $${index}`);
  addFilter(whereFilters, params, filters.locationName ? `%${String(filters.locationName).trim()}%` : "", (index) => (
    `l.location_name ILIKE $${index}`
  ));

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(" AND ")}` : "";
  const selectSql = `
    SELECT
      l.location_id AS id,
      l.location_name AS "locationName",
      l.building_id AS "buildingId",
      b.building_name AS "buildingName",
      c.campus_id AS "campusId",
      c.campus_name AS "campusName",
      l.facility_type AS "facilityType",
      l.open_time AS "openTime",
      COALESCE(l.description, '') AS description
    FROM location l
    JOIN building b ON b.building_id = l.building_id
    JOIN campus c ON c.campus_id = b.campus_id
    ${whereClause}
  `;

  if (pagination) {
    return queryPage(query, { selectSql, params, orderBy: "id DESC", pagination });
  }

  const result = await query(`${selectSql} ORDER BY l.location_id DESC`, params);
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
