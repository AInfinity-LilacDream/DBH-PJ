import React, { useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";

function isUpcoming(startTime) {
  if (!startTime) {
    return false;
  }

  return new Date(startTime).getTime() >= Date.now();
}

export function EventCard({ item, user, onRegister, onUnregister, showRegisterAction = true }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const upcoming = useMemo(() => isUpcoming(item.startTime), [item.startTime]);
  const canRegister = Boolean(user?.peopleId) && upcoming && !item.isRegistered;
  const canUnregister = Boolean(user?.peopleId) && item.isRegistered && upcoming;

  async function handleRegister() {
    if (!onRegister || !item.eventId) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onRegister(item.eventId);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUnregister() {
    if (!onUnregister || !item.eventId) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onUnregister(item.eventId);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="flex min-h-52 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-black leading-6 text-slate-950">{item.title || "未命名"}</h3>
        <Chip color="primary" radius="sm" size="sm" variant="flat">
          {item.tag || "未分类"}
        </Chip>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-500">{item.meta || "暂无元信息"}</p>
      {item.hostDepartmentName ? (
        <p className="mt-1 text-xs text-slate-500">主办：{item.hostDepartmentName}</p>
      ) : null}
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{item.description || "暂无描述"}</p>

      {showRegisterAction ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!user?.peopleId ? (
            <p className="text-xs text-amber-700">请先在账户管理中绑定人员信息后再报名</p>
          ) : null}
          {user?.peopleId && !upcoming ? (
            <Button isDisabled radius="sm" size="sm" variant="flat">
              活动已开始
            </Button>
          ) : null}
          {canRegister ? (
            <Button color="primary" isLoading={isSubmitting} radius="sm" size="sm" onPress={handleRegister}>
              报名
            </Button>
          ) : null}
          {user?.peopleId && upcoming && item.isRegistered ? (
            <Button isDisabled radius="sm" size="sm" variant="flat">
              已报名
            </Button>
          ) : null}
          {canUnregister ? (
            <Button
              color="danger"
              isLoading={isSubmitting}
              radius="sm"
              size="sm"
              variant="light"
              onPress={handleUnregister}
            >
              取消报名
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
