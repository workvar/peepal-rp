"use client";

// One configurable row of the slip's identity grid: tick it on, rename its
// printed label, choose whether the value auto-fills, prints blank for
// handwriting, or is a fixed string. Custom rows can also be removed.

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { SlipField } from "@/components/opd-slip/types";
import { isCustomKey } from "@/components/opd-slip/fields";

export default function FieldRow({
  field,
  onChange,
  onMove,
  onRemove,
}: {
  field: SlipField;
  onChange: (patch: Partial<SlipField>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const custom = isCustomKey(field.key);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 py-2">
      <input
        type="checkbox"
        checked={field.enabled}
        onChange={(e) => onChange({ enabled: e.target.checked })}
        aria-label={`Print ${field.label}`}
      />

      <input
        className="input-field w-44"
        value={field.label}
        onChange={(e) => onChange({ label: e.target.value })}
      />

      <select
        className="input-field w-36"
        value={field.source}
        onChange={(e) => onChange({ source: e.target.value as SlipField["source"] })}
      >
        {/* A custom row has no record to read from, so auto-fill is hidden. */}
        {!custom && <option value="auto">Auto-filled</option>}
        <option value="blank">Blank line</option>
        <option value="fixed">Fixed text</option>
      </select>

      {field.source === "fixed" && (
        <input
          className="input-field flex-1 min-w-[8rem]"
          placeholder="Printed value"
          value={field.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      )}

      <div className="ml-auto flex items-center gap-1">
        <button type="button" className="p-1 text-muted-foreground hover:text-foreground"
          onClick={() => onMove(-1)} aria-label="Move up">
          <ArrowUp size={14} />
        </button>
        <button type="button" className="p-1 text-muted-foreground hover:text-foreground"
          onClick={() => onMove(1)} aria-label="Move down">
          <ArrowDown size={14} />
        </button>
        {custom && (
          <button type="button" className="p-1 text-red-500 hover:text-red-700"
            onClick={onRemove} aria-label="Remove field">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
