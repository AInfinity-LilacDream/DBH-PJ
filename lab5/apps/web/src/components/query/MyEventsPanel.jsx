import React, { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { EventCard } from "./EventCard.jsx";
import { listMyEvents, unregisterFromEvent } from "../../services/eventParticipationApi.js";

export function MyEventsPanel({ user, activeItem, onEnterAccount }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  function notify(message, color = "success") {
    addToast({
      title: message,
      color,
      timeout: 2600
    });
  }

  async function loadItems() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await listMyEvents(user.userId);
      setItems(result.data ?? []);
    } catch (error) {
      setItems([]);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [user.userId]);

  async function handleUnregister(eventId) {
    await unregisterFromEvent(user.userId, eventId);
    notify("已取消报名。");
    await loadItems();
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f7f8fa]">
      <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>首页</span>
              <span>/</span>
              <span>我的活动</span>
            </div>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{activeItem.label}</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-6 sm:px-8">
        <div className="grid gap-5">
          <section>
            <h3 className="text-lg font-bold text-slate-950">已报名的即将开始活动</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{activeItem.description}</p>
          </section>

          {!user?.peopleId ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              <p>您尚未绑定人员信息，无法查看已报名活动。</p>
              <Button className="mt-4" color="primary" radius="sm" onPress={onEnterAccount}>
                前往账户管理
              </Button>
            </section>
          ) : null}

          {isLoading ? (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              加载中...
            </section>
          ) : null}

          {errorMessage && !isLoading ? (
            <section className="rounded-lg border border-red-100 bg-red-50 p-8 text-center text-sm text-red-700">
              {errorMessage}
            </section>
          ) : null}

          {!isLoading && !errorMessage && user?.peopleId && items.length > 0 ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((item) => (
                <EventCard
                  key={item.eventId}
                  item={{ ...item, isRegistered: true }}
                  user={user}
                  showRegisterAction
                  onUnregister={handleUnregister}
                />
              ))}
            </section>
          ) : null}

          {!isLoading && !errorMessage && user?.peopleId && items.length === 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              暂无将要开展的活动。可在「活动查询」中浏览并报名。
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
