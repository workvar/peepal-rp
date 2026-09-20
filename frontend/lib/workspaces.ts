import { Shield, ShieldCheck, GraduationCap, Presentation, Briefcase, HeartPulse } from "lucide-react";
import type { Role, Workspace } from "@/types";
import type { Terminology } from "@/constants/terminology";
import { roleLabel } from "@/lib/roleLabels";

/**
 * Presentation for a workspace (one switchable role context).
 *
 * The role ids are fixed; only the wording changes per industry, so labels come
 * from the terminology bundle rather than being hardcoded here.
 */

export const WORKSPACE_ICONS: Record<string, React.ElementType> = {
  super_admin: ShieldCheck,
  admin: Shield,
  teacher: Presentation,
  staff: Briefcase,
  student: GraduationCap,
  patient: HeartPulse,
};

/**
 * Landing page for each workspace. After a switch we send the user somewhere
 * their new role can actually open, instead of leaving them on a page the
 * workspace has no access to.
 */
export const WORKSPACE_HOME: Record<string, string> = {
  super_admin: "/dashboard",
  admin: "/dashboard",
  teacher: "/dashboard",
  staff: "/dashboard",
  student: "/portal",
  patient: "/my-health",
};

export function workspaceIcon(role: string): React.ElementType {
  return WORKSPACE_ICONS[role] ?? Shield;
}

export function workspaceHome(role: string): string {
  return WORKSPACE_HOME[role] ?? "/dashboard";
}

/**
 * Label for a workspace. The backend already resolves the tenant's SystemRole
 * label, so prefer that; fall back to the terminology bundle when the payload
 * predates workspaces or the tenant has no SystemRole rows seeded.
 */
export function workspaceLabel(ws: Workspace, t: Terminology): string {
  return ws.label || roleLabel(ws.role, t);
}

/** One-line description of what a workspace is for, shown under its label. */
export function workspaceHint(role: Role, t: Terminology): string {
  switch (role) {
    case "super_admin":
      return "Platform administration";
    case "admin":
      return "Full organisation management";
    case "teacher":
      return `Your ${t.role_staff.toLowerCase()} tools`;
    case "staff":
      return `Your ${t.role_support.toLowerCase()} tools`;
    case "student":
      return `Your ${t.role_member.toLowerCase()} portal`;
    case "patient":
      return "Your personal records";
    default:
      return "";
  }
}

/** A switcher is only worth showing when there is somewhere to switch to. */
export function hasMultipleWorkspaces(workspaces: Workspace[] | undefined): boolean {
  return (workspaces?.length ?? 0) > 1;
}
