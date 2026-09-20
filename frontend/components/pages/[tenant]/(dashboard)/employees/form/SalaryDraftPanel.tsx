'use client';

// SalaryDraftPanel — shown in the Salary tab while CREATING an employee.
// Captures a template + overrides into form-level state, which the page
// replays as a salary-assignment POST immediately after createEmployee
// succeeds. No network calls happen here.

import { Wallet, CalendarDays, StickyNote, Plus, Minus, Sparkles } from 'lucide-react';
import FormSection, { Field } from './FormSection';
import { useSalaryTemplates, formatCurrency, type Template } from './useSalaryTemplates';
import type { DraftSalary } from '@/types/pages/employees/page';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  draft: DraftSalary;
  onChange: (next: DraftSalary) => void;
}

export default function SalaryDraftPanel({ draft, onChange }: Props) {
  const { templates, loading } = useSalaryTemplates(true);
  const selected: Template | undefined = templates.find((t) => t.id === draft.template_id);

  const set = <K extends keyof DraftSalary>(key: K, value: DraftSalary[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Pick a salary template now and it will be auto-attached the moment this employee is saved.
          You can still change or fine-tune it afterwards from the employee's edit screen.
        </p>
      </div>

      <FormSection icon={Wallet} title="Salary Template" accent="rose" description="Reusable pay structure to attach.">
        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No templates exist yet. Create one from the <span className="font-medium text-foreground">Salary Structures</span> page first.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {templates.map((t) => {
              const active = t.id === draft.template_id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('template_id', active ? '' : t.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-rose-500/60 bg-rose-500/10 ring-2 ring-rose-500/30'
                      : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{t.name}</span>
                    {active && <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Selected</span>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Basic <span className="font-medium text-foreground">{formatCurrency(t.basic_salary)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </FormSection>

      {selected && (
        <>
          {/* Preview */}
          <FormSection icon={Sparkles} title="Preview" accent="violet" description="Component breakdown from the template.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Basic',     selected.basic_salary],
                ['HRA',       selected.hra],
                ['DA',        selected.da],
                ['TA',        selected.ta],
                ['Medical',   selected.medical_allowance],
                ['Other All', selected.other_allowances],
                ['PF',        selected.pf],
                ['TDS',       selected.tds],
              ].map(([label, val]) => (
                <div key={label as string} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label as string}</div>
                  <div className="mt-0.5 text-sm font-semibold text-foreground">{formatCurrency(val as number)}</div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Overrides */}
          <FormSection icon={CalendarDays} title="Assignment Details" accent="cyan" description="Effective date, overrides, and notes.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Effective From" required>
                <input type="date" className="input-field" required
                  value={draft.effective_from}
                  onChange={(e) => set('effective_from', e.target.value)} />
              </Field>
              <Field label="Notes">
                <div className="relative">
                  <StickyNote className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input className="input-field pl-9" placeholder="Reason (optional)"
                    value={draft.notes}
                    onChange={(e) => set('notes', e.target.value)} />
                </div>
              </Field>
              <Field label="Extra Allowance" hint="Added on top of template earnings.">
                <div className="relative">
                  <Plus className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-500" />
                  <input type="number" min={0} step={0.01} className="input-field pl-9"
                    value={draft.extra_allowance}
                    onChange={(e) => set('extra_allowance', parseFloat(e.target.value) || 0)} />
                </div>
              </Field>
              <Field label="Extra Deduction" hint="E.g. loan recovery.">
                <div className="relative">
                  <Minus className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-rose-500" />
                  <input type="number" min={0} step={0.01} className="input-field pl-9"
                    value={draft.extra_deduction}
                    onChange={(e) => set('extra_deduction', parseFloat(e.target.value) || 0)} />
                </div>
              </Field>
            </div>
          </FormSection>
        </>
      )}
    </div>
  );
}
