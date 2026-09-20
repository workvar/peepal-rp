"use client";

import { useEffect, useState } from "react";
import type { GqlMessMenu } from "./types";
import { DAYS, MEALS, MEAL_LABELS, cellKey } from "./types";

/**
 * The weekly menu as a day × meal grid. Each cell is edited in place and
 * saved on blur, so setting a week's menu is one pass down the grid rather
 * than a modal per cell.
 */
export default function MenuGrid({
  menu,
  canWrite,
  onSave,
}: {
  menu: GqlMessMenu[];
  canWrite: boolean;
  onSave: (dayOfWeek: number, meal: string, items: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const cell of menu) next[cellKey(cell.dayOfWeek, cell.meal)] = cell.items ?? "";
    setDraft(next);
  }, [menu]);

  const commit = async (dayOfWeek: number, meal: string) => {
    const key = cellKey(dayOfWeek, meal);
    const value = draft[key] ?? "";
    const original = menu.find((c) => c.dayOfWeek === dayOfWeek && c.meal === meal)?.items ?? "";
    if (value === original) return;
    await onSave(dayOfWeek, meal, value);
  };

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/40">
          <tr>
            <th className="table-th w-28">Day</th>
            {MEALS.map((m) => <th key={m} className="table-th">{MEAL_LABELS[m]}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {DAYS.map((day, dayIndex) => (
            <tr key={day}>
              <td className="table-td font-medium align-top">{day}</td>
              {MEALS.map((meal) => {
                const key = cellKey(dayIndex, meal);
                return (
                  <td key={meal} className="table-td align-top">
                    <textarea
                      className="input-field min-h-[64px] text-sm"
                      placeholder={canWrite ? "One item per line" : "—"}
                      disabled={!canWrite}
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      onBlur={() => commit(dayIndex, meal)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
