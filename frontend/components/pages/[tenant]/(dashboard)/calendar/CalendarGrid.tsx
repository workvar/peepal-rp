"use client";

import type { CalendarDay, Holiday } from "@/types";
import { DAY_TYPE_STYLE, firstDayOffset } from "./helpers";

// Chip colors per holiday type
const HOLIDAY_CHIP: Record<string, string> = {
  public:        "bg-red-100 text-red-700 border-red-200",
  institutional: "bg-blue-100 text-blue-700 border-blue-200",
  mandatory:     "bg-rose-100 text-rose-700 border-rose-200",
  optional:      "bg-amber-100 text-amber-700 border-amber-200",
  half_day:      "bg-purple-100 text-purple-700 border-purple-200",
  weekend:       "bg-slate-100 text-slate-500 border-slate-200",
};

interface Props {
  year: number;
  month: number; // 1-indexed
  days: CalendarDay[];
  holidays?: Holiday[]; // full holiday list for chip overlay
  onDayClick?: (day: CalendarDay) => void;
  onDayDoubleClick?: (day: CalendarDay) => void;
}

export default function CalendarGrid({ year, month, days, holidays = [], onDayClick, onDayDoubleClick }: Props) {
  const offset = firstDayOffset(year, month);
  const blanks = Array.from({ length: offset }, (_, i) => i);

  // Build date -> Holiday[] map so each cell can show named holidays
  const holidayMap: Record<string, Holiday[]> = {};
  for (const h of holidays) {
    const key = h.date.slice(0, 10); // "YYYY-MM-DD"
    if (!holidayMap[key]) holidayMap[key] = [];
    holidayMap[key].push(h);
  }

  return (
    <div className="card p-4">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-2">
        {blanks.map((i) => (
          <div key={`blank-${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const style = DAY_TYPE_STYLE[day.type];
          const dayNum = parseInt(day.date.split("-")[2], 10);
          const isWeekend = day.type === "weekend";

          // Source 1: backend's per-day holidays array (all holidays for the date).
          // Source 2: Redux holidays store (fallback / supplement for auto-gen days).
          // Source 3: the CalendarDay primary field (last resort for weekend/auto entries).
          const fromApi    = day.holidays ?? [];
          const fromRedux  = holidayMap[day.date] ?? [];
          const fromLegacy =
            day.type !== "working" && day.type !== "weekend" && day.name
              ? [{ name: day.name, type: day.type }]
              : [];

          // Merge: API is authoritative; supplement with Redux entries not
          // already returned by the API (e.g. auto-gen weekends in Redux).
          const seen = new Set<string>();
          const chipsToShow: { name: string; type: string }[] = [];

          for (const h of [...fromApi, ...fromRedux.map(h => ({ name: h.name, type: h.type })), ...fromLegacy]) {
            if (!seen.has(h.name)) {
              seen.add(h.name);
              chipsToShow.push(h);
            }
          }

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onDayClick?.(day)}
              onDoubleClick={() => onDayDoubleClick?.(day)}
              className={[
                "min-h-[80px] rounded-lg p-2 text-left transition",
                "border border-border/40 flex flex-col gap-1",
                style.cell,
              ].join(" ")}
              title={day.name || day.type}
            >
              {/* Day number */}
              <span className={[
                "font-semibold text-xs",
                isWeekend ? "text-muted-foreground" : "text-foreground",
              ].join(" ")}>
                {dayNum}
              </span>

              {/* Holiday chips */}
              <div className="flex flex-col gap-0.5 flex-1">
                {chipsToShow.map((chip, i) => (
                  <span
                    key={i}
                    className={[
                      "text-[9px] font-medium leading-tight px-1 py-0.5 rounded border",
                      "truncate block w-full",
                      HOLIDAY_CHIP[chip.type] ?? "bg-muted text-muted-foreground border-border",
                    ].join(" ")}
                    title={chip.name}
                  >
                    {chip.name}
                  </span>
                ))}
                {/* Weekend label when no named holidays */}
                {isWeekend && chipsToShow.length === 0 && (
                  <span className="text-[9px] text-muted-foreground/60 leading-tight">
                    {day.name}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
