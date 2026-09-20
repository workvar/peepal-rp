// Types shared across the Salary page and its sub-components.

export interface SalaryTemplate {
  id: string;
  name: string;
  description?: string;
  basic_salary: number;
  hra: number;
  da: number;
  ta: number;
  medical_allowance: number;
  other_allowances: number;
  pf: number;
  esi: number;
  tds: number;
  other_deductions: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateFormState {
  name: string;
  description: string;
  basic_salary: number;
  hra: number;
  da: number;
  ta: number;
  medical_allowance: number;
  other_allowances: number;
  pf: number;
  esi: number;
  tds: number;
  other_deductions: number;
}

export interface AssignmentEmployee {
  id: string;
  employee_id?: string;
  user?: { id: string; name: string; email: string } | null;
  department?: { id: string; name: string } | null;
}

export interface SalaryAssignment {
  id: string;
  employee_id: string;
  template_id: string;
  extra_allowance: number;
  extra_deduction: number;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  notes?: string;
  employee?: AssignmentEmployee | null;
  template?: SalaryTemplate | null;
}

export const emptyTemplateForm: TemplateFormState = {
  name: '',
  description: '',
  basic_salary: 0,
  hra: 0,
  da: 0,
  ta: 0,
  medical_allowance: 0,
  other_allowances: 0,
  pf: 0,
  esi: 0,
  tds: 0,
  other_deductions: 0,
};

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

// Sum of all earnings in a template (exclusive of per-assignment overrides).
export function templateGross(t: SalaryTemplate): number {
  return (
    t.basic_salary +
    t.hra +
    t.da +
    t.ta +
    t.medical_allowance +
    t.other_allowances
  );
}

export function templateDeductions(t: SalaryTemplate): number {
  return t.pf + t.esi + t.tds + t.other_deductions;
}
