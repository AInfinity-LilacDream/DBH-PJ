import * as eventParticipationService from "../services/eventParticipationService.js";
import { isPagedResult, parsePagination } from "../utils/pagination.js";

export async function listMyEvents(req, res, next) {
  try {
    const result = await eventParticipationService.listMyUpcomingEvents(
      Number(req.params.userId),
      req.query,
      parsePagination(req.query)
    );

    if (isPagedResult(result)) {
      res.json({ data: result.rows, pagination: result.pagination });
      return;
    }

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function registerForEvent(req, res, next) {
  try {
    const result = await eventParticipationService.registerForEvent(
      Number(req.params.userId),
      Number(req.params.eventId)
    );
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function unregisterFromEvent(req, res, next) {
  try {
    const result = await eventParticipationService.unregisterFromEvent(
      Number(req.params.userId),
      Number(req.params.eventId)
    );
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}
