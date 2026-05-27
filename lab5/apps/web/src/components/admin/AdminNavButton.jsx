import React from "react";
import { Button } from "@heroui/react";

export function AdminNavButton({ item, isActive, onPress }) {
  return (
    <Button
      className="h-11 justify-start gap-3 px-3 text-sm font-semibold"
      color={isActive ? "primary" : "default"}
      radius="sm"
      variant={isActive ? "flat" : "light"}
      onPress={onPress}
      fullWidth
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/80 text-sm shadow-sm">
        {item.label.slice(0, 1)}
      </span>
      <span className="truncate">{item.label}管理</span>
    </Button>
  );
}
