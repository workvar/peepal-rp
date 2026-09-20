// Shared types for the calendar paint-marking flow.

export type MarkStatus = "present" | "absent" | "late";

// Map of ISO date (YYYY-MM-DD) -> status the user has painted/loaded.
export type MarksMap = Record<string, MarkStatus>;

export type EntityType = "student" | "employee";

export interface EntityOption {
  id: string;
  label: string;
}
