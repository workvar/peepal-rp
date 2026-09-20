"use client";

// Bank account details tab.

import { Landmark, Hash, MapPin } from "lucide-react";
import SelectBox from "@/components/ui/SelectBox";
import FormSection, { Field } from "./FormSection";
import type { EmployeeFormState } from "@/types/pages/employees/page";

const ACCOUNT_TYPE_OPTS = [
  { value: "savings", label: "Savings" },
  { value: "current", label: "Current" },
];

interface Props {
  form: EmployeeFormState;
  onValueChange: (field: keyof EmployeeFormState, value: string | number | boolean) => void;
}

export default function BankTab({ form, onValueChange }: Props) {
  return (
    <div className="space-y-5">
      <FormSection icon={Landmark} title="Bank" accent="cyan" description="Salary disbursement account.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bank Name">
            <input className="input-field" placeholder="State Bank of India"
              value={form.bank_name}
              onChange={(e) => onValueChange("bank_name", e.target.value)} />
          </Field>
          <Field label="Account Type">
            <SelectBox
              value={form.account_type}
              onChange={(v) => onValueChange("account_type", v)}
              options={ACCOUNT_TYPE_OPTS}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={Hash} title="Account" accent="violet" description="Account & branch identifiers.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Account Number" className="sm:col-span-2">
            <input className="input-field" placeholder="•••• •••• ••••"
              value={form.account_number}
              onChange={(e) => onValueChange("account_number", e.target.value)} />
          </Field>
          <Field label="IFSC Code">
            <input className="input-field" placeholder="SBIN0001234"
              value={form.ifsc_code}
              onChange={(e) => onValueChange("ifsc_code", e.target.value)} />
          </Field>
          <Field label="Branch Name">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input className="input-field pl-9"
                value={form.branch_name}
                onChange={(e) => onValueChange("branch_name", e.target.value)} />
            </div>
          </Field>
        </div>
      </FormSection>
    </div>
  );
}
