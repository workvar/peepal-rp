"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES, WEEKDAY_LABELS, monthGrid } from "./calendarDays";
import type { MarksMap, MarkStatus } from "./types";

// Fill colour for a painted day; idle days fall back to a subtle hover cell.
const PAINTED: Record<MarkStatus, string> = {
  present: "bg-emerald-500 text-white border-emerald-500",
  absent: "bg-red-500 text-white border-red-500",
  late: "bg-amber-500 text-white border-amber-500",
};

interface Props {
  year: number;
  month: number; // 1-indexed
  marks: MarksMap;
  today: string;
  onToggleDay: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function AttendanceMonthCalendar({
  year, month, marks, today, onToggleDay, onPrev, onNext,
}: Props) {
  const { cells, offset } = monthGrid(year, month);
  const blanks = Array.from({ length: offset }, (_, i) => i);

  return (
    <div className="card p-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={onPrev}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold">{MONTH_NAMES[month - 1]} {year}</span>
        <button type="button" onClick={onNext}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mx-auto max-w-[280px]">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-0.5">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {blanks.map((i) => <div key={`b-${i}`} className="aspect-square" />)}
          {cells.map((c) => {
            const status = marks[c.iso];
            const isToday = c.iso === today;
            return (
              <button
                key={c.iso}
                type="button"
                onClick={() => onToggleDay(c.iso)}
                title={c.iso + (status ? ` — ${status}` : "")}
                className={[
                  "aspect-square rounded-full text-xs font-medium border transition-colors",
                  "flex items-center justify-center",
                  status
                    ? PAINTED[status]
                    : c.weekend
                      ? "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                      : "bg-card text-foreground border-border/50 hover:bg-muted",
                  isToday && !status ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "",
                ].join(" ")}
              >
                {c.day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
