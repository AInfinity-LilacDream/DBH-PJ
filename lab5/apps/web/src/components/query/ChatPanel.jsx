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

function getMessageText(message) {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  return message.content ?? "";
}

function hasActiveToolPart(message) {
  if (!Array.isArray(message.parts)) {
    return false;
  }

  return message.parts.some((part) => {
    if (!String(part.type ?? "").includes("tool")) {
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
    String(lastPart?.type ?? "").includes("tool") &&
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
  const scrollRef = useRef(null);
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_BASE_URL}/api/chat`
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
            const isQueryingDatabase = !isUser && isSending && isLatestMessage && hasActiveToolPart(message);
            const isThinking =
              !isUser && isSending && isLatestMessage && !isQueryingDatabase && (!content || isWaitingAfterToolCall(message));

            if (!isUser) {
              return (
                <React.Fragment key={message.id}>
                  {content ? (
                    <div className="mr-auto max-w-[82%] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                      <MarkdownMessage content={content} />
                    </div>
                  ) : null}
                  {isQueryingDatabase ? <DatabaseQueryNotice /> : null}
                  {isThinking ? <ThinkingBubble /> : null}
                </React.Fragment>
              );
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
