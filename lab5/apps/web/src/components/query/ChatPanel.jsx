import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button, Textarea } from "@heroui/react";
import { chatSuggestions } from "../../config/queryNavItems.js";
import { API_BASE_URL } from "../../services/http.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

function getMessageText(message) {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  return message.content ?? "";
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

  async function handleSubmit(event) {
    event.preventDefault();
    const content = draft.trim();

    if (!content || isSending) {
      return;
    }

    setDraft("");
    await sendMessage({ text: content });
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

          {chatMessages.map((message) => {
            const content = getMessageText(message);

            return (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[82%] whitespace-pre-wrap rounded-lg bg-slate-900 px-4 py-3 text-sm leading-6 text-white"
                    : "mr-auto max-w-[82%] whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm"
                }
              >
                {content || (message.role === "assistant" ? "正在思考..." : "")}
              </div>
            );
          })}

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
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px]">
            <Textarea
              aria-label="对话输入"
              classNames={cleanInputClassNames}
              minRows={1}
              maxRows={4}
              placeholder="输入你想查询的校园问题"
              radius="sm"
              value={draft}
              variant="bordered"
              onValueChange={setDraft}
            />
            <Button color={isSending ? "default" : "primary"} radius="sm" type={isSending ? "button" : "submit"} onPress={isSending ? stop : undefined}>
              {isSending ? "停止" : "发送"}
            </Button>
          </div>
        </form>
      </footer>
    </section>
  );
}
