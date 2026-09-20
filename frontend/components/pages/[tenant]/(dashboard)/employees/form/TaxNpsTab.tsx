"use client";

// Tax + NPS + gratuity.

import { Receipt, FileText, PiggyBank, CheckCircle2 } from "lucide-react";
import SelectBox from "@/components/ui/SelectBox";
import FormSection, { Field } from "./FormSection";
import type { EmployeeFormState } from "@/types/pages/employees/page";

const TAX_REGIME_OPTS = [
  { value: "old", label: "Old" },
  { value: "new", label: "New" },
];

const NPS_TIER_OPTS = [
  { value: "tier1", label: "Tier 1" },
  { value: "tier2", label: "Tier 2" },
];

interface Props {
  form: EmployeeFormState;
  onValueChange: (field: keyof EmployeeFormState, value: string | number | boolean) => void;
}

export default function TaxNpsTab({ form, onValueChange }: Props) {
  return (
    <div className="space-y-5">
      <FormSection icon={Receipt} title="Tax" accent="amber" description="PAN and selected tax regime.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="PAN Number">
            <input className="input-field uppercase tracking-wider" placeholder="ABCDE1234F"
              value={form.pan_number}
              onChange={(e) => onValueChange("pan_number", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Tax Regime">
            <SelectBox
              value={form.tax_regime}
              onChange={(v) => onValueChange("tax_regime", v)}
              options={TAX_REGIME_OPTS}
            />
          </Field>
          <Field label="Form 16 Reference" className="sm:col-span-2">
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input className="input-field pl-9" value={form.form16_ref}
                onChange={(e) => onValueChange("form16_ref", e.target.value)} />
            </div>
          </Field>
        </div>
      </FormSection>

      <FormSection icon={PiggyBank} title="NPS" accent="violet" description="National Pension Scheme.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="NPS Account Number">
            <input className="input-field" value={form.nps_account_number}
              onChange={(e) => onValueChange("nps_account_number", e.target.value)} />
          </Field>
          <Field label="NPS Tier">
            <SelectBox
              value={form.nps_tier}
              onChange={(v) => onValueChange("nps_tier", v)}
              options={NPS_TIER_OPTS}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={CheckCircle2} title="Gratuity" accent="emerald" description="Long-service benefit eligibility.">
        <label
          htmlFor="gratuity"
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/30"
        >
          <input
            id="gratuity"
            type="checkbox"
            className="h-4 w-4 accent-emerald-500"
            checked={form.gratuity_eligible}
            onChange={(e) => onValueChange("gratuity_eligible", e.target.checked)}
          />
          <span className="flex-1 text-sm font-medium text-foreground">Eligible for Gratuity</span>
          <span className={`text-xs font-medium ${form.gratuity_eligible ? "text-emerald-500" : "text-muted-foreground"}`}>
            {form.gratuity_eligible ? "Enabled" : "Disabled"}
          </span>
        </label>
      </FormSection>
    </div>
  );
}
