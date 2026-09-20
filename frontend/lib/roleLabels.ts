import type { Terminology } from "@/constants/terminology";
import { getTerminology } from "@/constants/terminology";
import type { Role, TenantType } from "@/types";

/**
 * Role display names, resolved from the tenant's terminology bundle.
 *
 * The stored role ids never change — they are always
 * admin/teacher/student/staff/patient/super_admin — but the words shown to
 * users do. A hospital admin should never read "Teacher" or "Student"
 * anywhere in the UI; they see "Clinician" and "Trainee".
 *
 * Anything not covered by terminology (admin, super_admin, patient) keeps a
 * fixed label because the concept is identical across every vertical.
 */
export function roleLabel(role: string, t: Terminology): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "teacher":
      return t.role_staff;
    case "student":
      return t.role_member;
    case "staff":
      return t.role_support;
    case "patient":
      return t.member;
    default:
      return role;
  }
}

/** Plural form of roleLabel, for audience pickers and group headings. */
export function roleLabelPlural(role: string, t: Terminology): string {
  switch (role) {
    case "super_admin":
      return "Super Admins";
    case "admin":
      return "Admins";
    case "teacher":
      return t.role_staff_plural;
    case "student":
      return t.role_member_plural;
    case "staff":
      return t.role_support_plural;
    case "patient":
      return t.member_plural;
    default:
      return role;
  }
}

/** Same as roleLabel but resolved straight from a tenant type. */
export function roleLabelFor(role: string, type: TenantType | null | undefined): string {
  return roleLabel(role, getTerminology(type));
}

/** All assignable roles for a tenant, already labelled. */
export function roleOptions(
  t: Terminology,
  roles: Role[] = ["admin", "teacher", "staff", "student"],
): { value: Role; label: string }[] {
  return roles.map((value) => ({ value, label: roleLabel(value, t) }));
}

