import { query } from "../db/pool.js";
import { HttpError } from "../utils/httpError.js";

const fieldOptionQueries = {
  campuses: `
    SELECT campus_id::text AS value, campus_name AS label
    FROM campus
  `,
  buildings: `
    SELECT b.building_id::text AS value,
           b.building_name || '（' || c.campus_name || '）' AS label
    FROM building b
    JOIN campus c ON c.campus_id = b.campus_id
  `,
  departments: `
    SELECT dep_id::text AS value, dep_name AS label
    FROM department
  `,
  locations: `
    SELECT l.location_id::text AS value,
           l.location_name || ' · ' || b.building_name AS label
    FROM location l
    JOIN building b ON b.building_id = l.building_id
  `,
  people: `
    SELECT people_id::text AS value,
           name || COALESCE(' · ' || NULLIF(phone, ''), '') AS label
    FROM people
  `,
  students: `
    SELECT s.people_id::text AS value,
           p.name || '（' || s.student_no || '）' AS label
    FROM student s
    JOIN people p ON p.people_id = s.people_id
  `,
  teachers: `
    SELECT t.people_id::text AS value,
           p.name || '（' || t.staff_no || '）' AS label
    FROM teacher t
    JOIN people p ON p.people_id = t.people_id
  `,
  courses: `
    SELECT c.course_id::text AS value,
           c.course_name || ' · ' || d.dep_name AS label
    FROM course c
    JOIN department d ON d.dep_id = c.dep_id
  `,
  events: `
    SELECT event_id::text AS value, event_name AS label
    FROM event
  `,
  users: `
    SELECT user_id::text AS value, username AS label
    FROM sysuser
  `
};

function getFieldOptionQuery(optionKey) {
  const sql = fieldOptionQueries[optionKey];

  if (!sql) {
    throw new HttpError(404, "字段选项不存在");
  }

  return sql;
}

function normalizeKeyword(keyword) {
  return typeof keyword === "string" ? keyword.trim() : "";
}

export async function listByKey(optionKey, keyword) {
  const baseSql = getFieldOptionQuery(optionKey);
  const normalized = normalizeKeyword(keyword);
  const params = normalized ? [`%${normalized}%`] : [];
  const whereClause = normalized ? "WHERE label ILIKE $1" : "";

  const result = await query(
    `
      WITH options AS (
        ${baseSql}
      )
      SELECT value, label
      FROM options
      ${whereClause}
      ORDER BY label
      LIMIT 50
    `,
    params
  );

  return result.rows;
}
