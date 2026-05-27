import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  Button,
  Chip,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Textarea
} from "@heroui/react";
import { listCatalogItems } from "../services/catalogApi.js";
import { cleanInputClassNames } from "../styles/inputClassNames.js";

const commonNavItems = [
  {
    key: "new-chat",
    label: "新建对话",
    icon: "lucide:message-square-plus",
    description: "通过自然语言查询地点、课程和活动信息。"
  },
  {
    key: "location-query",
    label: "地点查询",
    icon: "lucide:map-pin",
    description: "查询校区、楼宇、教室、食堂、自习室等空间信息。"
  },
  {
    key: "course-query",
    label: "课程查询",
    icon: "lucide:book-open",
    description: "查询课程、授课教师、开课院系和学期信息。"
  },
  {
    key: "event-query",
    label: "活动查询",
    icon: "lucide:calendar-days",
    description: "查询讲座、论坛、招聘宣讲、文体活动等校园事件。"
  }
];

const roleTextMap = {
  student: "学生",
  teacher: "教师",
  admin: "管理员"
};

const chatSuggestions = [
  "邯郸校区有哪些晚上开放的自习室？",
  "数据库设计这门课由谁授课？",
  "这周有什么讲座或招聘宣讲？"
];

function NavButton({ item, isActive, onPress }) {
  return (
    <Button
      className="h-11 justify-start gap-3 px-3 text-sm font-semibold"
      color={isActive ? "primary" : "default"}
      radius="sm"
      variant={isActive ? "flat" : "light"}
      onPress={onPress}
      fullWidth
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/80 text-slate-700 shadow-sm">
        <Icon icon={item.icon} width={18} height={18} />
      </span>
      <span className="truncate">{item.label}</span>
    </Button>
  );
}

function WaterfallCard({ item }) {
  return (
    <article className="flex min-h-44 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-black leading-6 text-slate-950">{item.title || "未命名"}</h3>
        <Chip color="primary" radius="sm" size="sm" variant="flat">
          {item.tag || "未分类"}
        </Chip>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-500">{item.meta || "暂无元信息"}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{item.description || "暂无描述"}</p>
    </article>
  );
}

function ChatPanel() {
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

function ContentPanel({ activeItem }) {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (activeItem.key === "new-chat") {
      return;
    }

    let isCurrent = true;

    async function loadItems() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await listCatalogItems(activeItem.key, keyword);

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
  }, [activeItem.key, keyword]);

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
              {items.map((item) => (
                <WaterfallCard key={`${item.title}-${item.meta}`} item={item} />
              ))}
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

export function QueryDashboard({ user, onEnterAdmin, onLogout }) {
  const isAdmin = user?.roleType === "admin";
  const navItems = commonNavItems;
  const [activeKey, setActiveKey] = useState(navItems[0].key);
  const activeItem = navItems.find((item) => item.key === activeKey) ?? navItems[0];
  const displayName = user?.name || user?.username || "访客";
  const roleText = roleTextMap[user?.roleType] ?? user?.roleType ?? "未登录";

  function handleSettingsAction(key) {
    if (key === "admin") {
      onEnterAdmin();
      return;
    }

    if (key === "logout") {
      onLogout();
    }
  }

  return (
    <main className="flex min-h-screen bg-white text-slate-950">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-[#fbfaf7] lg:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-lg font-black text-white">
              F
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black">复旦百事通</p>
              <p className="text-xs font-semibold uppercase text-slate-500">Campus Assistant</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-auto px-3 py-4">
          <div className="grid gap-1">
            {commonNavItems.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                isActive={activeItem.key === item.key}
                onPress={() => setActiveKey(item.key)}
              />
            ))}
          </div>

        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-950">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{roleText}</p>
            </div>
            <Dropdown placement="top-end">
              <DropdownTrigger>
                <Button aria-label="设置" className="h-11 w-11" isIconOnly radius="sm" variant="light">
                  <Icon icon="lucide:settings" width={20} height={20} />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="账户设置菜单" onAction={(key) => handleSettingsAction(String(key))}>
                <DropdownItem key="account">管理账户</DropdownItem>
                {isAdmin ? <DropdownItem key="admin">进入管理端</DropdownItem> : null}
                <DropdownItem key="logout" className="text-danger" color="danger">
                  退出登录
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-primary">Fudan Campus Assistant</p>
            <h1 className="truncate text-xl font-black text-slate-950">复旦百事通</h1>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-[#fbfaf7] px-4 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <Button
                key={item.key}
                className="shrink-0"
                color={activeItem.key === item.key ? "primary" : "default"}
                radius="sm"
                variant={activeItem.key === item.key ? "flat" : "bordered"}
                onPress={() => setActiveKey(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <ContentPanel activeItem={activeItem} />
      </div>
    </main>
  );
}
