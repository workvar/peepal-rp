"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES } from "./helpers";

interface Props {
  year: number;
  month: number; // 1-indexed
  onChange: (year: number, month: number) => void;
  yearRange?: { start: number; end: number };
}

// MonthYearNav — arrows + month dropdown + year dropdown, one line.
// The parent controls the (year, month) state; this component only emits
// changes so it can be reused by any calendar view.
export default function MonthYearNav({ year, month, onChange, yearRange }: Props) {
  const startYear = yearRange?.start ?? year - 5;
  const endYear = yearRange?.end ?? year + 5;
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  const step = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    if (newMonth > 12) { newMonth = 1;  newYear += 1; }
    onChange(newYear, newMonth);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => step(-1)}
        className="p-2 rounded-lg hover:bg-muted transition"
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>

      <select
        value={month}
        onChange={(e) => onChange(year, parseInt(e.target.value, 10))}
        className="input-field py-1 px-2 text-sm font-semibold min-w-[130px]"
      >
        {MONTH_NAMES.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => onChange(parseInt(e.target.value, 10), month)}
        className="input-field py-1 px-2 text-sm font-semibold w-[90px]"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => step(1)}
        className="p-2 rounded-lg hover:bg-muted transition"
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
