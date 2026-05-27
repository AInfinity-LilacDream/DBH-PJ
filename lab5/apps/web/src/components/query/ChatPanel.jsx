import React, { useState } from "react";
import { Button, Textarea } from "@heroui/react";
import { chatSuggestions } from "../../config/queryNavItems.js";
import { cleanInputClassNames } from "../../styles/inputClassNames.js";

export function ChatPanel() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "你好，我是复旦百事通。现在是前端对话框占位，后续会接入后端问答接口。"
    }
  ]);

  function sendMessage() {
    const content = draft.trim();

    if (!content) {
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "user", content },
      { role: "assistant", content: "收到。这里之后会展示基于数据库查询生成的回答。" }
    ]);
    setDraft("");
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

      <div className="flex-1 overflow-auto px-5 py-6 sm:px-8">
        <div className="mx-auto grid max-w-3xl gap-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[82%] rounded-lg bg-slate-900 px-4 py-3 text-sm leading-6 text-white"
                  : "mr-auto max-w-[82%] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm"
              }
            >
              {message.content}
            </div>
          ))}
        </div>
      </div>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto grid max-w-3xl gap-3">
          <div className="flex flex-wrap gap-2">
            {chatSuggestions.map((item) => (
              <Button key={item} size="sm" radius="sm" variant="flat" onPress={() => setDraft(item)}>
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
            <Button color="primary" radius="sm" onPress={sendMessage}>
              发送
            </Button>
          </div>
        </div>
      </footer>
    </section>
  );
}
