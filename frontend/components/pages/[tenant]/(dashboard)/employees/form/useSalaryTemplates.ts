'use client';

// Tiny hook: fetches the tenant's salary templates once, returning the
// list + a loading flag. Shared by the edit-mode and create-mode views
// of the Salary tab so we don't duplicate fetch logic.

import { useQuery } from '@apollo/client';
import { GET_SALARY_TEMPLATES } from '@/graphql/queries/salary';

export interface Template {
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
}

// Normalise GQL camelCase to the snake_case shape used across the salary UI.
function normalise(t: Record<string, unknown>): Template {
  return {
    id: t.id as string,
    name: t.name as string,
    description: t.description as string | undefined,
    basic_salary: t.basicSalary as number,
    hra: t.hra as number,
    da: t.da as number,
    ta: t.ta as number,
    medical_allowance: t.medicalAllowance as number,
    other_allowances: t.otherAllowances as number,
    pf: t.pf as number,
    esi: t.esi as number,
    tds: t.tds as number,
    other_deductions: t.otherDeductions as number,
  };
}

export function useSalaryTemplates(enabled: boolean) {
  const { data, loading } = useQuery(GET_SALARY_TEMPLATES, {
    skip: !enabled,
    fetchPolicy: 'cache-first',
  });

  const templates: Template[] = (data?.salaryTemplates ?? []).map(normalise);
  return { templates, loading };
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}
