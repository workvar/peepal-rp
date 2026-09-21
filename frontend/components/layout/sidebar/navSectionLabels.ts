import type { Terminology } from "@/constants/terminology";
import { canonicalTenantType } from "@/lib/access";

/**
 * Industry-aware sidebar section headers.
 *
 * Most sections vanish on their own for a non-education tenant because every
 * item inside them is education-only (Academic, Fees). The ones handled here
 * survive — they hold at least one shared module — so their heading must not
 * keep saying "Campus Life" to a hospital that only sees Events under it.
 */
export function sectionLabel(
  id: string,
  configured: string | null,
  t: Terminology,
  tenantType: string | null | undefined,
): string | null {
  const isEducation = canonicalTenantType(tenantType) === "education";

  switch (id) {
    // "Attendance" becomes "Shifts" for a hospital, "Participation" for an NGO.
    case "attendance":
      return t.attendance;
    // The campus section now holds only Events (Hostel/Transport/Library moved
    // to the dedicated "Facilities" section). Keep a neutral name outside
    // education so it never clashes with — or reads oddly next to — Facilities.
    case "campus":
      return isEducation ? "Campus Life" : "Community";
    // Healthcare tenants see Pharmacy + Stores + procurement here → "Inventory".
    // Everyone else only sees Vendors/Purchase Orders → keep "Procurement".
    case "inventory":
      return canonicalTenantType(tenantType) === "healthcare" ? "Inventory" : "Procurement";
    default:
      return configured;
  }
}

/**
 * Relabel nav items whose hardcoded education wording would leak into other
 * verticals. /students is also hidden by industry gating for healthcare; the
 * relabel is a safety net if the type has not loaded yet.
 */
export function itemLabel(href: string, configured: string, t: Terminology): string {
  switch (href) {
    case "/students":
      return t.member_plural;
    case "/attendance":
      return t.attendance;
    case "/marks":
      return t.marks;
    case "/leaves":
      return t.leave;
    case "/org/departments":
      return t.department_plural;
    case "/org/academic-years":
      return t.year;
    case "/fees/students":
      return `${t.member} Fees`;
    case "/reports/attendance":
      return t.attendance;
    case "/reports/marks":
      return t.marks;
    case "/reports/leaves":
      return t.leave;
    default:
      return configured;
  }
}
