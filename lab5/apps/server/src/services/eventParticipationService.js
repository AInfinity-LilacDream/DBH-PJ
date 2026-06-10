import * as accountRepository from "../repositories/accountRepository.js";
import * as eventParticipationRepository from "../repositories/eventParticipationRepository.js";
import { HttpError } from "../utils/httpError.js";
import { createPaginationMeta } from "../utils/pagination.js";

async function requireBoundPeopleId(userId) {
  const account = await accountRepository.findByUserId(userId);

  if (!account) {
    throw new HttpError(404, "用户不存在");
  }

  if (!account.peopleId) {
    throw new HttpError(400, "请先在账户管理中绑定人员信息后再报名活动");
  }

  return account.peopleId;
}

async function requireUpcomingEvent(eventId) {
  const event = await eventParticipationRepository.findEventById(eventId);

  if (!event) {
    throw new HttpError(404, "活动不存在");
  }

  if (new Date(event.startTime) < new Date()) {
    throw new HttpError(400, "该活动已开始，无法报名");
  }

  return event;
}

export async function registerForEvent(userId, eventId) {
  const peopleId = await requireBoundPeopleId(userId);
  await requireUpcomingEvent(eventId);

  const alreadyRegistered = await eventParticipationRepository.isRegistered(peopleId, eventId);

  if (alreadyRegistered) {
    throw new HttpError(409, "您已报名该活动");
  }

  await eventParticipationRepository.register(peopleId, eventId);

  return { eventId, peopleId };
}

export async function unregisterFromEvent(userId, eventId) {
  const peopleId = await requireBoundPeopleId(userId);
  const removed = await eventParticipationRepository.unregister(peopleId, eventId);

  if (!removed) {
    throw new HttpError(404, "您尚未报名该活动");
  }

  return { eventId, peopleId };
}

export async function listMyUpcomingEvents(userId, filters = {}, pagination) {
  const account = await accountRepository.findByUserId(userId);

  if (!account) {
    throw new HttpError(404, "用户不存在");
  }

  if (!account.peopleId) {
    if (pagination) {
      return {
        rows: [],
        pagination: createPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total: 0 })
      };
    }

    return [];
  }

  return eventParticipationRepository.listUpcomingByParticipant(account.peopleId, filters, pagination);
}
