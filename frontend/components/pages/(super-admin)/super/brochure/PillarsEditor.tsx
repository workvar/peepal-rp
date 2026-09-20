"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Pillar } from "@/lib/brochure/content";

// Editor for the four "why choose" pillars.
export default function PillarsEditor({
  pillars,
  onChange,
}: {
  pillars: Pillar[];
  onChange: (next: Pillar[]) => void;
}) {
  const update = (i: number, patch: Partial<Pillar>) =>
    onChange(pillars.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i: number) => onChange(pillars.filter((_, idx) => idx !== i));
  const add = () => onChange([...pillars, { title: "New pillar", desc: "" }]);

  return (
    <div className="space-y-3">
      {pillars.map((p, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
          <input
            className="input-field flex-1"
            style={{ minWidth: 160 }}
            value={p.title}
            onChange={(e) => update(i, { title: e.target.value })}
            placeholder="Pillar title"
          />
          <input
            className="input-field flex-[2]"
            style={{ minWidth: 220 }}
            value={p.desc}
            onChange={(e) => update(i, { desc: e.target.value })}
            placeholder="Description"
          />
          <button type="button" className="btn-ghost p-2 text-red-600" onClick={() => remove(i)} aria-label="Remove">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={add}>
        <Plus size={15} /> Add pillar
      </button>
    </div>
  );
}
