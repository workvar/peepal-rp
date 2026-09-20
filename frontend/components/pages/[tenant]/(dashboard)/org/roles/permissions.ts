// ── Permission Definitions ─────────────────────────────────────────────────

import { moduleAllowedForIndustry } from "@/lib/access";
import { HEALTHCARE_PERMISSION_GROUPS } from "./permissions.healthcare";

export interface Permission {
  key: string;
  label: string;
  description?: string;
}
export interface PermissionGroup {
  label: string;
  color: string;        // Tailwind accent color identifier
  /** Access-module this group belongs to; drives industry filtering. */
  module: string;
  permissions: Permission[];
}

// Cross-industry groups. Industry-specific ones (healthcare below) are appended
// and filtered per tenant by permissionGroupsFor().
const CORE_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Students",
    module: "students",
    color: "blue",
    permissions: [
      { key: "students_read",        label: "View students",         description: "See the student list and profiles" },
      { key: "students_write",       label: "Manage students",       description: "Enrol, edit, and remove students" },
      { key: "students_bulk_import", label: "Bulk import students",  description: "Upload a CSV of students" },
    ],
  },
  {
    label: "Employees",
    module: "employees",
    color: "violet",
    permissions: [
      { key: "employees_read",  label: "View employees",  description: "See the employee directory" },
      { key: "employees_write", label: "Manage employees",description: "Add, edit, and deactivate employees" },
    ],
  },
  {
    label: "Attendance",
    module: "attendance",
    color: "green",
    permissions: [
      { key: "attendance_read",     label: "View attendance",    description: "See attendance records and summaries" },
      { key: "attendance_write",    label: "Mark attendance",    description: "Record and edit attendance entries" },
      { key: "attendance_settings", label: "Manage settings",    description: "Change minimum attendance threshold" },
    ],
  },
  {
    label: "Marks & Exams",
    module: "marks",
    color: "yellow",
    permissions: [
      { key: "marks_read",    label: "View marks",         description: "See student marks and grades" },
      { key: "marks_write",   label: "Enter marks",        description: "Add and edit marks" },
      { key: "exams_manage",  label: "Manage exam schedule",description: "Create, publish, and delete exams" },
    ],
  },
  {
    label: "Leaves",
    module: "leaves",
    color: "orange",
    permissions: [
      { key: "leaves_read",    label: "View leaves",    description: "See leave applications" },
      { key: "leaves_apply",   label: "Apply for leave", description: "Submit leave requests" },
      { key: "leaves_approve", label: "Approve leaves",  description: "Approve or reject leave requests" },
    ],
  },
  {
    label: "Payroll",
    module: "payroll",
    color: "teal",
    permissions: [
      { key: "payroll_read",     label: "View payroll",      description: "See salary slips and payroll runs" },
      { key: "payroll_generate", label: "Generate payroll",  description: "Run monthly payroll" },
      { key: "payroll_manage",   label: "Manage structures",  description: "Define salary structures" },
    ],
  },
  {
    label: "Fees",
    module: "fees",
    color: "pink",
    permissions: [
      { key: "fees_read",    label: "View fees",         description: "See fee records and dues" },
      { key: "fees_collect", label: "Collect fees",      description: "Record fee payments" },
      { key: "fees_manage",  label: "Manage fee setup",  description: "Create fee categories and structures" },
    ],
  },
  {
    label: "Communication",
    module: "announcements",
    color: "indigo",
    permissions: [
      { key: "announcements_read",  label: "View announcements",  description: "See announcements" },
      { key: "announcements_write", label: "Post announcements",  description: "Create and delete announcements" },
    ],
  },
  {
    label: "Reports",
    module: "reports",
    color: "gray",
    permissions: [
      { key: "reports_view", label: "View reports", description: "Access all report dashboards" },
    ],
  },
];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  ...CORE_PERMISSION_GROUPS,
  ...HEALTHCARE_PERMISSION_GROUPS,
];

/**
 * Groups a tenant of the given industry should actually see. A hospital has no
 * students, marks, or fees modules, so offering permissions for them in the
 * role editor would grant access to pages that do not exist there.
 */
export function permissionGroupsFor(tenantType: string | null | undefined): PermissionGroup[] {
  return PERMISSION_GROUPS.filter((g) => moduleAllowedForIndustry(g.module, tenantType));
}

// Flatten for lookup
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions);

// ── Color Mappings ────────────────────────────────────────────────────────

export const groupAccent: Record<string, string> = {
  blue:   "bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-800/50   text-blue-700   dark:text-blue-300",
  violet: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300",
  green:  "bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800/50  text-green-700  dark:text-green-300",
  yellow: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-300",
  orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50 text-orange-700 dark:text-orange-300",
  teal:   "bg-teal-50   dark:bg-teal-900/20   border-teal-200   dark:border-teal-800/50   text-teal-700   dark:text-teal-300",
  pink:   "bg-pink-50   dark:bg-pink-900/20   border-pink-200   dark:border-pink-800/50   text-pink-700   dark:text-pink-300",
  indigo: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300",
  gray:   "bg-muted/40   dark:bg-slate-700     border-border   dark:border-slate-600     text-muted-foreground   dark:text-slate-400",
};

// System roles are now served per-tenant by the `systemRoles` GraphQL query
// (seeded from the tenant's industry at creation), so the Roles page and the
// Add Employee dropdown read one DB source instead of a hardcoded list here.

// ── Helpers ───────────────────────────────────────────────────────────────

export function getPermLabel(key: string) {
  return ALL_PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}

// permissions are stored as a comma-separated string
export function parsePerms(str: string): string[] {
  return str.split(",").filter(Boolean);
}
