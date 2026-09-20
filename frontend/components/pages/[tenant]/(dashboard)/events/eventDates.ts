// Date helpers for the Events module. All event dates are "YYYY-MM-DD" strings,
// so plain string compares are chronological and need no parsing.
import type { EventItem } from "./eventForm";

const DAY = 86_400_000;
const ymd = (s: string) => s.slice(0, 10);
const atMidnight = (s: string) => new Date(ymd(s) + "T00:00:00");

// Does the event cover the given date? Range [eventDate, endDate] is inclusive.
export function coversDate(e: EventItem, dateStr: string): boolean {
  return dateStr >= ymd(e.eventDate) && dateStr <= ymd(e.endDate || e.eventDate);
}

// Total number of days the event spans (>= 1).
export function spanDays(e: EventItem): number {
  const diff = +atMidnight(e.endDate || e.eventDate) - +atMidnight(e.eventDate);
  return Math.max(1, Math.round(diff / DAY) + 1);
}

// 1-indexed position of dateStr within the span, or null for single-day events.
export function dayPosition(
  e: EventItem,
  dateStr: string,
): { index: number; total: number } | null {
  const total = spanDays(e);
  if (total <= 1) return null;
  const index = Math.round((+atMidnight(dateStr) - +atMidnight(e.eventDate)) / DAY) + 1;
  return { index, total };
}

// "Jun 10, 2026"
export function fullDate(s: string): string {
  return atMidnight(s).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// "Wednesday, June 10, 2026"
export function longDate(s: string): string {
  return atMidnight(s).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
