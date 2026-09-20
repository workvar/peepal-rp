import { BASE_MODULES } from "@/constants/navigation/modules";
import type { ModuleAccess, Role, TenantType } from "@/types";

/** Current user's effective access keyed by module id (from accessSlice). */
export type AccessMap = Record<string, ModuleAccess>;

/**
 * Industry scoping — mirror of backend models/access_industries.go. A module
 * listed here only exists for tenants of those industries; unlisted modules
 * are shared. The backend already zeroes myAccess for out-of-industry modules;
 * this map covers the moment before myAccess loads and keeps nav/route-guard
 * decisions correct offline.
 */
export const MODULE_INDUSTRIES: Record<string, TenantType[]> = {
  // Education-only
  students: ["education"],
  marks: ["education"],
  results: ["education"],
  courses: ["education"],
  subjects: ["education"],
  exams: ["education"],
  "exam-types": ["education"],
  curriculum: ["education"],
  grading: ["education"],
  timetable: ["education"],
  "attendance-shortage": ["education"],
  // Both render a per-student roster keyed on roll number / course-batch,
  // which has no meaning outside education.
  "attendance-summary": ["education"],
  "attendance-export": ["education"],
  fees: ["education"],
  "fee-structures": ["education"],
  "fee-dues": ["education"],
  "fee-categories": ["education"],
  "fee-addons": ["education"],
  "fee-allocations": ["education"],
  "fee-students": ["education"],
  "fee-overview": ["education"],
  hostel: ["education"],
  transport: ["education"],
  library: ["education"],
  "reports-marks": ["education"],
  "reports-fees": ["education"],
  "academic-years": ["education"],
  portal: ["education"],
  "my-fees": ["education"],
  "my-grades": ["education"],
  // Student life & campus ops (Phase 6)
  assignments: ["education"],
  "my-assignments": ["education"],
  mess: ["education"],
  "my-mess": ["education"],
  "transport-live": ["education"],
  "my-hall-tickets": ["education"],
  "question-bank": ["education"],
  "question-papers": ["education"],
  "hall-tickets": ["education"],
  // Healthcare-only
  patients: ["healthcare"],
  appointments: ["healthcare"],
  encounters: ["healthcare"],
  billing: ["healthcare"],
  pharmacy: ["healthcare"],
  schedules: ["healthcare"],
  laboratory: ["healthcare"],
  radiology: ["healthcare"],
  wards: ["healthcare"],
  admissions: ["healthcare"],
  nursing: ["healthcare"],
  claims: ["healthcare"],
  inventory: ["healthcare"],
  ot: ["healthcare"],
  triage: ["healthcare"],
  bloodbank: ["healthcare"],
  ambulance: ["healthcare"],
  dietary: ["healthcare"],
  telemedicine: ["healthcare"],
  referrals: ["healthcare"],
  "patient-portal": ["healthcare"],
  "my-schedule": ["healthcare"],
};

/** Collapse legacy tenant-type aliases to their canonical vertical. */
export function canonicalTenantType(t: string | null | undefined): TenantType {
  if (t === "college" || !t) return "education";
  if (t === "enterprise") return "corporate";
  return t as TenantType;
}

/** Whether a module exists for tenants of the given industry. */
export function moduleAllowedForIndustry(
  moduleId: string | null,
  tenantType: string | null | undefined,
): boolean {
  if (!moduleId) return true;
  // Tenant type not resolved yet (e.g. right after a page refresh, before the
  // terminology fetch lands). Fail open: assuming "education" here would block
  // every healthcare/corporate page and bounce the user to the dashboard.
  if (!tenantType) return true;
  const industries = MODULE_INDUSTRIES[moduleId];
  if (!industries) return true;
  return industries.includes(canonicalTenantType(tenantType));
}

/**
 * Modules whose backing data is intrinsic to one role and has no meaning for
 * others — e.g. the student self-service portal only has a row for students.
 * Admins/super-admins get a blanket view grant on every module, which would
 * otherwise surface these and then 404 on open. For these ids we ignore the
 * access matrix entirely and gate on the module's own registered roles.
 */
export const ROLE_LOCKED_MODULES = new Set<string>([
  "portal",
  "my-fees",
  "my-grades",
  "my-hall-tickets",
  "my-assignments",
  "my-mess",
  "patient-portal",
  "my-schedule",
]);

/** True when a module is hard-locked to its registered roles regardless of grants. */
export function isRoleLocked(moduleId: string | null): boolean {
  return !!moduleId && ROLE_LOCKED_MODULES.has(moduleId);
}

/** Roles registered for a module id, or null when the id is unknown. */
export function rolesForModule(moduleId: string): Role[] | null {
  const m = BASE_MODULES.find((mod) => mod.id === moduleId);
  return m ? (m.roles as Role[]) : null;
}

/** Whether the given role is among a module's registered roles. */
export function moduleAllowsRole(moduleId: string, role: Role): boolean {
  const roles = rolesForModule(moduleId);
  return !roles || roles.includes(role);
}

/**
 * Resolve the module id that owns a tenant-relative path, using the same
 * deepest-prefix match as rolesForPath. Returns null when no module owns it.
 */
export function moduleIdForPath(relPath: string): string | null {
  const match = BASE_MODULES.filter(
    (m) => relPath === m.baseHref || relPath.startsWith(m.baseHref + "/"),
  ).sort((a, b) => b.baseHref.length - a.baseHref.length)[0];
  return match ? match.id : null;
}

/**
 * Resolve the roles allowed to view a tenant-relative path (e.g. "/hostel",
 * "/attendance/summary"). Finds the BASE_MODULES entry whose baseHref is the
 * deepest matching prefix, so "/learning/my-goals" wins over "/learning".
 * Returns null when no module owns the path; callers treat that as
 * unrestricted so unknown/utility routes are never accidentally blocked.
 */
export function rolesForPath(relPath: string): Role[] | null {
  const match = BASE_MODULES.filter(
    (m) => relPath === m.baseHref || relPath.startsWith(m.baseHref + "/"),
  ).sort((a, b) => b.baseHref.length - a.baseHref.length)[0];

  return match ? (match.roles as Role[]) : null;
}

/** Whether the given role may access the tenant-relative path. */
export function canAccessPath(relPath: string, role: Role): boolean {
  const roles = rolesForPath(relPath);
  return !roles || roles.includes(role);
}
