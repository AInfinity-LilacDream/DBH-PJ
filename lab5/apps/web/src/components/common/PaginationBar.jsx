import React from "react";
import { Pagination } from "@heroui/react";

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  startItem,
  endItem,
  onChange,
  compact = false,
  showBorder = true,
  className = ""
}) {
  if (totalItems <= 0) {
    return null;
  }

  const borderClass = showBorder ? "border-t border-slate-200" : "";
  const summary = compact ? `${startItem}-${endItem} / ${totalItems}` : `第 ${startItem}-${endItem} 条，共 ${totalItems} 条`;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${
        compact ? "text-xs" : "text-sm"
      } text-slate-500 ${borderClass} ${className}`}
    >
      <span className="whitespace-nowrap">{summary}</span>
      {totalPages > 1 ? (
        <Pagination
          isCompact
          showControls
          aria-label="分页导航"
          className="shrink-0"
          page={page}
          radius="sm"
          size="sm"
          total={totalPages}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}
