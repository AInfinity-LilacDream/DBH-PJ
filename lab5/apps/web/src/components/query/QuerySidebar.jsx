import React from "react";
import { Icon } from "@iconify/react";
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import { QueryNavButton } from "./QueryNavButton.jsx";

export function QuerySidebar({ navItems, activeItemKey, displayName, roleText, isAdmin, onSwitchItem, onSettingsAction }) {
  return (
    <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-[#fbfaf7] lg:flex">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-lg font-black text-white">F</div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black">复旦百事通</p>
            <p className="text-xs font-semibold uppercase text-slate-500">Campus Assistant</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-3 py-4">
        <div className="grid gap-1">
          {navItems.map((item) => (
            <QueryNavButton
              key={item.key}
              item={item}
              isActive={activeItemKey === item.key}
              onPress={() => onSwitchItem(item.key)}
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
            <DropdownMenu aria-label="账户设置菜单" onAction={(key) => onSettingsAction(String(key))}>
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
  );
}
