import React from "react";
import { Button } from "@heroui/react";

export function QueryMobileNav({ navItems, activeItemKey, onSwitchItem }) {
  return (
    <div className="border-b border-slate-200 bg-[#fbfaf7] px-4 py-3 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => (
          <Button
            key={item.key}
            className="shrink-0"
            color={activeItemKey === item.key ? "primary" : "default"}
            radius="sm"
            variant={activeItemKey === item.key ? "flat" : "bordered"}
            onPress={() => onSwitchItem(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
