import { query } from "../db/pool.js";
import { createKeywordPattern } from "../utils/keyword.js";

export async function search(keyWord) {
  const keywordPattern = createKeywordPattern(keyWord);
  const params = keywordPattern ? [keywordPattern] : [];
  const whereClause = keywordPattern
    ? `
      WHERE
        l.location_name ILIKE $1
        OR l.facility_type ILIKE $1
        OR COALESCE(l.description, '') ILIKE $1
        OR COALESCE(l.open_time, '') ILIKE $1
        OR b.building_name ILIKE $1
        OR b.building_type ILIKE $1
        OR c.campus_name ILIKE $1
        OR c.address ILIKE $1
    `
    : "";

  const result = await query(
    `
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
      ORDER BY c.campus_name, b.building_name, l.location_name
    `,
    params
  );

  return result.rows;
}
