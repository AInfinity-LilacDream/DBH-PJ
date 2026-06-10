import { query } from "../db/pool.js";
import { createKeywordPattern } from "../utils/keyword.js";
import { queryPage } from "../utils/pagination.js";

function addFilter(filters, params, value, sql) {
  if (!value) {
    return;
  }

  params.push(value);
  filters.push(sql(params.length));
}

export async function search(filters = {}, pagination) {
  const keywordPattern = createKeywordPattern(filters.keyWord ?? filters.name);
  const params = [];
  const whereFilters = [];

  addFilter(whereFilters, params, keywordPattern, (index) => `l.location_name ILIKE $${index}`);
  addFilter(whereFilters, params, filters.campusId, (index) => `c.campus_id = $${index}`);
  addFilter(whereFilters, params, filters.buildingId, (index) => `b.building_id = $${index}`);

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(" AND ")}` : "";

  const selectSql = `
      SELECT
        l.location_id AS "locationId",
        l.location_name AS "locationName",
        l.facility_type AS "facilityType",
        l.description,
        l.open_time AS "openTime",
        b.building_id AS "buildingId",
        b.building_name AS "buildingName",
        b.building_type AS "buildingType",
        c.campus_id AS "campusId",
        c.campus_name AS "campusName",
        c.address AS "campusAddress",
        l.location_name AS title,
        l.facility_type AS tag,
        CONCAT(c.campus_name, ' / ', b.building_name) AS meta
      FROM location l
      JOIN building b ON b.building_id = l.building_id
      JOIN campus c ON c.campus_id = b.campus_id
      ${whereClause}
    `;

  if (pagination) {
    return queryPage(query, {
      selectSql,
      params,
      orderBy: '"campusName", "buildingName", "locationName"',
      pagination
    });
  }

  const result = await query(`${selectSql} ORDER BY c.campus_name, b.building_name, l.location_name`, params);
  return result.rows;
}
