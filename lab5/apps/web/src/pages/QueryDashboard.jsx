import React, { useState } from "react";
import { queryNavItems } from "../config/queryNavItems.js";
import { roleTextMap } from "../constants/roleTextMap.js";
import { QuerySidebar } from "../components/query/QuerySidebar.jsx";
import { QueryTopHeader } from "../components/query/QueryTopHeader.jsx";
import { QueryMobileNav } from "../components/query/QueryMobileNav.jsx";
import { QueryContentPanel } from "../components/query/QueryContentPanel.jsx";

export function QueryDashboard({ user, onEnterAdmin, onLogout }) {
  const isAdmin = user?.roleType === "admin";
  const [activeKey, setActiveKey] = useState(queryNavItems[0].key);
  const activeItem = queryNavItems.find((item) => item.key === activeKey) ?? queryNavItems[0];
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
      <QuerySidebar
        navItems={queryNavItems}
        activeItemKey={activeKey}
        displayName={displayName}
        roleText={roleText}
        isAdmin={isAdmin}
        onSwitchItem={setActiveKey}
        onSettingsAction={handleSettingsAction}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <QueryTopHeader />
        <QueryMobileNav navItems={queryNavItems} activeItemKey={activeKey} onSwitchItem={setActiveKey} />
        <QueryContentPanel activeItem={activeItem} />
      </div>
    </main>
  );
}
