import React from "react";

export function QueryTopHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-primary">Fudan Campus Assistant</p>
        <h1 className="truncate text-xl font-black text-slate-950">复旦百事通</h1>
      </div>
    </header>
  );
}
