// Shared, dependency-free helpers for sortable data tables.
// A table holds a single SortState (active column + direction) and passes an
// accessor map describing how to read each sortable key from a row.

export type SortDir = "asc" | "desc";

export interface SortState {
  key: string;
  dir: SortDir;
}

// nextSort flips direction when the same key is clicked again, otherwise it
// starts a fresh ascending sort on the new key.
export function nextSort(current: SortState | null, key: string): SortState {
  if (current?.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "asc" };
}

// sortRows returns a new array ordered by the active sort. Numbers sort
// numerically; everything else uses a numeric-aware string compare so
// "Route 2" precedes "Route 10". Returns the input untouched when no sort is
// active or the key has no accessor.
export function sortRows<T>(
  rows: T[],
  sort: SortState | null,
  accessors: Record<string, (row: T) => unknown>
): T[] {
  if (!sort || !accessors[sort.key]) return rows;
  const acc = accessors[sort.key];
  const out = [...rows].sort((a, b) => {
    const va = acc(a);
    const vb = acc(b);
    if (typeof va === "number" && typeof vb === "number") return va - vb;
    return String(va ?? "").localeCompare(String(vb ?? ""), undefined, { numeric: true });
  });
  return sort.dir === "desc" ? out.reverse() : out;
}
