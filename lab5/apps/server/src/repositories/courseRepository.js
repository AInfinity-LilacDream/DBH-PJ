import { query } from "../db/pool.js";
import { ensureAffected, optionalText, requireNumber, requireText } from "../utils/payload.js";

export async function listAll() {
  const result = await query(`
    SELECT
      c.course_id AS id,
      c.course_name AS "courseName",
      c.dep_id AS "depId",
      d.dep_name AS "departmentName",
      COALESCE(c.description, '') AS description
    FROM course c
    JOIN department d ON d.dep_id = c.dep_id
    ORDER BY c.course_id DESC
  `);

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
