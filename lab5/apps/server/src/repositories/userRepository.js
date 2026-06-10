import { query } from "../db/pool.js";

const publicUserColumns = `
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

const userFrom = `
  FROM sysuser u
  LEFT JOIN people p ON p.people_id = u.people_id
`;

export async function findAuthUserByUsername(username) {
  const result = await query(
    `
      SELECT
        ${publicUserColumns},
        u.password_hash AS "passwordHash"
      ${userFrom}
      WHERE u.username = $1
      LIMIT 1
    `,
    [username]
  );

  return result.rows[0] ?? null;
}

export async function createPendingUser({ username, passwordHash }) {
  const userResult = await query(
    `
      INSERT INTO sysuser (people_id, username, password_hash, role_type, verification_status)
      VALUES (NULL, $1, $2, 'student', 'pending')
      RETURNING user_id
    `,
    [username, passwordHash]
  );

  const publicUserResult = await query(
    `
      SELECT ${publicUserColumns}
      ${userFrom}
      WHERE u.user_id = $1
      LIMIT 1
    `,
    [userResult.rows[0].user_id]
  );

  return publicUserResult.rows[0];
}
