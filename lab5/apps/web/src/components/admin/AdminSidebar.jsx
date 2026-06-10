import React from "react";
import { Icon } from "@iconify/react";
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";
import { AdminNavButton } from "./AdminNavButton.jsx";

export function AdminSidebar({ modules, activeModuleKey, displayName, roleText, onSwitchModule, onBackHome, onLogout }) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-[#fbfaf7] lg:flex">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-lg font-black text-white">A</div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black">管理控制台</p>
            <p className="text-xs font-semibold uppercase text-slate-500">Admin Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-3 py-4">
        <div className="grid gap-1">
          {modules.map((item) => (
            <AdminNavButton
              key={item.key}
              item={item}
              isActive={activeModuleKey === item.key}
              onPress={() => onSwitchModule(item.key)}
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
              <Button aria-label="管理端设置" className="h-11 w-11" isIconOnly radius="sm" variant="light">
                <Icon icon="lucide:settings" width={20} height={20} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="管理端账户菜单">
              <DropdownItem key="home" onPress={onBackHome}>
                返回用户端
              </DropdownItem>
              <DropdownItem key="logout" className="text-danger" color="danger" onPress={onLogout}>
                退出登录
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </aside>
  );
}
