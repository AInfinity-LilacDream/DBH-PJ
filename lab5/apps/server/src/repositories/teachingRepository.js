import { query } from "../db/pool.js";
import { decodeCompositeKey, encodeCompositeKey } from "../utils/compositeKey.js";
import { ensureAffected, requireNumber, requireText } from "../utils/payload.js";
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

  addFilter(whereFilters, params, filters.teacherId, (index) => `te.teacher_id = $${index}`);
  addFilter(whereFilters, params, filters.courseId, (index) => `te.course_id = $${index}`);

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(" AND ")}` : "";
  const selectSql = `
    SELECT
      te.teacher_id AS "teacherId",
      p.name AS "teacherName",
      te.course_id AS "courseId",
      c.course_name AS "courseName",
      te.semester,
      te.teacher_id || '__' || te.course_id || '__' || te.semester AS id
    FROM teaching te
    JOIN teacher tr ON tr.people_id = te.teacher_id
    JOIN people p ON p.people_id = tr.people_id
    JOIN course c ON c.course_id = te.course_id
    ${whereClause}
  `;

  if (pagination) {
    return queryPage(query, {
      selectSql,
      params,
      orderBy: 'semester DESC, "teacherName", "courseName"',
      pagination
    });
  }

  const result = await query(`${selectSql} ORDER BY te.semester DESC, p.name, c.course_name`, params);
  return result.rows;
}

export async function create(payload) {
  const teacherId = requireNumber(payload.teacherId, "授课教师");
  const courseId = requireNumber(payload.courseId, "课程");
  const semester = requireText(payload.semester, "学期");

  await query(
    `
      INSERT INTO Teaching (teacher_id, course_id, semester)
      VALUES ($1, $2, $3)
    `,
    [teacherId, courseId, semester]
  );

  return { id: encodeCompositeKey([teacherId, courseId, semester]) };
}

export async function update(id, payload) {
  const [oldTeacherId, oldCourseId, oldSemester] = decodeCompositeKey(id);
  const teacherId = requireNumber(payload.teacherId, "授课教师");
  const courseId = requireNumber(payload.courseId, "课程");
  const semester = requireText(payload.semester, "学期");

  const result = await query(
    `
      UPDATE Teaching
      SET teacher_id = $1, course_id = $2, semester = $3
      WHERE teacher_id = $4 AND course_id = $5 AND semester = $6
      RETURNING teacher_id
    `,
    [teacherId, courseId, semester, oldTeacherId, oldCourseId, oldSemester]
  );

  await ensureAffected(result);
  return { id: encodeCompositeKey([teacherId, courseId, semester]) };
}

export async function deleteById(id) {
  const [teacherId, courseId, semester] = decodeCompositeKey(id);
  const result = await query(
    `
      DELETE FROM Teaching
      WHERE teacher_id = $1 AND course_id = $2 AND semester = $3
      RETURNING teacher_id
    `,
    [teacherId, courseId, semester]
  );

  await ensureAffected(result);
  return { id };
}
