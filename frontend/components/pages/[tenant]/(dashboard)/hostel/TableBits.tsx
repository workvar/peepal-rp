"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { SortState } from "./helpers";

// Sortable table header cell shared by the rooms / classes / allocations tables.
export function SortTh({ sortKey, label, sort, onToggle }: {
  sortKey: string;
  label: string;
  sort: SortState;
  onToggle: (key: string) => void;
}) {
  return (
    <th className="table-th cursor-pointer select-none" onClick={() => onToggle(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sort?.key === sortKey
          ? sort.dir === "asc"
            ? <ChevronUp size={13} />
            : <ChevronDown size={13} />
          : <ChevronsUpDown size={13} className="opacity-40" />}
      </span>
    </th>
  );
}

// Bulk-selection action bar shown above a table when rows are selected.
export function SelectionBar({ count, label, onClear, onDelete, className = "mb-3" }: {
  count: number;
  label?: string;
  onClear: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between bg-muted/60 border border-border rounded-lg px-4 py-2 ${className}`.trim()}>
      <span className="text-sm font-medium">{label ?? `${count} selected`}</span>
      <div className="flex items-center gap-3">
        <button onClick={onClear} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>
        <button onClick={onDelete} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete selected</button>
      </div>
    </div>
  );
}
