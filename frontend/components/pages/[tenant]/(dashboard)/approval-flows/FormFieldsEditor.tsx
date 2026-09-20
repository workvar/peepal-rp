"use client";

import { Trash2 } from "lucide-react";
import type { FormField, FormFieldType } from "@/api/services/approvals";

interface Props {
  fields: FormField[];
  onChange: (next: FormField[]) => void;
}

const TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text",     label: "Text" },
  { value: "number",   label: "Number" },
  { value: "date",     label: "Date" },
  { value: "textarea", label: "Long text" },
];

// FormFieldsEditor lets the admin define what inputs a requester fills in
// when raising a request through this flow. Field keys are the labels used
// in step conditions and stored as JSON keys in the request payload.
export default function FormFieldsEditor({ fields, onChange }: Props) {
  const update = (idx: number, patch: Partial<FormField>) => {
    const copy = [...fields];
    copy[idx] = { ...copy[idx], ...patch };
    onChange(copy);
  };
  const remove = (idx: number) => onChange(fields.filter((_, i) => i !== idx));
  const add = () =>
    onChange([
      ...fields,
      { key: `field_${fields.length + 1}`, label: "", type: "text", required: false },
    ]);

  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No form fields. Requesters will only enter a title.
        </p>
      )}
      {fields.map((f, idx) => (
        <div key={idx} className="card p-3 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_0.8fr_auto_auto] gap-2 items-center">
          <input
            className="input-field"
            placeholder="Label (e.g. Amount)"
            value={f.label}
            onChange={(e) => update(idx, { label: e.target.value })}
          />
          <input
            className="input-field font-mono text-xs"
            placeholder="key"
            value={f.key}
            onChange={(e) => update(idx, { key: e.target.value.replace(/\s+/g, "_") })}
          />
          <select
            className="input-field"
            value={f.type}
            onChange={(e) => update(idx, { type: e.target.value as FormFieldType })}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="text-xs flex items-center gap-1 whitespace-nowrap">
            <input
              type="checkbox"
              checked={!!f.required}
              onChange={(e) => update(idx, { required: e.target.checked })}
            />
            Required
          </label>
          <button
            type="button"
            onClick={() => remove(idx)}
            className="text-red-600 hover:text-red-800 p-1"
            aria-label="Remove field"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button type="button" className="btn-ghost" onClick={add}>
        + Add field
      </button>
    </div>
  );
}
