"use client";

import type { AccessActionKey, AccessModuleMeta } from "@/types";
import { ACTIONS, AccessRow, groupModules } from "./accessHelpers";

// The module × action grid for one selected role. Module rows are grouped by
// their section; each column header toggles that action for every module, and
// the module label toggles all four actions for that row.
export default function AccessMatrixTable({
  modules,
  row,
  disabled,
  onToggleCell,
  onToggleColumn,
  onToggleRow,
}: {
  modules: AccessModuleMeta[];
  row: AccessRow;
  disabled: boolean;
  onToggleCell: (moduleId: string, action: AccessActionKey) => void;
  onToggleColumn: (action: AccessActionKey) => void;
  onToggleRow: (moduleId: string) => void;
}) {
  const groups = groupModules(modules);

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/40 dark:bg-slate-800/60">
            <th className="text-left font-semibold px-4 py-2.5 sticky left-0 bg-muted/40 dark:bg-slate-800/60 z-10 min-w-[200px]">
              Module
            </th>
            {ACTIONS.map((a) => (
              <th key={a.key} className="px-2 py-2 text-center font-semibold w-24">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleColumn(a.key)}
                  title={`${a.desc} — toggle all`}
                  className="flex flex-col items-center gap-0.5 mx-auto disabled:cursor-not-allowed"
                >
                  <span>{a.label}</span>
                  <span className="text-[10px] font-normal text-muted-foreground hover:text-primary">
                    all
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <GroupRows
              key={g.group}
              group={g.group}
              modules={g.modules}
              row={row}
              disabled={disabled}
              onToggleCell={onToggleCell}
              onToggleRow={onToggleRow}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({
  group,
  modules,
  row,
  disabled,
  onToggleCell,
  onToggleRow,
}: {
  group: string;
  modules: AccessModuleMeta[];
  row: AccessRow;
  disabled: boolean;
  onToggleCell: (moduleId: string, action: AccessActionKey) => void;
  onToggleRow: (moduleId: string) => void;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={1 + ACTIONS.length}
          className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/40 dark:bg-slate-800/30 border-t border-border"
        >
          {group}
        </td>
      </tr>
      {modules.map((m) => {
        const flags = row[m.id];
        return (
          <tr
            key={m.id}
            className="border-t border-border hover:bg-muted/30 dark:hover:bg-slate-800/30"
          >
            <td className="px-4 py-2 sticky left-0 bg-card z-10">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggleRow(m.id)}
                title="Toggle all for this module"
                className="text-left font-medium text-foreground hover:text-primary disabled:cursor-not-allowed disabled:hover:text-foreground"
              >
                {m.label}
              </button>
            </td>
            {ACTIONS.map((a) => (
              <td key={a.key} className="px-2 py-2 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-primary-600 disabled:opacity-60"
                  checked={!!flags?.[a.key]}
                  disabled={disabled}
                  onChange={() => onToggleCell(m.id, a.key)}
                  aria-label={`${m.label} — ${a.label}`}
                />
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}
