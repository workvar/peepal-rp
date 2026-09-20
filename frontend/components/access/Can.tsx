"use client";

import type { ReactNode } from "react";
import { useAccess, type AccessAction } from "@/lib/useAccess";

/**
 * Renders its children only when the current user may perform `action` on
 * `module`, per the role access matrix (myAccess). Use it to hide action
 * buttons (Add / Edit / Delete) a role isn't allowed to use.
 *
 *   <Can module="students" action="create">
 *     <button className="btn-primary">Add Student</button>
 *   </Can>
 *
 * Before myAccess loads everything is permitted, so allowed users never see a
 * button flash hidden; the backend stays the source of truth for enforcement.
 */
export default function Can({
  module,
  action,
  children,
  fallback = null,
}: {
  module: string;
  action: AccessAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { canDo } = useAccess();
  return <>{canDo(module, action) ? children : fallback}</>;
}
