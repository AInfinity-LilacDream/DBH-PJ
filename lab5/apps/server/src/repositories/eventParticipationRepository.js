import { query } from "../db/pool.js";

const eventCardColumns = `
  e.event_id AS "eventId",
  e.event_name AS "eventName",
  e.event_type AS "eventType",
  e.start_time AS "startTime",
  e.end_time AS "endTime",
  e.description,
  l.location_name AS "locationName",
  b.building_name AS "buildingName",
  c.campus_name AS "campusName",
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

export async function listUpcomingByParticipant(participantId) {
  const result = await query(
    `
      SELECT
        ${eventCardColumns},
        ep.register_time AS "registerTime"
      ${eventCardJoins}
      WHERE ep.participant_id = $1
        AND e.start_time >= NOW()
      ORDER BY e.start_time ASC, e.event_name
    `,
    [participantId]
  );

  return result.rows;
}
