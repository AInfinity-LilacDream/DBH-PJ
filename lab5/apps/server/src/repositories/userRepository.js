import { query, withTransaction } from "../db/pool.js";

const publicUserColumns = `
  u.user_id AS "userId",
  u.people_id AS "peopleId",
  u.username,
  u.role_type AS "roleType",
  u.verification_status AS "verificationStatus",
  u.dep_id AS "depId",
  u.created_at AS "createdAt",
  p.name,
  p.gender,
  p.phone,
  p.email
`;

const userFrom = `
  FROM sysuser u
  JOIN people p ON p.people_id = u.people_id
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

export async function createUser({ name, gender, phone, email, username, passwordHash, roleType }) {
  return withTransaction(async (client) => {
    const peopleResult = await client.query(
      `
        INSERT INTO people (name, gender, phone, email)
        VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''))
        RETURNING people_id
      `,
      [name, gender, phone ?? "", email ?? ""]
    );

    const peopleId = peopleResult.rows[0].people_id;

    const userResult = await client.query(
      `
        INSERT INTO sysuser (people_id, username, password_hash, role_type, verification_status)
        VALUES ($1, $2, $3, $4, 'verified')
        RETURNING user_id
      `,
      [peopleId, username, passwordHash, roleType]
    );

    const publicUserResult = await client.query(
      `
        SELECT ${publicUserColumns}
        ${userFrom}
        WHERE u.user_id = $1
        LIMIT 1
      `,
      [userResult.rows[0].user_id]
    );

    return publicUserResult.rows[0];
  });
}
