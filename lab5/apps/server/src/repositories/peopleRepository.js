import { query, withTransaction } from "../db/pool.js";
import { ensureAffected, optionalText, requireNumber, requireText } from "../utils/payload.js";
import { HttpError } from "../utils/httpError.js";

export async function listAll() {
  const result = await query(`
    SELECT
      p.people_id AS id,
      p.name,
      p.gender,
      COALESCE(p.phone, '') AS phone,
      COALESCE(p.email, '') AS email,
      CASE
        WHEN s.people_id IS NOT NULL THEN 'student'
        WHEN t.people_id IS NOT NULL THEN 'teacher'
        ELSE ''
      END AS "personType",
      COALESCE(s.student_no, '') AS "studentNo",
      COALESCE(s.grade, '') AS grade,
      COALESCE(s.major, '') AS major,
      s.dep_id AS "studentDepId",
      COALESCE(sd.dep_name, '') AS "studentDepartmentName",
      COALESCE(t.staff_no, '') AS "staffNo",
      COALESCE(t.title, '') AS title,
      t.dept_id AS "teacherDeptId",
      COALESCE(td.dep_name, '') AS "teacherDepartmentName",
      COALESCE(s.student_no, t.staff_no, '') AS "workNo",
      COALESCE(sd.dep_name, td.dep_name, '') AS "departmentName",
      CASE
        WHEN s.people_id IS NOT NULL THEN CONCAT(s.grade, ' / ', s.major)
        WHEN t.people_id IS NOT NULL THEN t.title
        ELSE ''
      END AS "extensionInfo"
    FROM people p
    LEFT JOIN student s ON s.people_id = p.people_id
    LEFT JOIN department sd ON sd.dep_id = s.dep_id
    LEFT JOIN teacher t ON t.people_id = p.people_id
    LEFT JOIN department td ON td.dep_id = t.dept_id
    ORDER BY p.people_id DESC
  `);

  return result.rows;
}

export async function create(payload) {
  return withTransaction(async (client) => {
    const peopleResult = await client.query(
      `
        INSERT INTO People (name, gender, phone, email)
        VALUES ($1, $2, $3, $4)
        RETURNING people_id AS id
      `,
      [
        requireText(payload.name, "姓名"),
        requireText(payload.gender, "性别"),
        optionalText(payload.phone),
        optionalText(payload.email)
      ]
    );

    const person = peopleResult.rows[0];
    await upsertPersonExtension(client, person.id, payload);
    return person;
  });
}

export async function update(id, payload) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE People
        SET name = $1, gender = $2, phone = $3, email = $4
        WHERE people_id = $5
        RETURNING people_id AS id
      `,
      [
        requireText(payload.name, "姓名"),
        requireText(payload.gender, "性别"),
        optionalText(payload.phone),
        optionalText(payload.email),
        id
      ]
    );

    await ensureAffected(result);
    await upsertPersonExtension(client, id, payload);
    return result.rows[0];
  });
}

export async function deleteById(id) {
  const result = await query("DELETE FROM People WHERE people_id = $1 RETURNING people_id AS id", [id]);
  return ensureAffected(result);
}

async function upsertPersonExtension(client, peopleId, payload) {
  const personType = requireText(payload.personType, "人员类型");

  if (personType === "student") {
    await client.query("DELETE FROM Teacher WHERE people_id = $1", [peopleId]);
    await client.query(
      `
        INSERT INTO Student (people_id, student_no, grade, major, dep_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (people_id)
        DO UPDATE SET
          student_no = EXCLUDED.student_no,
          grade = EXCLUDED.grade,
          major = EXCLUDED.major,
          dep_id = EXCLUDED.dep_id
      `,
      [
        peopleId,
        requireText(payload.studentNo, "学号"),
        requireText(payload.grade, "年级"),
        requireText(payload.major, "专业"),
        requireNumber(payload.studentDepId, "所属院系")
      ]
    );
    return;
  }

  if (personType === "teacher") {
    await client.query("DELETE FROM Student WHERE people_id = $1", [peopleId]);
    await client.query(
      `
        INSERT INTO Teacher (people_id, staff_no, title, dept_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (people_id)
        DO UPDATE SET
          staff_no = EXCLUDED.staff_no,
          title = EXCLUDED.title,
          dept_id = EXCLUDED.dept_id
      `,
      [
        peopleId,
        requireText(payload.staffNo, "工号"),
        requireText(payload.title, "职称"),
        requireNumber(payload.teacherDeptId, "所属院系")
      ]
    );
    return;
  }

  throw new HttpError(400, "人员类型只能是学生或教师");
}
