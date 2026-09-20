"use client";

// The field list: reorder, rename, toggle, and add custom rows.

import { Plus } from "lucide-react";
import FieldRow from "./FieldRow";
import type { OpdSlipConfig, SlipField } from "@/components/opd-slip/types";

export default function FieldsSection({
  config,
  set,
}: {
  config: OpdSlipConfig;
  set: (patch: Partial<OpdSlipConfig>) => void;
}) {
  const fields = config.fields;

  const update = (index: number, patch: Partial<SlipField>) =>
    set({ fields: fields.map((f, i) => (i === index ? { ...f, ...patch } : f)) });

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    set({ fields: next });
  };

  const remove = (index: number) => set({ fields: fields.filter((_, i) => i !== index) });

  const addCustom = () =>
    set({
      fields: [
        ...fields,
        {
          key: `custom:${Date.now().toString(36)}`,
          label: "New field",
          enabled: true,
          source: "blank",
        },
      ],
    });

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Printed fields</h3>
        <button type="button" className="btn-secondary flex items-center gap-2" onClick={addCustom}>
          <Plus size={14} /> Add custom field
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Tick what prints, rename the label to match your existing stationery, and reorder with the
        arrows. &quot;Blank line&quot; prints an empty ruled line to fill by hand.
      </p>

      {fields.map((f, i) => (
        <FieldRow
          key={f.key}
          field={f}
          onChange={(patch) => update(i, patch)}
          onMove={(delta) => move(i, delta)}
          onRemove={() => remove(i)}
        />
      ))}
    </div>
  );
}
