"use client";

import { Switch } from "@/components/ui/switch";
import { GRADE_MODE_LABELS, GPA_MODES, type GradeMode } from "@/types/grading";
import type { SchemeForm } from "./types";

const MODES: GradeMode[] = ["cgpa", "gpa", "percentage", "letter", "pass_fail"];

function modeHint(mode: GradeMode): string {
  switch (mode) {
    case "cgpa":
      return "Students see an SGPA per semester and a cumulative CGPA.";
    case "gpa":
      return "Students see a GPA (grade points) per semester.";
    case "percentage":
      return "Students see a percentage per semester and overall.";
    case "letter":
      return "Students see a letter grade per subject and overall.";
    case "pass_fail":
      return "Students see only pass or fail.";
  }
}

type Props = {
  form: SchemeForm;
  onChange: (patch: Partial<SchemeForm>) => void;
  disabled?: boolean;
};

export default function SchemeSettings({ form, onChange, disabled }: Props) {
  const isGpa = GPA_MODES.includes(form.mode);

  return (
    <div className="card space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2">Result type</label>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ mode: m })}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                form.mode === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              {GRADE_MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{modeHint(form.mode)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {isGpa && (
          <div>
            <label className="block text-sm font-medium mb-1">Max grade point</label>
            <input
              type="number"
              step="0.1"
              className="input-field w-full"
              value={form.gpaMax}
              onChange={(e) => onChange({ gpaMax: e.target.value })}
              disabled={disabled}
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Pass mark (%)</label>
          <input
            type="number"
            className="input-field w-full"
            value={form.passThreshold}
            onChange={(e) => onChange({ passThreshold: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Decimal places</label>
          <input
            type="number"
            min="0"
            max="3"
            className="input-field w-full"
            value={form.decimals}
            onChange={(e) => onChange({ decimals: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        {isGpa && (
          <Switch
            label="Weight GPA / CGPA by subject credits"
            labelPosition="left"
            checked={form.creditWeighted}
            onCheckedChange={(v) => onChange({ creditWeighted: v })}
            disabled={disabled}
          />
        )}
        <Switch
          label="Combine a subject's assessments by exam-type weightage"
          labelPosition="left"
          checked={form.weightedByExamType}
          onCheckedChange={(v) => onChange({ weightedByExamType: v })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
