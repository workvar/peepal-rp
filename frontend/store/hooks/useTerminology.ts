import { useAppSelector } from "@/store/hooks";
import type { Terminology } from "@/constants/terminology";
import { getTerminology } from "@/constants/terminology";
import type { TenantType } from "@/types";

/**
 * useTerminology — returns the active tenant's label map.
 *
 * Usage:
 *   const t = useTerminology();
 *   <h1>{t.member_plural}</h1>  // "Students" / "Employees" / "Patients" / "Members"
 *
 * The labels are loaded into Redux by `fetchTerminology()` after login.
 * Before the fetch resolves (or on public pages) the hook returns the
 * bundled education defaults so the UI is never empty.
 */
export function useTerminology(): Terminology {
  return useAppSelector((s) => s.terminology.labels);
}

/**
 * useTenantType — raw canonical tenant type for callers that need to branch
 * on the vertical (e.g. "show Fees tab only for education").
 */
export function useTenantType(): TenantType | null {
  return useAppSelector((s) => s.terminology.type);
}

// Re-exported for callers that want to resolve labels without hitting Redux
// (e.g. inside a reducer, or for server-rendered strings).
export { getTerminology };
