export const money = (n: number) => "₹" + (n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");
export const HOSTEL_TABS = ["blocks", "rooms", "classes", "visualizer", "overview"];

// genderAllowed mirrors the backend rule: a boys block admits only male
// students, a girls block only female; mixed/co-ed admits anyone.
export function genderAllowed(blockType: string | undefined, gender: string | undefined): boolean {
  const g = (gender ?? "").trim().toLowerCase();
  const isMale = g === "male" || g === "m" || g === "boy";
  const isFemale = g === "female" || g === "f" || g === "girl" || g === "woman";
  switch ((blockType ?? "").trim().toLowerCase()) {
    case "boys": case "boy": case "male": case "men": case "gents": return isMale;
    case "girls": case "girl": case "female": case "women": case "ladies": return isFemale;
    default: return true;
  }
}

export type SortState = { key: string; dir: "asc" | "desc" } | null;

// Generic table sort: returns rows ordered by the active sort key using a
// per-table accessor map. Numbers sort numerically; everything else uses a
// numeric-aware string compare (so "Block 2" precedes "Block 10").
export function sortRows<T>(rows: T[], sort: SortState, accessors: Record<string, (r: T) => unknown>): T[] {
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
