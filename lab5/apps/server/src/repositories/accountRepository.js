import { query } from "../db/pool.js";
import { hashPassword } from "../utils/password.js";
import { ensureAffected, optionalText, requireText } from "../utils/payload.js";

const accountColumns = `
  u.user_id AS "userId",
  u.people_id AS "peopleId",
  u.username,
  u.role_type AS "roleType",
  u.verification_status AS "verificationStatus",
  u.dep_id AS "depId",
  u.created_at AS "createdAt",
  COALESCE(p.name, u.username) AS name,
  p.gender,
  p.phone,
  p.email
`;

const accountFrom = `
  FROM sysuser u
  LEFT JOIN people p ON p.people_id = u.people_id
`;

export async function findByUserId(userId) {
  const result = await query(
    `
      SELECT ${accountColumns}
      ${accountFrom}
      WHERE u.user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function updateAccount(userId, payload) {
  const password = optionalText(payload.password);
  const username = requireText(payload.username, "用户名");

  const result = password
    ? await query(
        `
          UPDATE SysUser
          SET username = $1, password_hash = $2
          WHERE user_id = $3
          RETURNING user_id AS id
        `,
        [username, await hashPassword(password), userId]
      )
    : await query(
        `
          UPDATE SysUser
          SET username = $1
          WHERE user_id = $2
          RETURNING user_id AS id
        `,
        [username, userId]
      );

  await ensureAffected(result);
  return findByUserId(userId);
}

export async function findPeopleForBinding({ name, workNo }) {
  const normalizedName = requireText(name, "姓名");
  const normalizedWorkNo = requireText(workNo, "学工号");

  const result = await query(
    `
      SELECT
        p.people_id AS id,
        p.name,
        p.gender,
        COALESCE(s.student_no, t.staff_no, '') AS "workNo",
        CASE
          WHEN s.student_no IS NOT NULL THEN 'student'
          WHEN t.staff_no IS NOT NULL THEN 'teacher'
          ELSE 'unknown'
        END AS "personType",
        COALESCE(p.phone, '') AS phone,
        COALESCE(p.email, '') AS email,
        CASE WHEN u.user_id IS NULL THEN false ELSE true END AS "isBound",
        u.username AS "boundUsername"
      FROM people p
      LEFT JOIN student s ON s.people_id = p.people_id
      LEFT JOIN teacher t ON t.people_id = p.people_id
      LEFT JOIN sysuser u ON u.people_id = p.people_id
      WHERE p.name = $1
        AND (s.student_no = $2 OR t.staff_no = $2)
      ORDER BY p.people_id
    `,
    [normalizedName, normalizedWorkNo]
  );

  return result.rows;
}

export async function bindPeople(userId, peopleId) {
  const result = await query(
    `
      UPDATE SysUser
      SET people_id = $1, verification_status = 'verified'
      WHERE user_id = $2
      RETURNING user_id AS id
    `,
    [peopleId, userId]
  );

  await ensureAffected(result);
  return findByUserId(userId);
}

export async function unbindPeople(userId) {
  const result = await query(
    `
      UPDATE SysUser
      SET people_id = NULL, verification_status = 'pending'
      WHERE user_id = $1
      RETURNING user_id AS id
    `,
    [userId]
  );

  await ensureAffected(result);
  return findByUserId(userId);
}
