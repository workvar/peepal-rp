"use client";

// PF + ESI statutory details.

import { ShieldCheck, Percent, Stethoscope } from "lucide-react";
import FormSection, { Field } from "./FormSection";
import type { EmployeeFormState } from "@/types/pages/employees/page";

interface Props {
  form: EmployeeFormState;
  onValueChange: (field: keyof EmployeeFormState, value: string | number | boolean) => void;
}

export default function PfEsiTab({ form, onValueChange }: Props) {
  return (
    <div className="space-y-5">
      <FormSection icon={ShieldCheck} title="Provident Fund" accent="emerald" description="PF / UAN identifiers.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="PF Number">
            <input className="input-field" value={form.pf_number}
              onChange={(e) => onValueChange("pf_number", e.target.value)} />
          </Field>
          <Field label="UAN Number">
            <input className="input-field" value={form.uan_number}
              onChange={(e) => onValueChange("uan_number", e.target.value)} />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={Percent} title="Contribution %" accent="amber" description="Statutory contribution rates.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Employee Contribution" hint="Typical: 12%">
            <div className="relative">
              <input type="number" min={0} step={0.01} className="input-field pr-8"
                value={form.pf_employee_percent}
                onChange={(e) => onValueChange("pf_employee_percent", Number(e.target.value))} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </Field>
          <Field label="Employer Contribution" hint="Typical: 12%">
            <div className="relative">
              <input type="number" min={0} step={0.01} className="input-field pr-8"
                value={form.pf_employer_percent}
                onChange={(e) => onValueChange("pf_employer_percent", Number(e.target.value))} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </Field>
        </div>
      </FormSection>

      <FormSection icon={Stethoscope} title="ESI" accent="rose" description="Employee State Insurance.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="ESI Number">
            <input className="input-field" value={form.esi_number}
              onChange={(e) => onValueChange("esi_number", e.target.value)} />
          </Field>
          <Field label="ESI Dispensary">
            <input className="input-field" value={form.esi_dispensary}
              onChange={(e) => onValueChange("esi_dispensary", e.target.value)} />
          </Field>
        </div>
      </FormSection>
    </div>
  );
}
