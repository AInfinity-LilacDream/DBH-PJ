import { query, withTransaction } from "../db/pool.js";
import { hashPassword } from "../utils/password.js";
import { ensureAffected, optionalText, requireText } from "../utils/payload.js";

export async function listAll() {
  const result = await query(`
    SELECT
      p.people_id AS id,
      p.name,
      p.gender,
      COALESCE(p.phone, '') AS phone,
      COALESCE(p.email, '') AS email,
      u.user_id AS "userId",
      COALESCE(u.username, '') AS username,
      COALESCE(u.role_type, '') AS "roleType",
      COALESCE(u.verification_status, '') AS "verificationStatus"
    FROM people p
    LEFT JOIN sysuser u ON u.people_id = p.people_id
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

    if (optionalText(payload.username)) {
      const passwordHash = await hashPassword(optionalText(payload.password) || "123456");
      await client.query(
        `
          INSERT INTO SysUser (people_id, username, password_hash, role_type, verification_status)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          person.id,
          requireText(payload.username, "用户名"),
          passwordHash,
          requireText(payload.roleType, "账号角色"),
          optionalText(payload.verificationStatus) || "pending"
        ]
      );
    }

    return person;
  });
}

export async function update(id, payload) {
  return withTransaction(async (client) => {
    const peopleResult = await client.query(
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
    await ensureAffected(peopleResult);

    const username = optionalText(payload.username);
    const roleType = optionalText(payload.roleType);
    const verificationStatus = optionalText(payload.verificationStatus) || "pending";

    if (username && roleType) {
      const userResult = await client.query("SELECT user_id FROM SysUser WHERE people_id = $1", [id]);

      if (userResult.rowCount === 0) {
        const passwordHash = await hashPassword(optionalText(payload.password) || "123456");
        await client.query(
          `
            INSERT INTO SysUser (people_id, username, password_hash, role_type, verification_status)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [id, username, passwordHash, roleType, verificationStatus]
        );
      } else {
        const password = optionalText(payload.password);

        if (password) {
          await client.query(
            `
              UPDATE SysUser
              SET username = $1, role_type = $2, verification_status = $3, password_hash = $4
              WHERE people_id = $5
            `,
            [username, roleType, verificationStatus, await hashPassword(password), id]
          );
        } else {
          await client.query(
            `
              UPDATE SysUser
              SET username = $1, role_type = $2, verification_status = $3
              WHERE people_id = $4
            `,
            [username, roleType, verificationStatus, id]
          );
        }
      }
    }

    return { id };
  });
}

export async function deleteById(id) {
  const result = await query("DELETE FROM People WHERE people_id = $1 RETURNING people_id AS id", [id]);
  return ensureAffected(result);
}
