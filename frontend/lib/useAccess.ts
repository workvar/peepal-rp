"use client";

import { useAppSelector } from "@/store/hooks";
import {
  canAccessPath,
  moduleIdForPath,
  isRoleLocked,
  moduleAllowsRole,
  moduleAllowedForIndustry,
} from "@/lib/access";
import type { Role } from "@/types";

/**
 * Effective-access helpers backed by the current user's myAccess map.
 *
 * Before myAccess loads (or for paths/modules the matrix doesn't own) we fall
 * back to the static BASE_MODULES role defaults, so nothing is hidden or locked
 * prematurely. Once loaded, the matrix is authoritative.
 */
export function useAccess() {
  const role = useAppSelector((s) => s.auth.user?.role) as Role | undefined;
  const access = useAppSelector((s) => s.access.myAccess);
  const loaded = useAppSelector((s) => s.access.myAccessLoaded);
  const failed = useAppSelector((s) => s.access.myAccessFailed);
  const tenantType = useAppSelector((s) => s.terminology.type);
  const terminologyLoaded = useAppSelector((s) => s.terminology.loaded);

  // True once every input to an access decision has resolved (or definitively
  // failed). Callers that *deny* on a false result — route guards especially —
  // must wait for this, otherwise a page refresh evaluates against empty
  // defaults and wrongly locks the user out of the page they reloaded.
  const settled = !!role && (loaded || failed) && terminologyLoaded;

  // Can the user open a tenant-relative href (e.g. "/attendance/summary")?
  const canViewHref = (href: string, fallbackRoles?: readonly string[]): boolean => {
    if (!role) return false;
    const moduleId = moduleIdForPath(href);
    // Modules from another industry (Marks in a hospital, Patients in a
    // college) never show, regardless of role or matrix.
    if (!moduleAllowedForIndustry(moduleId, tenantType)) return false;
    // Role-locked modules (e.g. student portal) ignore the matrix so the blanket
    // admin grant can't expose a page that only has data for another role.
    if (isRoleLocked(moduleId)) return canAccessPath(href, role);
    if (loaded && moduleId && access[moduleId]) return access[moduleId].canView;
    if (fallbackRoles) return fallbackRoles.includes(role);
    return canAccessPath(href, role);
  };

  // Can the user open a module by its id?
  const canViewModule = (moduleId: string, fallbackRoles?: readonly string[]): boolean => {
    if (!role) return false;
    if (!moduleAllowedForIndustry(moduleId, tenantType)) return false;
    if (isRoleLocked(moduleId)) return moduleAllowsRole(moduleId, role);
    if (loaded && access[moduleId]) return access[moduleId].canView;
    if (fallbackRoles) return fallbackRoles.includes(role);
    return true;
  };

  // Can the user perform a CRUD action on a module? Used to show/hide action
  // buttons. Before myAccess loads we return true so buttons never flash hidden
  // for an allowed user (admins are unrestricted on the backend regardless).
  const canDo = (moduleId: string, action: AccessAction): boolean => {
    if (!role) return false;
    if (loaded && access[moduleId]) {
      const m = access[moduleId];
      switch (action) {
        case "view":
          return m.canView;
        case "create":
          return m.canCreate;
        case "edit":
          return m.canEdit;
        case "delete":
          return m.canDelete;
      }
    }
    return true;
  };

  return { role, access, loaded, settled, canViewHref, canViewModule, canDo };
}

export type AccessAction = "view" | "create" | "edit" | "delete";
