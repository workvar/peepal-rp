"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAccessMatrix,
  saveRoleAccess,
  resetRoleAccess,
  clearAccessError,
  subjectKeyOf,
} from "@/store/slices/accessSlice";
import type { AccessActionKey, RoleAccess } from "@/types";
import { AccessRow, cloneRow, rowSignature, rowToList, toRow } from "./accessHelpers";

const isAdminRole = (r: { subjectType: string; subjectKey: string }) =>
  r.subjectType === "system" && r.subjectKey === "admin";

// All editor state + handlers. The page and its sub-components consume this.
export function useAccessControl() {
  const dispatch = useAppDispatch();
  const { matrix, loading, saving, error } = useAppSelector((s) => s.access);

  const [selected, setSelected] = useState<string>("");
  // Per-role unsaved edits, keyed by composite subject key.
  const [drafts, setDrafts] = useState<Record<string, AccessRow>>({});

  useEffect(() => {
    dispatch(fetchAccessMatrix());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAccessError());
    }
  }, [error, dispatch]);

  const roles = useMemo(() => matrix?.roles ?? [], [matrix]);
  const modules = useMemo(() => matrix?.modules ?? [], [matrix]);

  // Default to the first editable (non-admin) role once the matrix loads.
  useEffect(() => {
    if (!selected && roles.length) {
      const first = roles.find((r) => !isAdminRole(r)) ?? roles[0];
      setSelected(subjectKeyOf(first.subjectType, first.subjectKey));
    }
  }, [roles, selected]);

  const selectedRole: RoleAccess | null = useMemo(
    () => roles.find((r) => subjectKeyOf(r.subjectType, r.subjectKey) === selected) ?? null,
    [roles, selected]
  );

  const isAdmin = !!selectedRole && isAdminRole(selectedRole);

  const baseRow = useMemo<AccessRow>(
    () => (selectedRole ? toRow(selectedRole.modules) : {}),
    [selectedRole]
  );

  const row: AccessRow = drafts[selected] ?? baseRow;

  const dirty =
    !!drafts[selected] &&
    !!selectedRole &&
    rowSignature(drafts[selected], modules) !== rowSignature(baseRow, modules);

  // ── Mutators ────────────────────────────────────────────────
  const updateDraft = useCallback(
    (mutator: (r: AccessRow) => void) => {
      if (isAdmin) return; // admin is fixed at full access
      setDrafts((prev) => {
        const next = cloneRow(prev[selected] ?? baseRow);
        mutator(next);
        return { ...prev, [selected]: next };
      });
    },
    [isAdmin, selected, baseRow]
  );

  const toggleCell = (moduleId: string, action: AccessActionKey) =>
    updateDraft((r) => {
      const cur = r[moduleId] ?? {
        module: moduleId,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      };
      r[moduleId] = { ...cur, [action]: !cur[action] };
    });

  // Toggle every module for one action (column select-all).
  const toggleColumn = (action: AccessActionKey) =>
    updateDraft((r) => {
      const allOn = modules.every((m) => r[m.id]?.[action]);
      for (const m of modules) {
        const cur = r[m.id] ?? {
          module: m.id,
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        };
        r[m.id] = { ...cur, [action]: !allOn };
      }
    });

  // Toggle all four actions for one module (row select-all).
  const toggleRow = (moduleId: string) =>
    updateDraft((r) => {
      const cur = r[moduleId] ?? {
        module: moduleId,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      };
      const allOn = cur.canView && cur.canCreate && cur.canEdit && cur.canDelete;
      r[moduleId] = {
        module: moduleId,
        canView: !allOn,
        canCreate: !allOn,
        canEdit: !allOn,
        canDelete: !allOn,
      };
    });

  // ── Persistence ─────────────────────────────────────────────
  const save = async () => {
    if (!selectedRole || !dirty) return;
    const result = await dispatch(
      saveRoleAccess({
        subjectType: selectedRole.subjectType,
        subjectKey: selectedRole.subjectKey,
        modules: rowToList(row, modules),
      })
    );
    if (saveRoleAccess.fulfilled.match(result)) {
      toast.success(`${selectedRole.label} access saved`);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[selected];
        return next;
      });
    }
  };

  const reset = async () => {
    if (!selectedRole) return;
    const result = await dispatch(
      resetRoleAccess({
        subjectType: selectedRole.subjectType,
        subjectKey: selectedRole.subjectKey,
      })
    );
    if (resetRoleAccess.fulfilled.match(result)) {
      toast.success(`${selectedRole.label} reset to defaults`);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[selected];
        return next;
      });
    }
  };

  const discard = () =>
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[selected];
      return next;
    });

  return {
    loading,
    saving,
    roles,
    modules,
    selected,
    setSelected,
    selectedRole,
    isAdmin,
    row,
    dirty,
    toggleCell,
    toggleColumn,
    toggleRow,
    save,
    reset,
    discard,
  };
}

export type AccessControlState = ReturnType<typeof useAccessControl>;
