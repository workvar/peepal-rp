"use client";

import { AlertTriangle } from "lucide-react";

/** Inline banner for failed queries; keeps the rest of the page layout intact. */
export default function QueryError({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
      <AlertTriangle size={16} className="shrink-0" />
      <span className="flex-1">{message || "Failed to load data."}</span>
      {onRetry && (
        <button type="button" className="underline font-medium" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
