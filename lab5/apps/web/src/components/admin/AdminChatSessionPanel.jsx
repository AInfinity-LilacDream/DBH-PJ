import React, { useEffect, useMemo, useState } from "react";
import { Button, Chip, Input, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { getAdminChatSessionDetail, listAdminChatSessions } from "../../services/chatSessions.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

const roleLabelMap = {
  user: "用户",
  assistant: "助手",
  tool: "工具",
  system: "系统"
};

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function parseQueryResult(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function AdminChatSessionPanel() {
  const [keyword, setKeyword] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [message, setMessage] = useState("");

  const queryRecordsByMessageId = useMemo(() => {
    const map = new Map();

    (detail?.queryRecords ?? []).forEach((record) => {
      const key = record.messageId ?? "__session__";
      const records = map.get(key) ?? [];
      records.push(record);
      map.set(key, records);
    });

    return map;
  }, [detail]);

  async function loadSessions(nextKeyword = keyword, shouldSelectFirst = false) {
    setIsLoadingList(true);
    setMessage("");

    try {
      const result = await listAdminChatSessions(nextKeyword);
      const rows = result.data ?? [];
      setSessions(rows);

      if (rows[0]?.id && (shouldSelectFirst || !rows.some((row) => row.id === activeSessionId))) {
        setActiveSessionId(rows[0].id);
      }
    } catch (error) {
      setSessions([]);
      setMessage(error.message);
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    loadSessions("");
  }, []);

  useEffect(() => {
    if (!activeSessionId) {
      setDetail(null);
      return;
    }

    let isCurrent = true;

    async function loadDetail() {
      setIsLoadingDetail(true);
      setMessage("");

      try {
        const result = await getAdminChatSessionDetail(activeSessionId);
        if (isCurrent) {
          setDetail(result.data ?? null);
        }
      } catch (error) {
        if (isCurrent) {
          setDetail(null);
          setMessage(error.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingDetail(false);
        }
      }
    }

    loadDetail();

    return () => {
      isCurrent = false;
    };
  }, [activeSessionId]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setDetail(null);
    loadSessions(keyword, true);
  }

  return (
    <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <h3 className="text-lg font-black text-slate-950">对话会话审计</h3>
          <p className="mt-1 text-sm text-slate-500">只读查看用户对话和关联 SQL 记录。</p>
          <form className="mt-3 flex gap-2" onSubmit={handleSearchSubmit}>
            <Input
              aria-label="搜索会话"
              classNames={cleanInputClassNames}
              isClearable
              placeholder="用户或标题"
              radius="sm"
              value={keyword}
              variant="bordered"
              onClear={() => {
                setKeyword("");
                setDetail(null);
                loadSessions("", true);
              }}
              onValueChange={setKeyword}
            />
            <Button isIconOnly aria-label="搜索" className="h-14 w-14" radius="sm" type="submit">
              <Icon icon="lucide:search" width={18} height={18} />
            </Button>
          </form>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {isLoadingList ? (
            <div className="grid h-32 place-items-center">
              <Spinner size="sm" />
            </div>
          ) : null}
          {!isLoadingList && sessions.length === 0 ? (
            <div className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">暂无对话会话</div>
          ) : null}
          <div className="grid gap-2">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;

              return (
                <button
                  key={session.id}
                  className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                    isActive ? "border-primary bg-primary/10" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  type="button"
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{session.title || "新对话"}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{session.username}</p>
                    </div>
                    <Chip radius="sm" size="sm" variant="flat">
                      {session.messageCount ?? 0}
                    </Chip>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(session.updatedAt)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-black text-slate-950">
                {detail?.session?.title || "选择一个会话"}
              </h3>
              {detail?.session ? (
                <p className="mt-1 text-sm text-slate-500">
                  {detail.session.username} · {formatDateTime(detail.session.createdAt)}
                </p>
              ) : null}
            </div>
            {detail?.session ? (
              <Chip radius="sm" variant="flat">
                {detail.session.titleStatus}
              </Chip>
            ) : null}
          </div>
        </div>

        {message ? <div className="mx-5 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{message}</div> : null}

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {isLoadingDetail ? (
            <div className="grid h-40 place-items-center">
              <Spinner />
            </div>
          ) : null}
          {!isLoadingDetail && !detail ? (
            <div className="grid h-40 place-items-center rounded-lg bg-slate-50 text-sm text-slate-500">
              请选择左侧会话查看消息。
            </div>
          ) : null}
          {!isLoadingDetail && detail ? (
            <div className="grid gap-4">
              {detail.messages.map((messageItem) => {
                const records = queryRecordsByMessageId.get(messageItem.id) ?? [];
                const isUser = messageItem.role === "user";

                return (
                  <article
                    key={messageItem.id}
                    className={`grid gap-3 rounded-lg border px-4 py-3 ${
                      isUser ? "border-slate-900/10 bg-slate-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip color={isUser ? "primary" : "default"} radius="sm" size="sm" variant="flat">
                        {roleLabelMap[messageItem.role] ?? messageItem.role}
                      </Chip>
                      <span className="text-xs text-slate-400">{formatDateTime(messageItem.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{messageItem.content}</p>
                    {records.length > 0 ? (
                      <div className="grid gap-2 rounded-lg bg-slate-50 px-3 py-3">
                        {records.map((record) => {
                          const summary = parseQueryResult(record.queryResult);

                          return (
                            <div key={record.id} className="grid gap-2 text-xs leading-5 text-slate-600">
                              <div className="flex flex-wrap items-center gap-2">
                                <Chip radius="sm" size="sm" variant="flat">
                                  {summary.statementType ?? "SQL"}
                                </Chip>
                                <span>{formatDateTime(record.queryTime)}</span>
                                <span>{summary.rowCount ?? 0} 行</span>
                              </div>
                              <pre className="max-h-32 overflow-auto rounded-md bg-white px-3 py-2 text-xs text-slate-800">
                                <code>{record.rawQuestion}</code>
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
