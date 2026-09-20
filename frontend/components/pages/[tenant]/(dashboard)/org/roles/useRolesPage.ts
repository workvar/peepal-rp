"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchRoles, createRole, updateRole, deleteRole, clearOrgError,
} from "@/store/slices/orgSlice";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { parsePerms } from "./permissions";

export interface RoleForm { name: string; }

// All roles page state and handlers; the role cards and modals consume
// this hook.
export function useRolesPage() {
  const dispatch = useAppDispatch();
  const { roles, loading, error } = useAppSelector((s) => s.org);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch]             = useState('');
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [selected, setSelected]         = useState<string[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const form = useForm<RoleForm>();

  useEffect(() => { dispatch(fetchRoles()); }, [dispatch]);
  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearOrgError()); }
  }, [error, dispatch]);

  // ── Submit helpers ──────────────────────────────────────────

  const onCreateSubmit = async (data: RoleForm) => {
    const result = await dispatch(createRole({ name: data.name, permissions: selected.join(",") }));
    if (createRole.fulfilled.match(result)) {
      toast.success("Role created");
      setIsCreateOpen(false);
      form.reset();
      setSelected([]);
    }
  };

  const onEditSubmit = async (data: RoleForm) => {
    if (!editingId) return;
    const result = await dispatch(updateRole({ id: editingId, input: { name: data.name, permissions: selected.join(",") } }));
    if (updateRole.fulfilled.match(result)) {
      toast.success("Role updated");
      setEditingId(null);
      form.reset();
      setSelected([]);
    }
  };

  const openEdit = (id: string) => {
    const role = roles.find((r) => r.id === id);
    if (!role) return;
    form.reset({ name: role.name });
    setSelected(parsePerms(role.permissions));
    setEditingId(id);
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmState({
      title: "Delete Role",
      message: `Delete the "${name}" role? This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        const result = await dispatch(deleteRole(id));
        if (deleteRole.fulfilled.match(result)) toast.success("Role deleted");
      },
    });
  };

  return {
    roles, loading,
    isCreateOpen, setIsCreateOpen,
    search, setSearch,
    editingId, setEditingId,
    selected, setSelected,
    confirmState, setConfirmState,
    form,
    onCreateSubmit, onEditSubmit, openEdit, handleDelete,
  };
}

export type RolesPageState = ReturnType<typeof useRolesPage>;
