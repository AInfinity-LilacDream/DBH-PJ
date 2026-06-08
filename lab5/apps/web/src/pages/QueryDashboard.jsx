import React, { useState } from "react";
import { queryNavItems } from "../config/queryNavItems.js";
import { roleTextMap } from "../constants/roleTextMap.js";
import { QuerySidebar } from "../components/query/QuerySidebar.jsx";
import { QueryTopHeader } from "../components/query/QueryTopHeader.jsx";
import { QueryMobileNav } from "../components/query/QueryMobileNav.jsx";
import { MyEventsPanel } from "../components/query/MyEventsPanel.jsx";
import { QueryContentPanel } from "../components/query/QueryContentPanel.jsx";

function resolveInitialActiveKey(initialActiveKey) {
  if (initialActiveKey && queryNavItems.some((item) => item.key === initialActiveKey)) {
    return initialActiveKey;
  }

  return queryNavItems[0].key;
}

export function QueryDashboard({ user, initialActiveKey, onEnterAccount, onEnterAdmin, onLogout }) {
  const isAdmin = user?.roleType === "admin";
  const [activeKey, setActiveKey] = useState(() => resolveInitialActiveKey(initialActiveKey));
  const activeItem = queryNavItems.find((item) => item.key === activeKey) ?? queryNavItems[0];
  const isMyEvents = activeKey === "my-events";
  const displayName = user?.name || user?.username || "访客";
  const roleText = roleTextMap[user?.roleType] ?? user?.roleType ?? "未登录";

  function handleSwitchItem(key) {
    setActiveKey(key);
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
        onSwitchItem={handleSwitchItem}
        onSettingsAction={handleSettingsAction}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <QueryTopHeader />
        <QueryMobileNav navItems={queryNavItems} activeItemKey={activeKey} onSwitchItem={handleSwitchItem} />
        {isMyEvents ? (
          <MyEventsPanel user={user} activeItem={activeItem} onEnterAccount={onEnterAccount} />
        ) : (
          <QueryContentPanel activeItem={activeItem} user={user} />
        )}
      </div>
    </main>
  );
}
