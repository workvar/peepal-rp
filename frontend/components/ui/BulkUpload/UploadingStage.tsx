"use client";

import { CheckCircle2, XCircle } from "lucide-react";

// Third wizard stage: live progress bar while chunks are submitted.
export default function UploadingStage({
  progress,
  onCancel,
}: {
  progress: { done: number; total: number; ok: number; failed: number };
  onCancel?: () => void;
}) {
  const pct = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
  return (
    <div className="py-8 space-y-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">
          Uploaded {progress.done} of {progress.total} entries
        </span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 size={14} /> {progress.ok} successful
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <XCircle size={14} /> {progress.failed} unsuccessful
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
