import { query } from "../db/pool.js";
import { ensureAffected, optionalNumber, optionalText, requireText } from "../utils/payload.js";
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

  addFilter(whereFilters, params, filters.hostDepId, (index) => `e.host_dep_id = $${index}`);
  addFilter(whereFilters, params, filters.campusId, (index) => `c.campus_id = $${index}`);
  addFilter(whereFilters, params, filters.locationId, (index) => `e.location_id = $${index}`);
  addFilter(whereFilters, params, filters.startDate, (index) => `e.start_time >= $${index}::date`);
  addFilter(whereFilters, params, filters.endDate, (index) => `e.start_time < ($${index}::date + INTERVAL '1 day')`);
  addFilter(whereFilters, params, filters.eventName ? `%${String(filters.eventName).trim()}%` : "", (index) => (
    `e.event_name ILIKE $${index}`
  ));

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(" AND ")}` : "";
  const selectSql = `
    SELECT
      e.event_id AS id,
      e.event_name AS "eventName",
      e.event_type AS "eventType",
      TO_CHAR(e.start_time, 'YYYY-MM-DD HH24:MI') AS "startTime",
      TO_CHAR(e.end_time, 'YYYY-MM-DD HH24:MI') AS "endTime",
      e.location_id AS "locationId",
      COALESCE(l.location_name, '') AS "locationName",
      c.campus_id AS "campusId",
      COALESCE(c.campus_name, '') AS "campusName",
      e.host_dep_id AS "hostDepId",
      COALESCE(d.dep_name, '') AS "hostDepartmentName",
      COALESCE(e.description, '') AS description
    FROM event e
    LEFT JOIN location l ON l.location_id = e.location_id
    LEFT JOIN building b ON b.building_id = l.building_id
    LEFT JOIN campus c ON c.campus_id = b.campus_id
    LEFT JOIN department d ON d.dep_id = e.host_dep_id
    ${whereClause}
  `;

  if (pagination) {
    return queryPage(query, { selectSql, params, orderBy: "id DESC", pagination });
  }

  const result = await query(`${selectSql} ORDER BY e.event_id DESC`, params);
  return result.rows;
}

export async function create(payload) {
  const result = await query(
    `
      INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING event_id AS id
    `,
    [
      requireText(payload.eventName, "活动名称"),
      requireText(payload.eventType, "活动类型"),
      requireText(payload.startTime, "开始时间"),
      optionalText(payload.endTime),
      optionalNumber(payload.locationId),
      optionalNumber(payload.hostDepId),
      optionalText(payload.description)
    ]
  );

  return result.rows[0];
}

export async function update(id, payload) {
  const result = await query(
    `
      UPDATE Event
      SET event_name = $1, event_type = $2, start_time = $3, end_time = $4, location_id = $5, host_dep_id = $6, description = $7
      WHERE event_id = $8
      RETURNING event_id AS id
    `,
    [
      requireText(payload.eventName, "活动名称"),
      requireText(payload.eventType, "活动类型"),
      requireText(payload.startTime, "开始时间"),
      optionalText(payload.endTime),
      optionalNumber(payload.locationId),
      optionalNumber(payload.hostDepId),
      optionalText(payload.description),
      id
    ]
  );

  return ensureAffected(result);
}

export async function deleteById(id) {
  const result = await query("DELETE FROM Event WHERE event_id = $1 RETURNING event_id AS id", [id]);
  return ensureAffected(result);
}
