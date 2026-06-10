import React, { useEffect, useState } from "react";
import { queryNavItems } from "../config/queryNavItems.js";
import { roleTextMap } from "../constants/roleTextMap.js";
import { QuerySidebar } from "../components/query/QuerySidebar.jsx";
import { QueryTopHeader } from "../components/query/QueryTopHeader.jsx";
import { QueryMobileNav } from "../components/query/QueryMobileNav.jsx";
import { MyEventsPanel } from "../components/query/MyEventsPanel.jsx";
import { QueryContentPanel } from "../components/query/QueryContentPanel.jsx";
import { getChatSessionMessages, listChatSessions } from "../services/chatSessions.js";

function resolveInitialActiveKey(initialActiveKey) {
  if (initialActiveKey && queryNavItems.some((item) => item.key === initialActiveKey)) {
    return initialActiveKey;
  }

  return queryNavItems[0].key;
}

export function QueryDashboard({ user, initialActiveKey, onEnterAccount, onEnterAdmin, onLogout }) {
  const isAdmin = user?.roleType === "admin";
  const [activeKey, setActiveKey] = useState(() => resolveInitialActiveKey(initialActiveKey));
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSessionMessages, setActiveSessionMessages] = useState([]);
  const [loadedSessionId, setLoadedSessionId] = useState(null);
  const [chatHistoryMessage, setChatHistoryMessage] = useState("");
  const activeItem = queryNavItems.find((item) => item.key === activeKey) ?? queryNavItems[0];
  const isMyEvents = activeKey === "my-events";
  const displayName = user?.name || user?.username || "访客";
  const roleText = roleTextMap[user?.roleType] ?? user?.roleType ?? "未登录";
  const activeSession = chatSessions.find((session) => session.id === activeSessionId) ?? null;

  async function refreshChatSessions() {
    if (!user?.userId) {
      setChatSessions([]);
      return;
    }

    try {
      const result = await listChatSessions();
      setChatSessions(result.data ?? []);
      setChatHistoryMessage("");
    } catch (error) {
      setChatSessions([]);
      setChatHistoryMessage(error.message);
    }
  }

  useEffect(() => {
    refreshChatSessions();
  }, [user?.userId]);

  function handleSwitchItem(key) {
    setActiveKey(key);

    if (key === "new-chat") {
      setActiveSessionId(null);
      setActiveSessionMessages([]);
      setLoadedSessionId(null);
    }
  }

  function handleSessionCreated(session) {
    if (!session?.id) {
      return;
    }

    setActiveSessionId(session.id);
    setLoadedSessionId(null);
    setChatSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
  }

  async function handleSelectChatSession(sessionId) {
    try {
      const result = await getChatSessionMessages(sessionId);
      setActiveKey("new-chat");
      setActiveSessionId(sessionId);
      setActiveSessionMessages(result.data?.messages ?? []);
      setLoadedSessionId(sessionId);
      setChatHistoryMessage("");
    } catch (error) {
      setChatHistoryMessage(error.message);
    }
  }

  function handleNewChat() {
    setActiveKey("new-chat");
    setActiveSessionId(null);
    setActiveSessionMessages([]);
    setLoadedSessionId(null);
  }

  function handleSettingsAction(key) {
    if (key === "account") {
      onEnterAccount();
      return;
    }

    if (key === "admin") {
      onEnterAdmin();
      return;
    }

    if (key === "logout") {
      onLogout();
    }
  }

  return (
    <main className="flex h-screen overflow-hidden bg-white text-slate-950">
      <QuerySidebar
        navItems={queryNavItems}
        activeItemKey={activeKey}
        displayName={displayName}
        roleText={roleText}
        isAdmin={isAdmin}
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        chatHistoryMessage={chatHistoryMessage}
        onSwitchItem={handleSwitchItem}
        onSelectChatSession={handleSelectChatSession}
        onNewChat={handleNewChat}
        onSettingsAction={handleSettingsAction}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <QueryTopHeader />
        <QueryMobileNav navItems={queryNavItems} activeItemKey={activeKey} onSwitchItem={handleSwitchItem} />
        {isMyEvents ? (
          <MyEventsPanel user={user} activeItem={activeItem} onEnterAccount={onEnterAccount} />
        ) : (
          <QueryContentPanel
            activeItem={activeItem}
            user={user}
            activeSession={activeSession}
            activeSessionId={activeSessionId}
            activeSessionMessages={activeSessionMessages}
            loadedSessionId={loadedSessionId}
            onSessionCreated={handleSessionCreated}
            onNewChat={handleNewChat}
            onRefreshSessions={refreshChatSessions}
          />
        )}
      </div>
    </main>
  );
}
