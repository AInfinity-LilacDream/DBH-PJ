import React from "react";
import { Chip } from "@heroui/react";

export function WaterfallCard({ item }) {
  return (
    <article className="flex min-h-44 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-black leading-6 text-slate-950">{item.title || "未命名"}</h3>
        <Chip color="primary" radius="sm" size="sm" variant="flat">
          {item.tag || "未分类"}
        </Chip>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-500">{item.meta || "暂无元信息"}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{item.description || "暂无描述"}</p>
    </article>
  );
}
