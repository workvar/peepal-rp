const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-06" or "06" -> "Jun". Falls back to the raw value if unparseable. */
export function monthLabel(month: string): string {
  if (!month) return month;
  const mm = month.includes("-") ? month.split("-")[1] : month;
  const idx = parseInt(mm, 10) - 1;
  return MONTHS[idx] ?? month;
}

/** Compact INR money: 1250 -> "1.3k", 1500000 -> "15.0L". */
export function compactMoney(v: number): string {
  if (v >= 1_00_000) return `${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(Math.round(v));
}

/** Title-case a status / mode token: "partially_paid" -> "Partially Paid". */
export function titleCase(s: string): string {
  if (!s) return s;
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** ISO date (YYYY-MM-DD) for `daysAgo` days before today. */
export function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
