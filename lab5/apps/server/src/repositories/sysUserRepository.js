import { query } from "../db/pool.js";
import { hashPassword } from "../utils/password.js";
import { ensureAffected, optionalText, requireText } from "../utils/payload.js";
import { queryPage } from "../utils/pagination.js";

export async function listAll(filters = {}, pagination) {
  const params = [];
  const keyword = typeof filters.username === "string" ? filters.username.trim() : "";
  const whereClause = keyword ? "WHERE u.username ILIKE $1" : "";
  if (keyword) {
    params.push(`%${keyword}%`);
  }

  const selectSql = `
    SELECT
      u.user_id AS id,
      u.people_id AS "peopleId",
      COALESCE(p.name, '未绑定人员') AS "personName",
      u.username,
      u.role_type AS "roleType",
      u.verification_status AS "verificationStatus",
      u.dep_id AS "depId",
      COALESCE(d.dep_name, '') AS "departmentName"
    FROM sysuser u
    LEFT JOIN people p ON p.people_id = u.people_id
    LEFT JOIN department d ON d.dep_id = u.dep_id
    ${whereClause}
  `;

  if (pagination) {
    return queryPage(query, { selectSql, params, orderBy: "id DESC", pagination });
  }

  const result = await query(`${selectSql} ORDER BY u.user_id DESC`, params);
  return result.rows;
}

export async function create(payload) {
  const peopleId = optionalText(payload.peopleId) ? Number(payload.peopleId) : null;
  const passwordHash = await hashPassword(optionalText(payload.password) || "123456");

  const result = await query(
    `
      INSERT INTO SysUser (people_id, username, password_hash, role_type, verification_status, dep_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id AS id
    `,
    [
      peopleId,
      requireText(payload.username, "用户名"),
      passwordHash,
      requireText(payload.roleType, "账号角色"),
      optionalText(payload.verificationStatus) || "pending",
      optionalText(payload.depId) ? Number(payload.depId) : null
    ]
  );

  return result.rows[0];
}

export async function update(id, payload) {
  const password = optionalText(payload.password);
  const depId = optionalText(payload.depId) ? Number(payload.depId) : null;
  const peopleId = optionalText(payload.peopleId) ? Number(payload.peopleId) : null;

  const result = password
    ? await query(
        `
          UPDATE SysUser
          SET people_id = $1,
              username = $2,
              role_type = $3,
              verification_status = $4,
              dep_id = $5,
              password_hash = $6
          WHERE user_id = $7
          RETURNING user_id AS id
        `,
        [
          peopleId,
          requireText(payload.username, "用户名"),
          requireText(payload.roleType, "账号角色"),
          optionalText(payload.verificationStatus) || "pending",
          depId,
          await hashPassword(password),
          id
        ]
      )
    : await query(
        `
          UPDATE SysUser
          SET people_id = $1,
              username = $2,
              role_type = $3,
              verification_status = $4,
              dep_id = $5
          WHERE user_id = $6
          RETURNING user_id AS id
        `,
        [
          peopleId,
          requireText(payload.username, "用户名"),
          requireText(payload.roleType, "账号角色"),
          optionalText(payload.verificationStatus) || "pending",
          depId,
          id
        ]
      );

  await ensureAffected(result);
  return result.rows[0];
}

export async function deleteById(id) {
  const result = await query("DELETE FROM SysUser WHERE user_id = $1 RETURNING user_id AS id", [id]);
  return ensureAffected(result);
}
