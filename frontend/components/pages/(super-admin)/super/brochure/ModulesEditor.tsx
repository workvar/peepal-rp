"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ICON_KEYS, iconFor } from "@/lib/brochure/icons";
import type { ModuleItem } from "@/lib/brochure/content";

// Editor for the ordered list of modules shown on the feature page.
export default function ModulesEditor({
  modules,
  onChange,
}: {
  modules: ModuleItem[];
  onChange: (next: ModuleItem[]) => void;
}) {
  const update = (i: number, patch: Partial<ModuleItem>) =>
    onChange(modules.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const remove = (i: number) =>
    onChange(modules.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= modules.length) return;
    const next = [...modules];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const add = () =>
    onChange([
      ...modules,
      { name: "New module", tagline: "Short tagline.", icon: ICON_KEYS[0] },
    ]);

  return (
    <div className="space-y-3">
      {modules.map((m, i) => {
        const Icon = iconFor(m.icon);
        return (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f5f1]">
              <Icon size={20} className="text-[#1f5d36]" />
            </div>
            <input
              className="input-field flex-1"
              style={{ minWidth: 160 }}
              value={m.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Module name"
            />
            <input
              className="input-field flex-1"
              style={{ minWidth: 180 }}
              value={m.tagline}
              onChange={(e) => update(i, { tagline: e.target.value })}
              placeholder="Tagline"
            />
            <select
              className="input-field"
              style={{ width: 150 }}
              value={m.icon}
              onChange={(e) => update(i, { icon: e.target.value })}
            >
              {ICON_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <button type="button" className="btn-ghost p-2" onClick={() => move(i, -1)} aria-label="Move up">
                <ArrowUp size={15} />
              </button>
              <button type="button" className="btn-ghost p-2" onClick={() => move(i, 1)} aria-label="Move down">
                <ArrowDown size={15} />
              </button>
              <button type="button" className="btn-ghost p-2 text-red-600" onClick={() => remove(i)} aria-label="Remove">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}

      <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={add}>
        <Plus size={15} /> Add module
      </button>
    </div>
  );
}
