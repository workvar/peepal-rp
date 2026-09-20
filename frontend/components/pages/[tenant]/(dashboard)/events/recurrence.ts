import type { RepeatFreq } from "./eventForm";

// isoDate formats a Date as YYYY-MM-DD using local time.
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// expandRecurrence returns every (start, end) pair for a recurring event.
// The first occurrence uses the entered dates; later ones shift both start and
// end forward by the chosen frequency so the duration is preserved.
export function expandRecurrence(
  startISO: string,
  endISO: string,
  freq: RepeatFreq,
  count: number,
): Array<{ start: string; end: string }> {
  if (!startISO) return [{ start: startISO, end: endISO }];
  if (freq === "none" || count <= 1) {
    return [{ start: startISO, end: endISO || startISO }];
  }
  const out: Array<{ start: string; end: string }> = [];
  const start = new Date(startISO + "T00:00:00");
  const end = new Date((endISO || startISO) + "T00:00:00");
  for (let i = 0; i < count; i++) {
    const s = new Date(start);
    const e = new Date(end);
    if (freq === "weekly") {
      s.setDate(s.getDate() + i * 7);
      e.setDate(e.getDate() + i * 7);
    } else if (freq === "monthly") {
      s.setMonth(s.getMonth() + i);
      e.setMonth(e.getMonth() + i);
    } else if (freq === "yearly") {
      s.setFullYear(s.getFullYear() + i);
      e.setFullYear(e.getFullYear() + i);
    }
    out.push({ start: isoDate(s), end: isoDate(e) });
  }
  return out;
}
