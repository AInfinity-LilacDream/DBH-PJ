import { query } from "../db/pool.js";

function normalizeKeyword(keyWord) {
  return typeof keyWord === "string" ? keyWord.trim() : "";
}

function createKeywordPattern(keyWord) {
  const normalized = normalizeKeyword(keyWord);
  return normalized ? `%${normalized}%` : null;
}

export async function listLocations(keyWord) {
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

export async function listCourses(keyWord) {
  const keywordPattern = createKeywordPattern(keyWord);
  const params = keywordPattern ? [keywordPattern] : [];
  const whereClause = keywordPattern
    ? `
      WHERE
        co.course_name ILIKE $1
        OR COALESCE(co.description, '') ILIKE $1
        OR d.dep_name ILIKE $1
        OR COALESCE(t.teacher_names, '') ILIKE $1
        OR COALESCE(t.semesters, '') ILIKE $1
    `
    : "";

  const result = await query(
    `
      WITH course_teaching AS (
        SELECT
          te.course_id,
          STRING_AGG(DISTINCT p.name, '、' ORDER BY p.name) AS teacher_names,
          STRING_AGG(DISTINCT te.semester, '、' ORDER BY te.semester) AS semesters
        FROM teaching te
        JOIN teacher tr ON tr.people_id = te.teacher_id
        JOIN people p ON p.people_id = tr.people_id
        GROUP BY te.course_id
      )
      SELECT
        co.course_id AS "courseId",
        co.course_name AS "courseName",
        co.description,
        d.dep_id AS "depId",
        d.dep_name AS "departmentName",
        COALESCE(t.teacher_names, '') AS "teacherNames",
        COALESCE(t.semesters, '') AS semesters,
        co.course_name AS title,
        d.dep_name AS tag,
        CASE
          WHEN COALESCE(t.teacher_names, '') = '' THEN d.dep_name
          ELSE CONCAT(d.dep_name, ' / ', t.teacher_names)
        END AS meta
      FROM course co
      JOIN department d ON d.dep_id = co.dep_id
      LEFT JOIN course_teaching t ON t.course_id = co.course_id
      ${whereClause}
      ORDER BY d.dep_name, co.course_name
    `,
    params
  );

  return result.rows;
}

export async function listEvents(keyWord) {
  const keywordPattern = createKeywordPattern(keyWord);
  const params = keywordPattern ? [keywordPattern] : [];
  const whereClause = keywordPattern
    ? `
      WHERE
        e.event_name ILIKE $1
        OR e.event_type ILIKE $1
        OR COALESCE(e.description, '') ILIKE $1
        OR COALESCE(d.dep_name, '') ILIKE $1
        OR COALESCE(l.location_name, '') ILIKE $1
        OR COALESCE(b.building_name, '') ILIKE $1
        OR COALESCE(c.campus_name, '') ILIKE $1
    `
    : "";

  const result = await query(
    `
      SELECT
        e.event_id AS "eventId",
        e.event_name AS "eventName",
        e.event_type AS "eventType",
        e.start_time AS "startTime",
        e.end_time AS "endTime",
        e.description,
        l.location_id AS "locationId",
        l.location_name AS "locationName",
        b.building_name AS "buildingName",
        c.campus_name AS "campusName",
        d.dep_id AS "hostDepId",
        d.dep_name AS "hostDepartmentName",
        e.event_name AS title,
        e.event_type AS tag,
        CONCAT(
          TO_CHAR(e.start_time, 'YYYY-MM-DD HH24:MI'),
          ' / ',
          COALESCE(l.location_name, '地点待定')
        ) AS meta
      FROM event e
      LEFT JOIN location l ON l.location_id = e.location_id
      LEFT JOIN building b ON b.building_id = l.building_id
      LEFT JOIN campus c ON c.campus_id = b.campus_id
      LEFT JOIN department d ON d.dep_id = e.host_dep_id
      ${whereClause}
      ORDER BY e.start_time DESC, e.event_name
    `,
    params
  );

  return result.rows;
}
