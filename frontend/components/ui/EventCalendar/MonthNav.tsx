"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES } from "./types";

interface Props {
  year: number;
  /** 0-indexed. */
  month: number;
  onChange: (year: number, month: number) => void;
  onToday?: () => void;
}

// ◀ Month Year ▶ with a "Today" shortcut.
export default function MonthNav({ year, month, onChange, onToday }: Props) {
  const step = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onChange(d.getFullYear(), d.getMonth());
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      <button type="button" className="btn-secondary px-2 py-1.5" aria-label="Previous month"
        onClick={() => step(-1)}>
        <ChevronLeft size={16} />
      </button>
      <span className="font-semibold min-w-[10rem] text-center">
        {MONTH_NAMES[month]} {year}
      </span>
      <button type="button" className="btn-secondary px-2 py-1.5" aria-label="Next month"
        onClick={() => step(1)}>
        <ChevronRight size={16} />
      </button>
      {onToday && (
        <button type="button" className="text-sm text-blue-600 hover:underline ml-1" onClick={onToday}>
          Today
        </button>
      )}
    </div>
  );
}
