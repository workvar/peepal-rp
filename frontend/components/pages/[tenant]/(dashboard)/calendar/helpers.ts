import type { CalendarDayType } from "@/types";

// Friendly label for each day type shown in the calendar grid / legend.
export const DAY_TYPE_LABEL: Record<CalendarDayType, string> = {
  working: "Working",
  weekend: "Weekend",
  public: "Public",
  institutional: "Institutional",
  mandatory: "Mandatory",
  optional: "Optional",
  half_day: "Half Day",
};

// Tailwind background classes used to colour each day cell.
export const DAY_TYPE_STYLE: Record<CalendarDayType, { cell: string; dot: string }> = {
  working:       { cell: "bg-background hover:bg-muted/60",                         dot: "bg-foreground/40" },
  weekend:       { cell: "bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200",    dot: "bg-slate-500"     },
  public:        { cell: "bg-red-50 dark:bg-red-900/20 hover:bg-red-100",           dot: "bg-red-500"       },
  institutional: { cell: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100",        dot: "bg-blue-500"      },
  mandatory:     { cell: "bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200",       dot: "bg-rose-600"      },
  optional:      { cell: "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100",     dot: "bg-amber-500"     },
  half_day:      { cell: "bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100",  dot: "bg-purple-500"    },
};

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Count the leading empty cells needed so the 1st of the month lines up with
// the correct weekday column (Sun=0 ... Sat=6).
export function firstDayOffset(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

// Format a YYYY-MM-DD string into "Mon, 21 Apr 2026" for compact display.
export function formatDateLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}
