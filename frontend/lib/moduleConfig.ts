import { BASE_MODULES, PATH_NAMES } from "@/constants/navigation/modules";
import type { ModuleDef } from "@/types/general/moduleConfig";
import type { Terminology } from "@/constants/terminology";
export type { CategoryColor, ModuleDef } from "@/types/general/moduleConfig";

// Maps well-known module ids to per-tenant labels & descriptions.
// Kept tiny — only ids whose meaning genuinely changes per vertical.
function relabel(m: ModuleDef, t: Terminology): ModuleDef {
  switch (m.id) {
    case "students":
      return { ...m, label: t.member_plural, description: `${t.member_plural} & records` };
    case "employees":
      return { ...m, label: t.staff_plural, description: `${t.staff_plural} & ${t.department_plural.toLowerCase()}` };
    case "departments":
      return { ...m, label: t.department_plural };
    case "marks":
      return { ...m, label: t.marks };
    case "leaves":
      return { ...m, label: t.leave };
    case "attendance":
      return { ...m, label: t.attendance };
    case "learning":
      return { ...m, label: t.course_plural };
    default:
      return m;
  }
}

export function getModules(tenantSlug: string, terminology?: Terminology): ModuleDef[] {
  return BASE_MODULES.map((m) => {
    const withHref = { ...m, href: `/${tenantSlug}${m.baseHref}` };
    return terminology ? relabel(withHref, terminology) : withHref;
  });
}

// Overrides PATH_NAMES for the handful of paths whose displayed name should
// track the tenant's terminology. Anything not listed falls through to the
// baseline PATH_NAMES table.
function terminologyPathNames(t: Terminology): Record<string, string> {
  return {
    "/students": t.member_plural,
    "/employees": t.staff_plural,
    "/marks": t.marks,
    "/leaves": t.leave,
    "/attendance": t.attendance,
    "/learning": t.course_plural,
    "/learning/my-goals": `My ${t.course_plural}`,
    "/org/departments": t.department_plural,
  };
}

export function getModuleName(
  pathname: string,
  tenantSlug?: string,
  terminology?: Terminology,
): string {
  const path = tenantSlug ? pathname.replace(`/${tenantSlug}`, "") || "/" : pathname;
  const overrides = terminology ? terminologyPathNames(terminology) : {};
  const table: Record<string, string> = { ...PATH_NAMES, ...overrides };
  if (table[path]) return table[path];
  const match = Object.keys(table)
    .sort((a, b) => b.length - a.length)
    .find((key) => path.startsWith(key) && key !== "/dashboard");
  return match ? table[match] : "Dashboard";
}
