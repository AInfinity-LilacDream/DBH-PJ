import React from "react";
import { Button } from "@heroui/react";

export function AdminHeader({ activeModuleLabel, onBackHome }) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>管理端</span>
            <span>/</span>
            <span>{activeModuleLabel}管理</span>
          </div>
          <h1 className="mt-1 truncate text-2xl font-black text-slate-950">后台数据管理</h1>
        </div>
        <Button className="lg:hidden" color="primary" radius="sm" variant="flat" onPress={onBackHome}>
          返回用户端
        </Button>
      </div>
    </header>
  );
}
