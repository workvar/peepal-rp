"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import type { Role } from "@/types";
import { useWorkspaceRoles } from "@/lib/hooks/useWorkspaceRoles";
import WorkspaceRolesField from "./WorkspaceRolesField";

/**
 * Self-contained "Additional workspaces" editor for an existing account.
 *
 * Each toggle saves immediately. Workspace grants are independent of the
 * surrounding form's fields, so tying them to its submit button would mean a
 * failed profile save silently discarded a role change (and vice versa).
 * Saving on toggle keeps the two concerns from corrupting each other.
 *
 * Renders nothing without a userId — extra workspaces can only be granted once
 * the login account exists.
 */
export default function WorkspaceRolesPanel({ userId }: { userId: string | null }) {
  const { roles, primaryRole, loading, toggle, save } = useWorkspaceRoles(userId);
  const [saving, setSaving] = useState(false);

  if (!userId) return null;

  const handleToggle = async (role: Role) => {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    toggle(role);
    setSaving(true);
    try {
      await save(userId, next);
      toast.success(
        roles.includes(role) ? "Workspace removed" : "Workspace added",
      );
    } catch (err: unknown) {
      toggle(role); // put the toggle back — the server rejected it
      toast.error(getErrorMessage(err, "Could not update workspaces"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2">
      <WorkspaceRolesField
        primaryRole={primaryRole}
        selected={roles}
        onToggle={(r) => void handleToggle(r)}
        disabled={loading || saving}
      />
    </div>
  );
}
