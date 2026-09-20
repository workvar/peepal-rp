/**
 * Formatting helpers for the session list.
 *
 * Kept apart from the components because the only interesting thing about them
 * is their edge cases, and those are easier to see (and test) on their own.
 */

/** A short, human "when": "just now", "3 hours ago", "12 Mar 2026". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";

  const seconds = Math.round((Date.now() - then) / 1000);
  // Clock skew between the browser and the server can put a timestamp a few
  // seconds in the future. "in -4 seconds" is worse than rounding to now.
  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  // Past a week, an absolute date says more than "37 days ago".
  return new Date(then).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Full date and time, for the row's title attribute. */
export function absoluteTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}
