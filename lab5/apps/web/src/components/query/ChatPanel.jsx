import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button, Textarea } from "@heroui/react";
import { Icon } from "@iconify/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatSuggestions } from "../../config/queryNavItems.js";
import { API_BASE_URL } from "../../services/http.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

const chatTextareaClassNames = {
  ...cleanInputClassNames,
  inputWrapper: [...cleanInputClassNames.inputWrapper, "pr-12"],
  input: [...cleanInputClassNames.input, "pr-2"]
};

function getAuthHeaders() {
  const token = localStorage.getItem("dbh_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function resolveSqlConfirmation(confirmationId, approved) {
  const response = await fetch(`${API_BASE_URL}/api/chat/sql-confirmations/${confirmationId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({ approved })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "确认操作失败");
  }

  return data.data;
}

function getMessageText(message) {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  return message.content ?? "";
}

function isConfirmationResponseText(content) {
  return (
    content.startsWith("我已确认这个可能修改数据库的操作，后端已执行该 SQL。") ||
    content.startsWith("我已拒绝这个可能修改数据库的操作，后端未执行该 SQL。") ||
    content.startsWith("我确认执行这个可能修改数据库的操作。") ||
    content.startsWith("我拒绝执行这个可能修改数据库的操作。")
  );
}

function isToolPart(part) {
  return String(part?.type ?? "").includes("tool");
}

function getToolOutput(part) {
  if (part?.state !== "output-available") {
    return null;
  }

  return part.output ?? part.result ?? null;
}

function getExecutedSqlParts(message) {
  if (!Array.isArray(message.parts)) {
    return [];
  }

  return message.parts
    .filter((part) => {
      if (!isToolPart(part)) {
        return false;
      }

      const output = getToolOutput(part);
      // Only show executed SQL (has result, not pending confirmation, not denied)
      return output && !output.needsConfirmation && !output.denied && output.result;
    })
    .map((part) => getToolOutput(part));
}

function getPendingConfirmation(message) {
  if (!Array.isArray(message.parts)) {
    return null;
  }

  for (const part of message.parts) {
    if (!isToolPart(part)) {
      continue;
    }

    const output = getToolOutput(part);
    if (output?.needsConfirmation && output?.confirmationId && output?.sql) {
      return output;
    }
  }

  return null;
}

function hasActiveToolPart(message) {
  if (!Array.isArray(message.parts)) {
    return false;
  }

  return message.parts.some((part) => {
    if (!isToolPart(part)) {
      return false;
    }

    return part.state !== "output-available" && part.state !== "output-error" && part.state !== "output-denied";
  });
}

function isWaitingAfterToolCall(message) {
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    return false;
  }

  const lastPart = message.parts[message.parts.length - 1];

  return (
    isToolPart(lastPart) &&
    ["output-available", "output-error", "output-denied"].includes(lastPart?.state)
  );
}

function LoadingDots() {
  return (
    <div className="flex h-6 items-center gap-1" aria-label="正在思考">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="mr-auto max-w-[82%] rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <LoadingDots />
    </div>
  );
}

function DatabaseQueryNotice() {
  return (
    <div className="mr-auto max-w-[82%] rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-500">
      正在查询数据库...
    </div>
  );
}

function SqlConfirmationCard({ confirmation, decision, error, disabled, onConfirm, onReject }) {
  const isHandled = Boolean(decision);
  const confirmSelected = decision === "confirmed" || decision === "confirming";
  const rejectSelected = decision === "rejected" || decision === "rejecting";
  const handledButtonClass = "pointer-events-none";
  const idleButtonClass = isHandled ? "pointer-events-none bg-slate-200 text-slate-400" : "";

  return (
    <div className="mr-auto grid max-w-[82%] gap-3 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
      <div>
        <div className="font-semibold text-slate-900">可能修改数据库的操作</div>
        <div className="mt-1 text-slate-500">{confirmation.reason || confirmation.message || "AI 请求执行一条写入 SQL。"}</div>
      </div>
      <pre className="max-h-40 overflow-auto rounded-md bg-white px-3 py-2 text-xs leading-5 text-slate-800">
        <code>{confirmation.sql}</code>
      </pre>
      {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-xs leading-5 text-red-600">{error}</div> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          className={confirmSelected ? handledButtonClass : idleButtonClass}
          color={confirmSelected || !isHandled ? "primary" : "default"}
          isDisabled={disabled && !isHandled}
          radius="sm"
          size="sm"
          type="button"
          variant={confirmSelected || !isHandled ? "solid" : "flat"}
          onPress={() => onConfirm(confirmation)}
        >
          确认
        </Button>
        <Button
          className={rejectSelected ? handledButtonClass : idleButtonClass}
          color={rejectSelected ? "danger" : "default"}
          isDisabled={disabled && !isHandled}
          radius="sm"
          size="sm"
          type="button"
          variant={rejectSelected ? "solid" : "flat"}
          onPress={() => onReject(confirmation)}
        >
          拒绝
        </Button>
      </div>
    </div>
  );
}

function SqlExecutionDetail({ sql, reason, statementType, rowCount }) {
  const [expanded, setExpanded] = useState(false);
  const isWrite = ["insert", "update", "delete"].includes(statementType?.toLowerCase());

  return (
    <div className="mr-auto max-w-[82%] rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs leading-5 text-slate-600">
      <button
        className="flex w-full items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900"
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Icon icon={expanded ? "lucide:chevron-down" : "lucide:chevron-right"} width={14} height={14} />
        <span>
          已执行{isWrite ? "写入" : "查询"}：{reason || "数据库操作"}
        </span>
        {typeof rowCount === "number" ? (
          <span className="ml-auto text-slate-400">
            {rowCount} 行
          </span>
        ) : null}
      </button>
      {expanded ? (
        <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-white px-3 py-2 text-xs leading-5 text-slate-800 border border-slate-100">
          <code>{sql}</code>
        </pre>
      ) : null}
    </div>
  );
}

function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
        a: ({ children, href }) => (
          <a className="font-medium text-primary underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.startsWith("language-");

          return isBlock ? (
            <code className={`${className} block overflow-x-auto whitespace-pre rounded-md bg-slate-950 px-3 py-2 text-xs leading-5 text-slate-50`}>
              {children}
            </code>
          ) : (
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-slate-900">{children}</code>
          );
        },
        pre: ({ children }) => <pre className="mb-2 overflow-x-auto last:mb-0">{children}</pre>,
        table: ({ children }) => (
          <div className="mb-2 overflow-x-auto last:mb-0">
            <table className="min-w-full border-collapse text-left text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-900">{children}</th>,
        td: ({ children }) => <td className="border border-slate-200 px-2 py-1 align-top">{children}</td>
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ChatPanel() {
  const [draft, setDraft] = useState("");
  const [confirmationDecisions, setConfirmationDecisions] = useState({});
  const [confirmationErrors, setConfirmationErrors] = useState({});
  const scrollRef = useRef(null);
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_BASE_URL}/api/chat`,
      headers: getAuthHeaders
    })
  });
  const chatMessages = Array.isArray(messages) ? messages : [];
  const isSending = status === "submitted" || status === "streaming";

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [chatMessages]);

  async function submitDraft() {
    const content = draft.trim();

    if (!content || isSending) {
      return;
    }

    setDraft("");
    await sendMessage({ text: content });
  }

  async function respondToConfirmation(confirmation, decision) {
    if (!confirmation?.confirmationId || isSending || confirmationDecisions[confirmation.confirmationId]) {
      return;
    }

    const approved = decision === "confirmed";
    const pendingDecision = approved ? "confirming" : "rejecting";
    setConfirmationDecisions((current) => ({
      ...current,
      [confirmation.confirmationId]: pendingDecision
    }));
    setConfirmationErrors((current) => ({
      ...current,
      [confirmation.confirmationId]: ""
    }));

    try {
      const confirmationResult = await resolveSqlConfirmation(confirmation.confirmationId, approved);

      setConfirmationDecisions((current) => ({
        ...current,
        [confirmation.confirmationId]: decision
      }));

      if (!approved) {
        await sendMessage({
          text: [
            "我已拒绝这个可能修改数据库的操作，后端未执行该 SQL。",
            `confirmationId: ${confirmation.confirmationId}`,
            `reason: ${confirmation.reason ?? ""}`,
            "SQL:",
            confirmation.sql,
            "请取消该操作，不要修改数据库，并告诉我已经取消。"
          ].join("\n")
        });
        return;
      }

      await sendMessage({
        text: [
          "我已确认这个可能修改数据库的操作，后端已执行该 SQL。",
          `confirmationId: ${confirmation.confirmationId}`,
          `reason: ${confirmation.reason ?? ""}`,
          "SQL:",
          confirmation.sql,
          "执行结果:",
          JSON.stringify(confirmationResult?.result ?? confirmationResult, null, 2),
          "请基于该执行结果继续说明。",
          "如果原计划还需要更多数据库修改，请立刻调用 runSql 生成下一条写库 SQL 的待确认操作。",
          "不要在 Markdown 里展示确认 ID，也不要要求我用文字回复“确认”；前端只会根据 runSql 的 needsConfirmation 结果展示确认按钮。"
        ].join("\n")
      });
    } catch (error) {
      setConfirmationDecisions((current) => {
        const next = { ...current };
        delete next[confirmation.confirmationId];
        return next;
      });
      setConfirmationErrors((current) => ({
        ...current,
        [confirmation.confirmationId]: error instanceof Error ? error.message : "确认操作失败"
      }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await submitDraft();
  }

  function handleTextareaKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    submitDraft();
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#f7f8fa]">
      <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>首页</span>
            <span>/</span>
            <span>智能问答</span>
          </div>
          <h2 className="mt-1 truncate text-2xl font-black text-slate-950">新建对话</h2>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto px-5 py-6 sm:px-8">
        <div className="mx-auto grid max-w-3xl gap-4">
          {chatMessages.length === 0 ? (
            <div className="mr-auto max-w-[82%] whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
              你好，我是复旦百事通。你可以问我校园信息查询相关的问题。
            </div>
          ) : null}

          {chatMessages.map((message, index) => {
            const content = getMessageText(message);
            const isUser = message.role === "user";
            const isLatestMessage = index === chatMessages.length - 1;
            const pendingConfirmation = !isUser ? getPendingConfirmation(message) : null;
            const isQueryingDatabase = !isUser && isSending && isLatestMessage && hasActiveToolPart(message);
            const isThinking =
              !isUser && isSending && isLatestMessage && !isQueryingDatabase && (!content || isWaitingAfterToolCall(message));
            const executedSqls = !isUser ? getExecutedSqlParts(message) : [];

            if (!isUser) {
              return (
                <React.Fragment key={message.id}>
                  {executedSqls.map((exec, execIndex) => (
                    <SqlExecutionDetail
                      key={`${message.id}-sql-${execIndex}`}
                      sql={exec.sql}
                      reason={exec.reason}
                      statementType={exec.result?.statementType}
                      rowCount={exec.result?.rowCount}
                    />
                  ))}
                  {content && !pendingConfirmation ? (
                    <div className="mr-auto max-w-[82%] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                      <MarkdownMessage content={content} />
                    </div>
                  ) : null}
                  {pendingConfirmation ? (
                    <SqlConfirmationCard
                      confirmation={pendingConfirmation}
                      decision={confirmationDecisions[pendingConfirmation.confirmationId]}
                      error={confirmationErrors[pendingConfirmation.confirmationId]}
                      disabled={isSending}
                      onConfirm={(nextConfirmation) => respondToConfirmation(nextConfirmation, "confirmed")}
                      onReject={(nextConfirmation) => respondToConfirmation(nextConfirmation, "rejected")}
                    />
                  ) : null}
                  {isQueryingDatabase ? <DatabaseQueryNotice /> : null}
                  {isThinking ? <ThinkingBubble /> : null}
                </React.Fragment>
              );
            }

            if (isConfirmationResponseText(content)) {
              return null;
            }

            return (
              <div
                key={message.id}
                className="ml-auto max-w-[82%] whitespace-pre-wrap rounded-lg bg-slate-900 px-4 py-3 text-sm leading-6 text-white"
              >
                {content}
              </div>
            );
          })}

          {isSending && chatMessages[chatMessages.length - 1]?.role === "user" ? <ThinkingBubble /> : null}

          {error ? (
            <div className="mr-auto max-w-[82%] rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error.message || "AI 响应失败，请稍后重试。"}
            </div>
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
        <form className="mx-auto grid max-w-3xl gap-3" onSubmit={handleSubmit}>
          <div className="flex flex-wrap gap-2">
            {chatSuggestions.map((item) => (
              <Button key={item} size="sm" radius="sm" type="button" variant="flat" onPress={() => setDraft(item)}>
                {item}
              </Button>
            ))}
          </div>
          <div className="group relative">
            <Textarea
              aria-label="对话输入"
              classNames={chatTextareaClassNames}
              minRows={1}
              maxRows={4}
              placeholder="输入你想查询的校园问题"
              radius="sm"
              value={draft}
              variant="bordered"
              onKeyDown={handleTextareaKeyDown}
              onValueChange={setDraft}
            />
            <Button
              isIconOnly
              aria-label={isSending ? "停止生成" : "发送消息"}
              className="absolute right-2 top-1/2 z-10 h-8 w-8 min-w-8 -translate-y-1/2 bg-transparent text-default-200 transition-colors hover:bg-transparent hover:text-default-400 group-hover:text-default-400 group-focus-within:!text-default-foreground"
              radius="full"
              size="sm"
              type="button"
              variant="light"
              onPress={isSending ? stop : submitDraft}
            >
              <Icon icon={isSending ? "lucide:square" : "lucide:send-horizontal"} width={16} height={16} />
            </Button>
          </div>
        </form>
      </footer>
    </section>
  );
}
