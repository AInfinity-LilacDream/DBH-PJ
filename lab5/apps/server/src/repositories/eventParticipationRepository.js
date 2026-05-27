import { query } from "../db/pool.js";
import { decodeCompositeKey, encodeCompositeKey } from "../utils/compositeKey.js";
import { ensureAffected, requireNumber } from "../utils/payload.js";

export async function listAll() {
  const result = await query(`
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
    ORDER BY ep.register_time DESC
  `);

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
