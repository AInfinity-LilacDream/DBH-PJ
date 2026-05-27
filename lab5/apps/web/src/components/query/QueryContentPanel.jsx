import React, { useEffect, useState } from "react";
import { Input } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { ChatPanel } from "./ChatPanel.jsx";
import { EventCard } from "./EventCard.jsx";
import { WaterfallCard } from "./WaterfallCard.jsx";
import { registerForEvent } from "../../services/eventParticipationApi.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

export function QueryContentPanel({ activeItem, user }) {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isEventQuery = activeItem.key === "event-query";

  function notify(message, color = "success") {
    addToast({
      title: message,
      color,
      timeout: 2600
    });
  }

  async function handleRegister(eventId) {
    try {
      await registerForEvent(user.userId, eventId);
      setItems((current) =>
        current.map((item) => (item.eventId === eventId ? { ...item, isRegistered: true } : item))
      );
      notify("报名成功。");
    } catch (error) {
      notify(error.message, "danger");
      throw error;
    }
  }

  useEffect(() => {
    if (activeItem.key === "new-chat") {
      return;
    }

    let isCurrent = true;

    async function loadItems() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = isEventQuery
          ? await activeItem.search(keyword, user?.peopleId ?? undefined)
          : await activeItem.search(keyword);

        if (isCurrent) {
          setItems(result.data ?? []);
        }
      } catch (error) {
        if (isCurrent) {
          setItems([]);
          setErrorMessage(error.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isCurrent = false;
    };
  }, [activeItem, keyword, user?.peopleId, isEventQuery]);

  if (activeItem.key === "new-chat") {
    return <ChatPanel />;
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f7f8fa]">
      <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>首页</span>
              <span>/</span>
              <span>信息查询</span>
            </div>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{activeItem.label}</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-6 sm:px-8">
        <div className="grid gap-5">
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h3 className="text-lg font-bold text-slate-950">全部{activeItem.label.replace("查询", "")}信息</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{activeItem.description}</p>
            </div>
            <Input
              className="w-full sm:w-80"
              aria-label={`${activeItem.label}关键词搜索`}
              classNames={cleanInputClassNames}
              isClearable
              placeholder="关键词搜索"
              radius="sm"
              value={keyword}
              variant="bordered"
              onClear={() => setKeyword("")}
              onValueChange={setKeyword}
            />
          </section>

          {isLoading && (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              加载中...
            </section>
          )}

          {errorMessage && !isLoading && (
            <section className="rounded-lg border border-red-100 bg-red-50 p-8 text-center text-sm text-red-700">
              {errorMessage}
            </section>
          )}

          {!isLoading && !errorMessage && items.length > 0 ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((item) =>
                isEventQuery ? (
                  <EventCard
                    key={item.eventId ?? `${item.title}-${item.meta}`}
                    item={item}
                    user={user}
                    onRegister={handleRegister}
                  />
                ) : (
                  <WaterfallCard key={`${item.title}-${item.meta}`} item={item} />
                )
              )}
            </section>
          ) : null}

          {!isLoading && !errorMessage && items.length === 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              没有匹配的内容
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
