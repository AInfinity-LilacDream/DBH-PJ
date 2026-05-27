import { pool, query } from "../db/pool.js";
import { hashPassword } from "../utils/password.js";
import { HttpError } from "../utils/httpError.js";

const moduleConfig = {
  campus: {
    idColumn: "campus_id",
    listSql: `
      SELECT
        campus_id AS id,
        campus_name AS "campusName",
        address
      FROM campus
      ORDER BY campus_id DESC
    `,
    createSql: `
      INSERT INTO Campus (campus_name, address)
      VALUES ($1, $2)
      RETURNING campus_id AS id
    `,
    updateSql: `
      UPDATE Campus
      SET campus_name = $1, address = $2
      WHERE campus_id = $3
      RETURNING campus_id AS id
    `,
    deleteSql: "DELETE FROM Campus WHERE campus_id = $1 RETURNING campus_id AS id",
    values: (payload) => [requireText(payload.campusName, "校区名称"), requireText(payload.address, "地址")]
  },
  location: {
    idColumn: "location_id",
    listSql: `
      SELECT
        l.location_id AS id,
        l.location_name AS "locationName",
        l.building_id AS "buildingId",
        b.building_name AS "buildingName",
        l.facility_type AS "facilityType",
        l.open_time AS "openTime",
        COALESCE(l.description, '') AS description
      FROM location l
      JOIN building b ON b.building_id = l.building_id
      ORDER BY l.location_id DESC
    `,
    createSql: `
      INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING location_id AS id
    `,
    updateSql: `
      UPDATE Location
      SET location_name = $1, building_id = $2, facility_type = $3, description = $4, open_time = $5
      WHERE location_id = $6
      RETURNING location_id AS id
    `,
    deleteSql: "DELETE FROM Location WHERE location_id = $1 RETURNING location_id AS id",
    values: (payload) => [
      requireText(payload.locationName, "地点名称"),
      requireNumber(payload.buildingId, "所属楼宇ID"),
      requireText(payload.facilityType, "设施类型"),
      optionalText(payload.description),
      optionalText(payload.openTime)
    ]
  },
  course: {
    idColumn: "course_id",
    listSql: `
      SELECT
        c.course_id AS id,
        c.course_name AS "courseName",
        c.dep_id AS "depId",
        d.dep_name AS "departmentName",
        COALESCE(c.description, '') AS description
      FROM course c
      JOIN department d ON d.dep_id = c.dep_id
      ORDER BY c.course_id DESC
    `,
    createSql: `
      INSERT INTO Course (course_name, dep_id, description)
      VALUES ($1, $2, $3)
      RETURNING course_id AS id
    `,
    updateSql: `
      UPDATE Course
      SET course_name = $1, dep_id = $2, description = $3
      WHERE course_id = $4
      RETURNING course_id AS id
    `,
    deleteSql: "DELETE FROM Course WHERE course_id = $1 RETURNING course_id AS id",
    values: (payload) => [
      requireText(payload.courseName, "课程名称"),
      requireNumber(payload.depId, "开课院系ID"),
      optionalText(payload.description)
    ]
  },
  event: {
    idColumn: "event_id",
    listSql: `
      SELECT
        e.event_id AS id,
        e.event_name AS "eventName",
        e.event_type AS "eventType",
        TO_CHAR(e.start_time, 'YYYY-MM-DD"T"HH24:MI') AS "startTime",
        TO_CHAR(e.end_time, 'YYYY-MM-DD"T"HH24:MI') AS "endTime",
        e.location_id AS "locationId",
        COALESCE(l.location_name, '') AS "locationName",
        e.host_dep_id AS "hostDepId",
        COALESCE(d.dep_name, '') AS "hostDepartmentName",
        COALESCE(e.description, '') AS description
      FROM event e
      LEFT JOIN location l ON l.location_id = e.location_id
      LEFT JOIN department d ON d.dep_id = e.host_dep_id
      ORDER BY e.event_id DESC
    `,
    createSql: `
      INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING event_id AS id
    `,
    updateSql: `
      UPDATE Event
      SET event_name = $1, event_type = $2, start_time = $3, end_time = $4, location_id = $5, host_dep_id = $6, description = $7
      WHERE event_id = $8
      RETURNING event_id AS id
    `,
    deleteSql: "DELETE FROM Event WHERE event_id = $1 RETURNING event_id AS id",
    values: (payload) => [
      requireText(payload.eventName, "活动名称"),
      requireText(payload.eventType, "活动类型"),
      requireText(payload.startTime, "开始时间"),
      optionalText(payload.endTime),
      optionalNumber(payload.locationId),
      optionalNumber(payload.hostDepId),
      optionalText(payload.description)
    ]
  }
};

function getConfig(moduleName) {
  const config = moduleConfig[moduleName];

  if (!config && moduleName !== "people") {
    throw new HttpError(404, "管理模块不存在");
  }

  return config;
}

function optionalText(value) {
  const text = typeof value === "string" ? value.trim() : value;
  return text || null;
}

function requireText(value, label) {
  const text = optionalText(value);

  if (!text) {
    throw new HttpError(400, `${label}不能为空`);
  }

  return text;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    throw new HttpError(400, "ID 必须是整数");
  }

  return numberValue;
}

function requireNumber(value, label) {
  const numberValue = optionalNumber(value);

  if (!numberValue) {
    throw new HttpError(400, `${label}不能为空`);
  }

  return numberValue;
}

async function ensureAffected(result) {
  if (result.rowCount === 0) {
    throw new HttpError(404, "数据不存在");
  }

  return result.rows[0];
}

export async function listModuleRows(moduleName) {
  if (moduleName === "people") {
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

  const config = getConfig(moduleName);
  const result = await query(config.listSql);
  return result.rows;
}

export async function createModuleRow(moduleName, payload) {
  if (moduleName === "people") {
    return createPerson(payload);
  }

  const config = getConfig(moduleName);
  const result = await query(config.createSql, config.values(payload));
  return result.rows[0];
}

export async function updateModuleRow(moduleName, id, payload) {
  if (moduleName === "people") {
    return updatePerson(id, payload);
  }

  const config = getConfig(moduleName);
  const result = await query(config.updateSql, [...config.values(payload), id]);
  return ensureAffected(result);
}

export async function deleteModuleRow(moduleName, id) {
  if (moduleName === "people") {
    const result = await query("DELETE FROM People WHERE people_id = $1 RETURNING people_id AS id", [id]);
    return ensureAffected(result);
  }

  const config = getConfig(moduleName);
  const result = await query(config.deleteSql, [id]);
  return ensureAffected(result);
}

async function createPerson(payload) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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

    await client.query("COMMIT");
    return person;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updatePerson(id, payload) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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

    await client.query("COMMIT");
    return { id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
