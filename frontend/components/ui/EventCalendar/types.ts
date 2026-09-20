// Shared types for the generic month-grid EventCalendar.

/** Tone drives the dot / chip colour for an event. */
export type EventTone = "blue" | "green" | "amber" | "red" | "gray";

/** One thing that happens on one day. `date` is YYYY-MM-DD. */
export type CalendarEvent = {
  id: string;
  date: string;
  /** HH:MM, shown before the title. Optional for all-day items. */
  time?: string | null;
  title: string;
  subtitle?: string | null;
  tone?: EventTone;
};

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const TONE_DOT: Record<EventTone, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  gray: "bg-slate-400",
};

export const TONE_CHIP: Record<EventTone, string> = {
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  red: "bg-red-500/10 text-red-700 dark:text-red-300",
  gray: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

/** YYYY-MM-DD for a local date, without the UTC shift `toISOString` causes. */
export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** First and last day of a month as YYYY-MM-DD, for range queries. */
export function monthRange(year: number, month: number): { from: string; to: string } {
  return {
    from: toISODate(new Date(year, month, 1)),
    to: toISODate(new Date(year, month + 1, 0)),
  };
}

/** Group events by their date string so each cell is a cheap lookup. */
export function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const out: Record<string, CalendarEvent[]> = {};
  for (const e of events) (out[e.date] ??= []).push(e);
  for (const list of Object.values(out)) {
    list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  }
  return out;
}
