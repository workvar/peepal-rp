"use client";

import { WEEKDAY_SHORT, TONE_DOT, toISODate } from "./types";
import type { CalendarEvent } from "./types";

interface Props {
  year: number;
  /** 0-indexed, matching Date#getMonth. */
  month: number;
  byDate: Record<string, CalendarEvent[]>;
  selected: string | null;
  onSelect: (date: string) => void;
  /** Weekday numbers (0=Sun) that are working days — others are dimmed. */
  openDays?: Set<number>;
}

// A plain month grid. Each cell shows up to two events plus an overflow count;
// the full day's list lives in the agenda panel beside it.
export default function MonthGrid({ year, month, byDate, selected, onSelect, openDays }: Props) {
  const firstOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toISODate(new Date());

  const cells: (number | null)[] = [
    ...Array<null>(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card p-3">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground/70 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} className="min-h-[76px]" />;

          const iso = toISODate(new Date(year, month, day));
          const events = byDate[iso] ?? [];
          const weekday = new Date(year, month, day).getDay();
          const closed = openDays ? !openDays.has(weekday) : false;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`min-h-[76px] rounded-lg border p-1.5 text-left transition-colors ${
                selected === iso
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:bg-muted/50"
              } ${closed ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    iso === today
                      ? "bg-primary text-primary-foreground rounded-full w-5 h-5 inline-flex items-center justify-center"
                      : "text-foreground/80"
                  }`}
                >
                  {day}
                </span>
                {events.length > 2 && (
                  <span className="text-[10px] text-muted-foreground/70">+{events.length - 2}</span>
                )}
              </div>

              <div className="mt-1 space-y-0.5">
                {events.slice(0, 2).map((e) => (
                  <div key={e.id} className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TONE_DOT[e.tone ?? "blue"]}`} />
                    <span className="text-[10px] truncate text-foreground/70">
                      {e.time ? `${e.time} ` : ""}{e.title}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
