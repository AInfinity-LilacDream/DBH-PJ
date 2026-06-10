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
  const teachingFilters = [];

  addFilter(whereFilters, params, keywordPattern, (index) => `co.course_name ILIKE $${index}`);
  addFilter(whereFilters, params, filters.depId, (index) => `co.dep_id = $${index}`);
  addFilter(teachingFilters, params, filters.teacherId, (index) => `te.teacher_id = $${index}`);
  addFilter(teachingFilters, params, filters.semester, (index) => `te.semester = $${index}`);

  if (teachingFilters.length) {
    whereFilters.push(`
      EXISTS (
        SELECT 1
        FROM teaching te
        WHERE te.course_id = co.course_id
          AND ${teachingFilters.join(" AND ")}
      )
    `);
  }

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(" AND ")}` : "";

  const selectSql = `
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
    `;

  if (pagination) {
    return queryPage(query, {
      selectSql,
      params,
      orderBy: '"departmentName", "courseName"',
      pagination
    });
  }

  const result = await query(`${selectSql} ORDER BY d.dep_name, co.course_name`, params);
  return result.rows;
}
