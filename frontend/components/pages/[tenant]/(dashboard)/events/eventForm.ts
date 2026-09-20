// Shared types and constants for the Events module.

export interface EventItem {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  endDate: string;
  location: string;
  category: string;
  color: string;
  isPublic: boolean;
  createdBy?: string;
}

// A tenant-defined category returned by the eventCategories query.
export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export type RepeatFreq = "none" | "weekly" | "monthly" | "yearly";

// The shape backing the create/edit modal. `repeatFreq`/`repeatCount` are
// modal-only fields (stripped before the mutation) used to fan out recurrences.
export interface EventForm {
  title: string;
  description: string;
  eventDate: string;
  endDate: string;
  location: string;
  category: string;
  color: string;
  isPublic: boolean;
  repeatFreq: RepeatFreq;
  repeatCount: number;
}

export const presetColors = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B88B", "#A9DFBF",
];

// Stored category values are stable across verticals; only the labels move.
// Education keeps Academic/Exam, every other industry gets neutral wording so
// a hospital calendar never offers to file an event under "Exam".
const BASE_EVENT_CATEGORIES = [
  { value: "academic", label: "Academic", educationOnly: true },
  { value: "cultural", label: "Cultural", educationOnly: false },
  { value: "sports", label: "Sports", educationOnly: false },
  { value: "holiday", label: "Holiday", educationOnly: false },
  { value: "exam", label: "Exam", educationOnly: true },
  { value: "other", label: "Other", educationOnly: false },
];

const NON_EDUCATION_CATEGORIES = [
  { value: "academic", label: "Organisational" },
  { value: "exam", label: "Review" },
];

/** Category options for a tenant type, with education-only labels swapped. */
export function eventCategoriesFor(tenantType: string | null | undefined) {
  if (tenantType === "education" || tenantType === "college" || !tenantType) {
    return BASE_EVENT_CATEGORIES.map(({ value, label }) => ({ value, label }));
  }
  return BASE_EVENT_CATEGORIES.map(({ value, label, educationOnly }) => ({
    value,
    label: educationOnly
      ? NON_EDUCATION_CATEGORIES.find((c) => c.value === value)?.label ?? label
      : label,
  }));
}

/** Education defaults, kept for callers that render outside a tenant context. */
export const EVENT_CATEGORIES = eventCategoriesFor("education");

/** Lowercase, hyphenated slug (matches the backend slugify). */
export function slugifyCategory(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Normalize a string to space-separated lowercase words for token matching.
const wordsOf = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

/**
 * Map a loose category value from a CSV (e.g. "CME", "Seminar", "Camp") to a
 * known category's stable value. Tries, in order: exact value, exact label,
 * slugified value, then a unique word-subset match against the label
 * (e.g. "Seminar" → "Medical Seminar"). Returns the trimmed input unchanged
 * when there's no confident match, so it surfaces as an editable red cell.
 */
export function resolveCategoryValue(raw: string, options: CategoryOption[]): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || options.length === 0) return trimmed;
  const lower = trimmed.toLowerCase();

  const byValue = options.find((o) => o.value.toLowerCase() === lower);
  if (byValue) return byValue.value;

  const byLabel = options.find((o) => o.label.toLowerCase() === lower);
  if (byLabel) return byLabel.value;

  const slug = slugifyCategory(trimmed);
  const bySlug = options.find((o) => o.value === slug);
  if (bySlug) return bySlug.value;

  // Unique word-subset match: every word of the raw value appears in the label.
  const rawWords = wordsOf(trimmed);
  if (rawWords.length > 0) {
    const matches = options.filter((o) => {
      const labelWords = wordsOf(o.label);
      return rawWords.every((w) => labelWords.includes(w));
    });
    if (matches.length === 1) return matches[0].value;
  }
  return trimmed;
}

/**
 * Merge the built-in defaults with the tenant's own categories. Org categories
 * are appended after the defaults; any whose slug collides with a default is
 * skipped so the list stays deduplicated by value.
 */
export function mergeCategoryOptions(
  tenantType: string | null | undefined,
  orgCategories: EventCategory[] = [],
): CategoryOption[] {
  const base = eventCategoriesFor(tenantType);
  const seen = new Set(base.map((c) => c.value));
  const extra = orgCategories
    .filter((c) => !seen.has(c.slug))
    .map((c) => ({ value: c.slug, label: c.name }));
  return [...base, ...extra];
}

// Factory for a blank form. Pass a date to seed both start/end (used when a
// calendar cell is double-clicked).
export function emptyEventForm(date = ""): EventForm {
  return {
    title: "",
    description: "",
    eventDate: date,
    endDate: date,
    location: "",
    category: "academic",
    color: presetColors[0],
    isPublic: true,
    repeatFreq: "none",
    repeatCount: 1,
  };
}
