import { query } from "../db/pool.js";
import { decodeCompositeKey, encodeCompositeKey } from "../utils/compositeKey.js";
import { ensureAffected, requireNumber } from "../utils/payload.js";
import { queryPage } from "../utils/pagination.js";

// === 常量定义 ===
const eventCardColumns = `
  e.event_id AS "eventId",
  e.event_name AS "eventName",
  e.event_type AS "eventType",
  e.start_time AS "startTime",
  e.end_time AS "endTime",
  e.description,
  l.location_id AS "locationId",
  l.location_name AS "locationName",
  b.building_name AS "buildingName",
  c.campus_id AS "campusId",
  c.campus_name AS "campusName",
  d.dep_id AS "hostDepId",
  d.dep_name AS "hostDepartmentName",
  e.event_name AS title,
  e.event_type AS tag,
  CONCAT(
    TO_CHAR(e.start_time, 'YYYY-MM-DD HH24:MI'),
    ' / ',
    COALESCE(l.location_name, '地点待定')
  ) AS meta
`;

const eventCardJoins = `
  FROM event e
  JOIN eventparticipation ep ON ep.event_id = e.event_id
  LEFT JOIN location l ON l.location_id = e.location_id
  LEFT JOIN building b ON b.building_id = l.building_id
  LEFT JOIN campus c ON c.campus_id = b.campus_id
  LEFT JOIN department d ON d.dep_id = e.host_dep_id
`;

function addFilter(filters, params, value, sql) {
  if (!value) {
    return;
  }

  params.push(value);
  filters.push(sql(params.length));
}

// === 后台管理 CRUD 方法 ===

export async function listAll(_filters = {}, pagination) {
  const selectSql = `
    SELECT
      ep.participant_id AS "participantId",
      p.name AS "participantName",
      ep.event_id AS "eventId",
      e.event_name AS "eventName",
      ep.register_time AS "registerTime",
      ep.participant_id || '__' || ep.event_id AS id
    FROM eventparticipation ep
    JOIN people p ON p.people_id = ep.participant_id
    JOIN event e ON e.event_id = ep.event_id
  `;

  if (pagination) {
    return queryPage(query, { selectSql, orderBy: '"registerTime" DESC', pagination });
  }

  const result = await query(`${selectSql} ORDER BY ep.register_time DESC`);
  return result.rows;
}

export async function create(payload) {
  const participantId = requireNumber(payload.participantId, "参与人员");
  const eventId = requireNumber(payload.eventId, "活动");

  await query(
    `
      INSERT INTO EventParticipation (participant_id, event_id)
      VALUES ($1, $2)
    `,
    [participantId, eventId]
  );

  return { id: encodeCompositeKey([participantId, eventId]) };
}

export async function update(id, payload) {
  const [oldParticipantId, oldEventId] = decodeCompositeKey(id);
  const participantId = requireNumber(payload.participantId, "参与人员");
  const eventId = requireNumber(payload.eventId, "活动");

  const result = await query(
    `
      UPDATE EventParticipation
      SET participant_id = $1, event_id = $2
      WHERE participant_id = $3 AND event_id = $4
      RETURNING participant_id
    `,
    [participantId, eventId, oldParticipantId, oldEventId]
  );

  await ensureAffected(result);
  return { id: encodeCompositeKey([participantId, eventId]) };
}

export async function deleteById(id) {
  const [participantId, eventId] = decodeCompositeKey(id);
  const result = await query(
    `
      DELETE FROM EventParticipation
      WHERE participant_id = $1 AND event_id = $2
      RETURNING participant_id
    `,
    [participantId, eventId]
  );

  await ensureAffected(result);
  return { id };
}

// === 前台用户交互方法 ===

export async function findEventById(eventId) {
  const result = await query(
    `
      SELECT event_id AS "eventId", start_time AS "startTime"
      FROM event
      WHERE event_id = $1
      LIMIT 1
    `,
    [eventId]
  );

  return result.rows[0] ?? null;
}

export async function register(participantId, eventId) {
  await query(
    `
      INSERT INTO eventparticipation (participant_id, event_id)
      VALUES ($1, $2)
    `,
    [participantId, eventId]
  );
}

export async function unregister(participantId, eventId) {
  const result = await query(
    `
      DELETE FROM eventparticipation
      WHERE participant_id = $1 AND event_id = $2
      RETURNING event_id AS "eventId"
    `,
    [participantId, eventId]
  );

  return result.rows[0] ?? null;
}

export async function isRegistered(participantId, eventId) {
  const result = await query(
    `
      SELECT 1
      FROM eventparticipation
      WHERE participant_id = $1 AND event_id = $2
      LIMIT 1
    `,
    [participantId, eventId]
  );

  return result.rowCount > 0;
}

export async function listUpcomingByParticipant(participantId, filters = {}, pagination) {
  const params = [participantId];
  const whereFilters = [
    "ep.participant_id = $1",
    "e.start_time >= NOW()"
  ];

  addFilter(whereFilters, params, filters.keyWord ? `%${String(filters.keyWord).trim()}%` : "", (index) => (
    `e.event_name ILIKE $${index}`
  ));
  addFilter(whereFilters, params, filters.hostDepId, (index) => `d.dep_id = $${index}`);
  addFilter(whereFilters, params, filters.campusId, (index) => `c.campus_id = $${index}`);
  addFilter(whereFilters, params, filters.locationId, (index) => `l.location_id = $${index}`);
  addFilter(whereFilters, params, filters.startDate, (index) => `e.start_time >= $${index}::date`);
  addFilter(whereFilters, params, filters.endDate, (index) => `e.start_time < ($${index}::date + INTERVAL '1 day')`);

  const selectSql = `
      SELECT
        ${eventCardColumns},
        ep.register_time AS "registerTime"
      ${eventCardJoins}
      WHERE ${whereFilters.join(" AND ")}
    `;

  if (pagination) {
    return queryPage(query, {
      selectSql,
      params,
      orderBy: '"startTime" ASC, "eventName"',
      pagination
    });
  }

  const result = await query(`${selectSql} ORDER BY e.start_time ASC, e.event_name`, params);

  return result.rows;
}
