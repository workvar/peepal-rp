"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { USER_WORKSPACES } from "@/graphql/queries/workspaces";
import { SET_USER_WORKSPACE_ROLES } from "@/graphql/mutations/workspaces";
import type { Role } from "@/types";

type GqlWorkspace = { role: Role; label: string; isPrimary: boolean; customRoleId?: string | null };

/**
 * Editing state for a user's additional workspaces.
 *
 * The primary role is deliberately excluded from `roles`: it is implicit,
 * always granted, and can never be revoked. `save` is a no-op when nothing was
 * touched, so parent forms can call it unconditionally after create/update.
 */
export function useWorkspaceRoles(userId: string | null) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [dirty, setDirty] = useState(false);
  const [primaryRole, setPrimaryRole] = useState<Role | null>(null);

  const { data, loading } = useQuery(USER_WORKSPACES, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: "network-only",
  });
  const [setUserWorkspaceRoles] = useMutation(SET_USER_WORKSPACE_ROLES);

  // Clear immediately when the form switches to a different user, so the
  // previous user's selection is never shown against the new one while their
  // query is still in flight.
  useEffect(() => {
    setRoles([]);
    setPrimaryRole(null);
    setDirty(false);
  }, [userId]);

  // Hydrate from the server once their workspaces arrive.
  useEffect(() => {
    const list = (data?.userWorkspaces ?? []) as GqlWorkspace[];
    if (!userId || !list.length) return;
    setPrimaryRole(list.find((w) => w.isPrimary)?.role ?? null);
    setRoles(list.filter((w) => !w.isPrimary).map((w) => w.role));
    setDirty(false);
  }, [data, userId]);

  const toggle = (role: Role) => {
    setDirty(true);
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  /**
   * Persist the selection for `targetId`. Pass the id explicitly so a create
   * flow can save grants for the user it just made, and `override` when the
   * caller already knows the next selection (React state lags a toggle by a
   * render, so reading `roles` here would save the previous value).
   */
  const save = async (targetId: string | null = userId, override?: Role[]) => {
    if (!targetId) return;
    const next = override ?? roles;
    if (!dirty && !override && targetId === userId) return;
    await setUserWorkspaceRoles({
      variables: { userId: targetId, roles: next.map((role) => ({ role })) },
    });
    setDirty(false);
  };

  const reset = () => {
    setRoles([]);
    setPrimaryRole(null);
    setDirty(false);
  };

  return { roles, primaryRole, loading, toggle, save, reset };
}
