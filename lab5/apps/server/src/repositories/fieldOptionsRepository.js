import { query } from "../db/pool.js";
import { HttpError } from "../utils/httpError.js";

const fieldOptionQueries = {
  campuses: `
    SELECT campus_id::text AS value, campus_name AS label
    FROM campus
    ORDER BY campus_name
  `,
  buildings: `
    SELECT b.building_id::text AS value,
           b.building_name || '（' || c.campus_name || '）' AS label
    FROM building b
    JOIN campus c ON c.campus_id = b.campus_id
    ORDER BY c.campus_name, b.building_name
  `,
  departments: `
    SELECT dep_id::text AS value, dep_name AS label
    FROM department
    ORDER BY dep_name
  `,
  locations: `
    SELECT l.location_id::text AS value,
           l.location_name || ' · ' || b.building_name AS label
    FROM location l
    JOIN building b ON b.building_id = l.building_id
    ORDER BY l.location_name
  `,
  people: `
    SELECT people_id::text AS value, name AS label
    FROM people
    ORDER BY name
  `
};

function getFieldOptionQuery(optionKey) {
  const sql = fieldOptionQueries[optionKey];

  if (!sql) {
    throw new HttpError(404, "字段选项不存在");
  }

  return sql;
}

export async function listByKey(optionKey) {
  const result = await query(getFieldOptionQuery(optionKey));
  return result.rows;
}
