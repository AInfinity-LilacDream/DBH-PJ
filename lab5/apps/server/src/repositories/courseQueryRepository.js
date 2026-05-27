import { query } from "../db/pool.js";
import { createKeywordPattern } from "../utils/keyword.js";

export async function search(keyWord) {
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
