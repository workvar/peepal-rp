"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { SortState } from "@/lib/tableSort";

// A clickable table header that shows the active sort direction. Click to sort
// by this column; click again to flip direction. Pair with sortRows + nextSort.
interface Props {
  label: string;
  sortKey: string;
  sort: SortState | null;
  onSort: (key: string) => void;
  className?: string;
}

export default function SortableTh({ label, sortKey, sort, onSort, className }: Props) {
  const active = sort?.key === sortKey;
  return (
    <th
      className={`table-th cursor-pointer select-none ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sort!.dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
        ) : (
          <ChevronsUpDown size={13} className="opacity-40" />
        )}
      </span>
    </th>
  );
}
