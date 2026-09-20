"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { permissionGroupsFor, type PermissionGroup, groupAccent } from "./permissions";
import { useTenantType } from "@/store/hooks/useTerminology";

// Grouped permission checkboxes with expand/collapse and group-level
// select-all (indeterminate when partially checked).
export default function PermissionEditor({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (perms: string[]) => void;
}) {
  // Only the groups that exist for this industry — a hospital gets no
  // Students / Marks / Fees permissions to hand out.
  const groups = permissionGroupsFor(useTenantType());

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.label, true]))
  );

  const toggle = (key: string) => {
    onChange(
      selected.includes(key) ? selected.filter((p) => p !== key) : [...selected, key]
    );
  };

  const toggleAll = (group: PermissionGroup) => {
    const keys = group.permissions.map((p) => p.key);
    const allOn = keys.every((k) => selected.includes(k));
    if (allOn) {
      onChange(selected.filter((p) => !keys.includes(p)));
    } else {
      onChange(Array.from(new Set([...selected, ...keys])));
    }
  };

  const toggleExpand = (label: string) =>
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const keys = group.permissions.map((p) => p.key);
        const checkedCount = keys.filter((k) => selected.includes(k)).length;
        const allChecked = checkedCount === keys.length;
        const someChecked = checkedCount > 0 && !allChecked;
        const isOpen = expanded[group.label];

        return (
          <div
            key={group.label}
            className={`rounded-xl border ${groupAccent[group.color]} overflow-hidden`}
          >
            {/* Group header */}
            <div className="flex items-center justify-between px-4 py-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={() => toggleAll(group)}
                  className="w-4 h-4 rounded accent-primary-600"
                />
                <span className="font-semibold text-sm">{group.label}</span>
                <span className="text-xs opacity-60">
                  {checkedCount}/{keys.length}
                </span>
              </label>
              <button
                type="button"
                onClick={() => toggleExpand(group.label)}
                className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
              >
                {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>

            {/* Permission rows */}
            {isOpen && (
              <div className="border-t border-current/10 divide-y divide-current/10">
                {group.permissions.map((perm) => (
                  <label
                    key={perm.key}
                    className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-card/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(perm.key)}
                      onChange={() => toggle(perm.key)}
                      className="mt-0.5 w-4 h-4 rounded accent-primary-600"
                    />
                    <div>
                      <p className="text-sm font-medium">{perm.label}</p>
                      {perm.description && (
                        <p className="text-xs opacity-60 mt-0.5">{perm.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
