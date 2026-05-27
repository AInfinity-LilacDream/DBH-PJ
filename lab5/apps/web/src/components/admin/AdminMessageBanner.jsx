import React from "react";

export function AdminMessageBanner({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="mx-5 mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-8">
      {message}
    </div>
  );
}
