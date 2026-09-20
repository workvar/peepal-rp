// Month-grid helpers for the attendance calendar. Thin wrappers over date-fns
// so the calendar component stays focused on rendering.

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  subMonths,
} from "date-fns";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface DayCell {
  iso: string;   // YYYY-MM-DD
  day: number;   // 1..31
  weekend: boolean;
}

export interface MonthGrid {
  cells: DayCell[];
  offset: number; // leading blanks so the 1st lands under the right weekday
}

// Build the day cells + leading offset for a given 1-indexed month.
export function monthGrid(year: number, month: number): MonthGrid {
  const first = startOfMonth(new Date(year, month - 1, 1));
  const cells = eachDayOfInterval({ start: first, end: endOfMonth(first) }).map(
    (d): DayCell => ({
      iso: format(d, "yyyy-MM-dd"),
      day: d.getDate(),
      weekend: getDay(d) === 0 || getDay(d) === 6,
    })
  );
  return { cells, offset: getDay(first) };
}

// Return the {year, month} shifted by `delta` months (1-indexed month).
export function shiftMonth(year: number, month: number, delta: number) {
  const base = new Date(year, month - 1, 1);
  const next = delta >= 0 ? addMonths(base, delta) : subMonths(base, -delta);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

export const todayISO = () => format(new Date(), "yyyy-MM-dd");

export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
