import { query } from "../db/pool.js";
import { ensureAffected, optionalNumber, optionalText, requireText } from "../utils/payload.js";
import { queryPage } from "../utils/pagination.js";

export async function listAll(filters = {}, pagination) {
  const params = [];
  const keyword = typeof filters.depName === "string" ? filters.depName.trim() : "";
  const whereClause = keyword ? "WHERE d.dep_name ILIKE $1" : "";
  if (keyword) {
    params.push(`%${keyword}%`);
  }

  const selectSql = `
    SELECT
      d.dep_id AS id,
      d.dep_name AS "depName",
      COALESCE(d.contact_info, '') AS "contactInfo",
      d.office_location_id AS "officeLocationId",
      COALESCE(l.location_name, '') AS "officeLocationName",
      d.manager_id AS "managerId",
      COALESCE(p.name, '') AS "managerName",
      COALESCE(d.description, '') AS description
    FROM department d
    LEFT JOIN location l ON l.location_id = d.office_location_id
    LEFT JOIN people p ON p.people_id = d.manager_id
    ${whereClause}
  `;

  if (pagination) {
    return queryPage(query, { selectSql, params, orderBy: "id DESC", pagination });
  }

  const result = await query(`${selectSql} ORDER BY d.dep_id DESC`, params);
  return result.rows;
}

export async function create(payload) {
  const result = await query(
    `
      INSERT INTO Department (dep_name, contact_info, office_location_id, manager_id, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING dep_id AS id
    `,
    [
      requireText(payload.depName, "院系名称"),
      optionalText(payload.contactInfo),
      optionalNumber(payload.officeLocationId),
      optionalNumber(payload.managerId),
      optionalText(payload.description)
    ]
  );

  return result.rows[0];
}

export async function update(id, payload) {
  const result = await query(
    `
      UPDATE Department
      SET dep_name = $1, contact_info = $2, office_location_id = $3, manager_id = $4, description = $5
      WHERE dep_id = $6
      RETURNING dep_id AS id
    `,
    [
      requireText(payload.depName, "院系名称"),
      optionalText(payload.contactInfo),
      optionalNumber(payload.officeLocationId),
      optionalNumber(payload.managerId),
      optionalText(payload.description),
      id
    ]
  );

  return ensureAffected(result);
}

export async function deleteById(id) {
  const result = await query("DELETE FROM Department WHERE dep_id = $1 RETURNING dep_id AS id", [id]);
  return ensureAffected(result);
}
