import { query } from "../db/pool.js";
import { decodeCompositeKey, encodeCompositeKey } from "../utils/compositeKey.js";
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

  addFilter(whereFilters, params, filters.studentId, (index) => `e.student_id = $${index}`);
  addFilter(whereFilters, params, filters.courseId, (index) => `e.course_id = $${index}`);

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(" AND ")}` : "";
  const selectSql = `
    SELECT
      e.student_id AS "studentId",
      p.name AS "studentName",
      s.student_no AS "studentNo",
      e.course_id AS "courseId",
      c.course_name AS "courseName",
      e.semester,
      e.grade,
      e.student_id || '__' || e.course_id || '__' || e.semester AS id
    FROM enrollment e
    JOIN student s ON s.people_id = e.student_id
    JOIN people p ON p.people_id = s.people_id
    JOIN course c ON c.course_id = e.course_id
    ${whereClause}
  `;

  if (pagination) {
    return queryPage(query, {
      selectSql,
      params,
      orderBy: 'semester DESC, "studentName", "courseName"',
      pagination
    });
  }

  const result = await query(`${selectSql} ORDER BY e.semester DESC, p.name, c.course_name`, params);
  return result.rows;
}

export async function create(payload) {
  const studentId = requireNumber(payload.studentId, "学生");
  const courseId = requireNumber(payload.courseId, "课程");
  const semester = requireText(payload.semester, "学期");
  const grade = optionalText(payload.grade) ? Number(payload.grade) : null;

  await query(
    `
      INSERT INTO Enrollment (student_id, course_id, semester, grade)
      VALUES ($1, $2, $3, $4)
    `,
    [studentId, courseId, semester, grade]
  );

  return { id: encodeCompositeKey([studentId, courseId, semester]) };
}

export async function update(id, payload) {
  const [oldStudentId, oldCourseId, oldSemester] = decodeCompositeKey(id);
  const studentId = requireNumber(payload.studentId, "学生");
  const courseId = requireNumber(payload.courseId, "课程");
  const semester = requireText(payload.semester, "学期");
  const grade = optionalText(payload.grade) ? Number(payload.grade) : null;

  const result = await query(
    `
      UPDATE Enrollment
      SET student_id = $1, course_id = $2, semester = $3, grade = $4
      WHERE student_id = $5 AND course_id = $6 AND semester = $7
      RETURNING student_id
    `,
    [studentId, courseId, semester, grade, oldStudentId, oldCourseId, oldSemester]
  );

  await ensureAffected(result);
  return { id: encodeCompositeKey([studentId, courseId, semester]) };
}

export async function deleteById(id) {
  const [studentId, courseId, semester] = decodeCompositeKey(id);
  const result = await query(
    `
      DELETE FROM Enrollment
      WHERE student_id = $1 AND course_id = $2 AND semester = $3
      RETURNING student_id
    `,
    [studentId, courseId, semester]
  );

  await ensureAffected(result);
  return { id };
}
