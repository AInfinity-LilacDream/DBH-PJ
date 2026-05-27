import React from "react";
import { Icon } from "@iconify/react";
import { Button } from "@heroui/react";

export function QueryNavButton({ item, isActive, onPress }) {
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
