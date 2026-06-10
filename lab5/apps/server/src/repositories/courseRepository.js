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

  addFilter(whereFilters, params, filters.courseName ? `%${String(filters.courseName).trim()}%` : "", (index) => (
    `"courseName" ILIKE $${index}`
  ));
  addFilter(whereFilters, params, filters.teacherId, (index) => (
    `EXISTS (
      SELECT 1
      FROM teaching filter_te
      WHERE filter_te.course_id = page_source.id
        AND filter_te.teacher_id = $${index}
    )`
  ));
  addFilter(whereFilters, params, filters.semester, (index) => (
    `EXISTS (
      SELECT 1
      FROM teaching filter_te
      WHERE filter_te.course_id = page_source.id
        AND filter_te.semester = $${index}
    )`
  ));

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(" AND ")}` : "";
  const selectSql = `
    WITH course_teaching AS (
      SELECT
        te.course_id,
        STRING_AGG(DISTINCT te.teacher_id::text, ',') AS teacher_ids,
        STRING_AGG(DISTINCT p.name, '、' ORDER BY p.name) AS teacher_names,
        STRING_AGG(DISTINCT te.semester, '、' ORDER BY te.semester) AS semesters
      FROM teaching te
      JOIN teacher tr ON tr.people_id = te.teacher_id
      JOIN people p ON p.people_id = tr.people_id
      GROUP BY te.course_id
    )
    SELECT
      c.course_id AS id,
      c.course_name AS "courseName",
      c.dep_id AS "depId",
      d.dep_name AS "departmentName",
      COALESCE(t.teacher_ids, '') AS "teacherIds",
      COALESCE(t.teacher_names, '') AS "teacherNames",
      COALESCE(t.semesters, '') AS semesters,
      COALESCE(c.description, '') AS description
    FROM course c
    JOIN department d ON d.dep_id = c.dep_id
    LEFT JOIN course_teaching t ON t.course_id = c.course_id
  `;

  if (pagination) {
    return queryPage(query, {
      selectSql: `SELECT * FROM (${selectSql}) AS page_source ${whereClause}`,
      params,
      orderBy: "id DESC",
      pagination
    });
  }

  const result = await query(`SELECT * FROM (${selectSql}) AS page_source ${whereClause} ORDER BY id DESC`, params);
  return result.rows;
}

export async function create(payload) {
  const result = await query(
    `
      INSERT INTO Course (course_name, dep_id, description)
      VALUES ($1, $2, $3)
      RETURNING course_id AS id
    `,
    [
      requireText(payload.courseName, "课程名称"),
      requireNumber(payload.depId, "开课院系ID"),
      optionalText(payload.description)
    ]
  );

  return result.rows[0];
}

export async function update(id, payload) {
  const result = await query(
    `
      UPDATE Course
      SET course_name = $1, dep_id = $2, description = $3
      WHERE course_id = $4
      RETURNING course_id AS id
    `,
    [
      requireText(payload.courseName, "课程名称"),
      requireNumber(payload.depId, "开课院系ID"),
      optionalText(payload.description),
      id
    ]
  );

  return ensureAffected(result);
}

export async function deleteById(id) {
  const result = await query("DELETE FROM Course WHERE course_id = $1 RETURNING course_id AS id", [id]);
  return ensureAffected(result);
}
