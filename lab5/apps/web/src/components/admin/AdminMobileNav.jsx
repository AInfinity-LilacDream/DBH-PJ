import React from "react";
import { Button } from "@heroui/react";

export function AdminMobileNav({ modules, activeModuleKey, onSwitchModule }) {
  return (
    <div className="border-b border-slate-200 bg-[#fbfaf7] px-4 py-3 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {modules.map((item) => (
          <Button
            key={item.key}
            className="shrink-0"
            color={activeModuleKey === item.key ? "primary" : "default"}
            radius="sm"
            variant={activeModuleKey === item.key ? "flat" : "bordered"}
            onPress={() => onSwitchModule(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
