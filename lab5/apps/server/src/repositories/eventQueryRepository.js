import { query } from "../db/pool.js";
import { createKeywordPattern } from "../utils/keyword.js";

export async function search(keyWord, peopleId = null) {
  const keywordPattern = createKeywordPattern(keyWord);
  const params = [];
  const filters = [];

  if (keywordPattern) {
    params.push(keywordPattern);
    filters.push(`
      (
        e.event_name ILIKE $${params.length}
        OR e.event_type ILIKE $${params.length}
        OR COALESCE(e.description, '') ILIKE $${params.length}
        OR COALESCE(d.dep_name, '') ILIKE $${params.length}
        OR COALESCE(l.location_name, '') ILIKE $${params.length}
        OR COALESCE(b.building_name, '') ILIKE $${params.length}
        OR COALESCE(c.campus_name, '') ILIKE $${params.length}
      )
    `);
  }

  if (peopleId) {
    params.push(peopleId);
  }

  const participationJoin = peopleId
    ? `LEFT JOIN eventparticipation ep ON ep.event_id = e.event_id AND ep.participant_id = $${params.length}`
    : "";

  const isRegisteredSelect = peopleId
    ? "(ep.participant_id IS NOT NULL) AS \"isRegistered\""
    : "false AS \"isRegistered\"";

  const whereClause = filters.length
    ? `WHERE ${filters.join(" AND ")}`
    : "";

  const result = await query(
    `
      SELECT
        e.event_id AS "eventId",
        e.event_name AS "eventName",
        e.event_type AS "eventType",
        e.start_time AS "startTime",
        e.end_time AS "endTime",
        e.description,
        l.location_id AS "locationId",
        l.location_name AS "locationName",
        b.building_name AS "buildingName",
        c.campus_name AS "campusName",
        d.dep_id AS "hostDepId",
        d.dep_name AS "hostDepartmentName",
        e.event_name AS title,
        e.event_type AS tag,
        CONCAT(
          TO_CHAR(e.start_time, 'YYYY-MM-DD HH24:MI'),
          ' / ',
          COALESCE(l.location_name, '地点待定')
        ) AS meta,
        ${isRegisteredSelect}
      FROM event e
      ${participationJoin}
      LEFT JOIN location l ON l.location_id = e.location_id
      LEFT JOIN building b ON b.building_id = l.building_id
      LEFT JOIN campus c ON c.campus_id = b.campus_id
      LEFT JOIN department d ON d.dep_id = e.host_dep_id
      ${whereClause}
      ORDER BY e.start_time DESC, e.event_name
    `,
    params
  );

  return result.rows;
}
