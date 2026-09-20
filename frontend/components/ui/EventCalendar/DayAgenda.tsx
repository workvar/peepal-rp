"use client";

import { TONE_CHIP } from "./types";
import type { CalendarEvent } from "./types";

interface Props {
  date: string | null;
  events: CalendarEvent[];
  emptyText?: string;
  /** Extra lines rendered above the list, e.g. the day's consulting hours. */
  header?: React.ReactNode;
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
}

// The list of everything on the day selected in the month grid.
export default function DayAgenda({ date, events, emptyText = "Nothing scheduled.", header }: Props) {
  if (!date) {
    return (
      <div className="card text-center py-10 text-sm text-muted-foreground/70">
        Pick a day to see its details.
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-1">{formatDay(date)}</h3>
      {header}
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground/70 mt-3">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-2">
              <span
                className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${TONE_CHIP[e.tone ?? "blue"]}`}
              >
                {e.time ?? "—"}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{e.title}</span>
                {e.subtitle && (
                  <span className="block text-xs text-muted-foreground/70 truncate">{e.subtitle}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
