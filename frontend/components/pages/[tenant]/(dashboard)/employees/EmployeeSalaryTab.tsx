'use client';

// EmployeeSalaryTab — salary content shown inside the Employee form modal.
//
// Two modes:
//   • EDIT (employeeId present) → list current assignment, fetch history,
//     allow changing template via GraphQL.
//   • CREATE (employeeId is null) → render SalaryDraftPanel, which captures a
//     template selection into form state. Page.tsx replays that draft as a
//     salary-assignment mutation once the employee has been created.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from '@apollo/client';
import { apolloClient } from '@/lib/apollo';
import { GET_SALARY_ASSIGNMENTS } from '@/graphql/queries/salary';
import { ASSIGN_SALARY_TEMPLATE } from '@/graphql/mutations/salary';
import { useSalaryTemplates, formatCurrency, type Template } from './form/useSalaryTemplates';
import SalaryDraftPanel from './form/SalaryDraftPanel';
import FormSection, { Field } from './form/FormSection';
import SelectBox from '@/components/ui/SelectBox';
import { Wallet, CalendarDays, Plus, Minus, History } from 'lucide-react';
import type { DraftSalary } from '@/types/pages/employees/page';
import { FormSkeleton } from '@/components/ui/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

interface Assignment {
  id: string;
  employee_id: string;
  template_id: string;
  extra_allowance: number;
  extra_deduction: number;
  effective_from: string;
  is_active: boolean;
  notes?: string;
  template?: Template | null;
}

// Normalise GQL camelCase assignment to local snake_case shape.
function normaliseAssignment(a: Record<string, unknown>): Assignment {
  const tpl = a.template as Record<string, unknown> | null;
  return {
    id: a.id as string,
    employee_id: a.employeeId as string,
    template_id: a.templateId as string,
    extra_allowance: a.extraAllowance as number,
    extra_deduction: a.extraDeduction as number,
    effective_from: a.effectiveFrom as string,
    is_active: a.isActive as boolean,
    notes: a.notes as string | undefined,
    template: tpl
      ? {
          id: tpl.id as string,
          name: tpl.name as string,
          description: tpl.description as string | undefined,
          basic_salary: tpl.basicSalary as number,
          hra: tpl.hra as number,
          da: tpl.da as number,
          ta: tpl.ta as number,
          medical_allowance: tpl.medicalAllowance as number,
          other_allowances: tpl.otherAllowances as number,
          pf: tpl.pf as number,
          esi: tpl.esi as number,
          tds: tpl.tds as number,
          other_deductions: tpl.otherDeductions as number,
        }
      : null,
  };
}

interface Props {
  /** null while creating — the draft panel is rendered in that case. */
  employeeId: string | null;
  /** Draft state used in CREATE mode only. */
  draft?: DraftSalary;
  onDraftChange?: (next: DraftSalary) => void;
}

export default function EmployeeSalaryTab({ employeeId, draft, onDraftChange }: Props) {
  // ── Create mode ────────────────────────────────────────────────────────
  if (!employeeId) {
    if (!draft || !onDraftChange) {
      return (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Salary capture is unavailable.
        </div>
      );
    }
    return <SalaryDraftPanel draft={draft} onChange={onDraftChange} />;
  }

  // ── Edit mode ──────────────────────────────────────────────────────────
  return <EditModePanel employeeId={employeeId} />;
}

// ─────────────────────────────────────────────────────────────────────────

function EditModePanel({ employeeId }: { employeeId: string }) {
  const { templates, loading: loadingTpl } = useSalaryTemplates(true);

  const {
    data: asnData,
    loading: loadingAsn,
    refetch: refetchAssignments,
  } = useQuery(GET_SALARY_ASSIGNMENTS, {
    variables: { employeeId },
    fetchPolicy: 'network-only',
  });

  const assignments: Assignment[] = (asnData?.salaryAssignments ?? []).map(normaliseAssignment);
  const loading = loadingTpl || loadingAsn;

  const [saving, setSaving] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [extraAllowance, setExtraAllowance] = useState(0);
  const [extraDeduction, setExtraDeduction] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const activeAssignment = assignments.find((a) => a.is_active);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) return;
    setSaving(true);
    try {
      await apolloClient.mutate({
        mutation: ASSIGN_SALARY_TEMPLATE,
        variables: {
          input: {
            employeeId,
            templateId,
            extraAllowance,
            extraDeduction,
            effectiveFrom,
            notes,
          },
        },
      });
      toast.success(activeAssignment ? 'Template changed' : 'Template assigned');
      await refetchAssignments();
      setTemplateId('');
      setExtraAllowance(0);
      setExtraDeduction(0);
      setNotes('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-60" />
        </div>
        <FormSkeleton fields={4} cols={2} withSubmit />
      </div>
    );
  }

  return (
    <form onSubmit={handleAssign} className="space-y-5">
      {/* Current assignment */}
      <FormSection icon={Wallet} title="Current Assignment" accent="rose" description="Active template for this employee.">
        {activeAssignment && activeAssignment.template ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="text-base font-semibold text-foreground">{activeAssignment.template.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Basic {formatCurrency(activeAssignment.template.basic_salary)} · Effective from{' '}
              {new Date(activeAssignment.effective_from).toLocaleDateString()}
            </div>
            {(activeAssignment.extra_allowance || activeAssignment.extra_deduction) ? (
              <div className="mt-1 text-xs">
                {activeAssignment.extra_allowance ? (
                  <span className="mr-2 text-emerald-500">+{formatCurrency(activeAssignment.extra_allowance)}</span>
                ) : null}
                {activeAssignment.extra_deduction ? (
                  <span className="text-rose-500">-{formatCurrency(activeAssignment.extra_deduction)}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No template currently assigned.
          </div>
        )}
      </FormSection>

      {/* Change template */}
      <FormSection
        icon={CalendarDays}
        title={activeAssignment ? 'Change Template' : 'Attach Template'}
        accent="violet"
        description="Pick a template and optional per-employee overrides."
      >
        <div className="space-y-3">
          <Field label="Template" required>
            <SelectBox
              value={templateId}
              onChange={setTemplateId}
              placeholder="Select a template…"
              required
              searchable={templates.length > 8}
              options={templates.map((t) => ({
                value: t.id,
                label: t.name,
                hint: `Basic ${formatCurrency(t.basic_salary)}`,
              }))}
            />
            {templates.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No templates exist yet. Create one from the Salary Structures page first.
              </p>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Effective From" required>
              <input type="date" required className="input-field" value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)} />
            </Field>
            <Field label="Notes">
              <input className="input-field" placeholder="Reason (optional)"
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Field label="Extra Allowance" hint="Added on top of template earnings.">
              <div className="relative">
                <Plus className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-500" />
                <input type="number" min={0} step={0.01} className="input-field pl-9"
                  value={extraAllowance}
                  onChange={(e) => setExtraAllowance(parseFloat(e.target.value) || 0)} />
              </div>
            </Field>
            <Field label="Extra Deduction" hint="E.g. loan recovery.">
              <div className="relative">
                <Minus className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rose-500" />
                <input type="number" min={0} step={0.01} className="input-field pl-9"
                  value={extraDeduction}
                  onChange={(e) => setExtraDeduction(parseFloat(e.target.value) || 0)} />
              </div>
            </Field>
          </div>

          <button
            type="submit"
            disabled={saving || !templateId}
            className="btn-primary w-full rounded-xl py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : activeAssignment ? 'Change to this template' : 'Attach template'}
          </button>
        </div>
      </FormSection>

      {/* History */}
      {assignments.length > 1 && (
        <FormSection icon={History} title="Assignment History" accent="slate" description="Past assignments for this employee.">
          <div className="overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Template</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">From</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2">{a.template?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(a.effective_from).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.is_active
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        {a.is_active ? 'Active' : 'Closed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FormSection>
      )}
    </form>
  );
}
