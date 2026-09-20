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
