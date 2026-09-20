"use client";

import type { ApprovalStep, ConditionOp, FormField } from "@/api/services/approvals";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface Props {
  step: ApprovalStep;
  formFields: FormField[];
  onChange: (next: ApprovalStep) => void;
}

const OPS: ConditionOp[] = ["=", "!=", "<", "<=", ">", ">="];

// StepCondition renders an optional rule that gates whether the step runs.
// When all three (field, op, value) are blank the step is unconditional.
export default function StepCondition({ step, formFields, onChange }: Props) {
  const update = (patch: Partial<ApprovalStep>) => onChange({ ...step, ...patch });
  const enabled = !!step.condition_field;

  return (
    <div className="border-t border-border pt-3 mt-2">
      <label className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            update(
              e.target.checked
                ? { condition_field: formFields[0]?.key ?? "", condition_op: "=", condition_value: "" }
                : { condition_field: null, condition_op: null, condition_value: null }
            )
          }
        />
        Only run this step when…
      </label>
      {enabled && (
        <div className="grid grid-cols-3 gap-2">
          <SearchableSelect
            value={step.condition_field ?? ""}
            onChange={(v) => update({ condition_field: v })}
            options={formFields.map((f) => ({ value: f.key, label: f.label || f.key }))}
            placeholder="— field —"
          />
          <select
            className="input-field"
            value={step.condition_op ?? "="}
            onChange={(e) => update({ condition_op: e.target.value as ConditionOp })}
          >
            {OPS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="value"
            value={step.condition_value ?? ""}
            onChange={(e) => update({ condition_value: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
