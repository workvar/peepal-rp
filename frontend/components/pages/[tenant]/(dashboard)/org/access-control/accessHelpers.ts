import type { AccessActionKey, AccessModuleMeta, ModuleAccess } from "@/types";

// The four CRUD actions, in display order.
export const ACTIONS: { key: AccessActionKey; label: string; desc: string }[] = [
  { key: "canView", label: "View", desc: "Open the page and read records" },
  { key: "canCreate", label: "Create", desc: "Add new records" },
  { key: "canEdit", label: "Edit", desc: "Modify existing records" },
  { key: "canDelete", label: "Delete", desc: "Remove records" },
];

export type AccessRow = Record<string, ModuleAccess>;

// Build an editable, keyed row map from a role's module list.
export function toRow(modules: ModuleAccess[]): AccessRow {
  const row: AccessRow = {};
  for (const m of modules) row[m.module] = { ...m };
  return row;
}

export function cloneRow(row: AccessRow): AccessRow {
  const out: AccessRow = {};
  for (const k of Object.keys(row)) out[k] = { ...row[k] };
  return out;
}

// Flatten a row back into an ordered ModuleAccess array (matrix module order).
export function rowToList(row: AccessRow, modules: AccessModuleMeta[]): ModuleAccess[] {
  return modules.map(
    (m) =>
      row[m.id] ?? {
        module: m.id,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      }
  );
}

// Stable string for dirty comparison.
export function rowSignature(row: AccessRow, modules: AccessModuleMeta[]): string {
  return rowToList(row, modules)
    .map((m) => `${m.module}:${+m.canView}${+m.canCreate}${+m.canEdit}${+m.canDelete}`)
    .join("|");
}

// Group module metadata by their group label, preserving order.
export function groupModules(
  modules: AccessModuleMeta[]
): { group: string; modules: AccessModuleMeta[] }[] {
  const groups: { group: string; modules: AccessModuleMeta[] }[] = [];
  for (const m of modules) {
    let g = groups.find((x) => x.group === m.group);
    if (!g) {
      g = { group: m.group, modules: [] };
      groups.push(g);
    }
    g.modules.push(m);
  }
  return groups;
}
