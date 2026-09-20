import type { DraftSalary } from "@/types/pages/employees/page";

/** A fresh, empty draft salary selection used while creating an employee. */
export function emptyDraftSalary(): DraftSalary {
  return {
    template_id: "",
    extra_allowance: 0,
    extra_deduction: 0,
    effective_from: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}
