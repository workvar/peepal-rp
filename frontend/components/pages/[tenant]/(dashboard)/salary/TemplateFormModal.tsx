'use client';

// TemplateFormModal — create or edit a named salary template.
// No employee selection here; a template is tenant-wide and reusable.

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { emptyTemplateForm, type TemplateFormState, type SalaryTemplate } from './types';

interface Props {
  isOpen: boolean;
  editing: SalaryTemplate | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (form: TemplateFormState) => Promise<void> | void;
}

const EARNING_FIELDS: Array<{ label: string; key: keyof TemplateFormState }> = [
  { label: 'Basic Salary *', key: 'basic_salary' },
  { label: 'HRA', key: 'hra' },
  { label: 'DA', key: 'da' },
  { label: 'TA', key: 'ta' },
  { label: 'Medical Allowance', key: 'medical_allowance' },
  { label: 'Other Allowances', key: 'other_allowances' },
];

const DEDUCTION_FIELDS: Array<{ label: string; key: keyof TemplateFormState }> = [
  { label: 'PF', key: 'pf' },
  { label: 'ESI', key: 'esi' },
  { label: 'TDS', key: 'tds' },
  { label: 'Other Deductions', key: 'other_deductions' },
];

export default function TemplateFormModal({ isOpen, editing, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<TemplateFormState>(emptyTemplateForm);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? '',
        basic_salary: editing.basic_salary,
        hra: editing.hra,
        da: editing.da,
        ta: editing.ta,
        medical_allowance: editing.medical_allowance,
        other_allowances: editing.other_allowances,
        pf: editing.pf,
        esi: editing.esi,
        tds: editing.tds,
        other_deductions: editing.other_deductions,
      });
    } else {
      setForm(emptyTemplateForm);
    }
  }, [editing, isOpen]);

  function setNumber(key: keyof TemplateFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Salary Template' : 'New Salary Template'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">Template Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Assistant Professor - Grade A"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short note about when to use this template"
            className="input-field"
          />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnings</p>
        <div className="grid grid-cols-2 gap-3">
          {EARNING_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm font-medium text-foreground/80">{f.label}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form[f.key] as number}
                onChange={(e) => setNumber(f.key, e.target.value)}
                className="input-field"
              />
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
        <div className="grid grid-cols-2 gap-3">
          {DEDUCTION_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm font-medium text-foreground/80">{f.label}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form[f.key] as number}
                onChange={(e) => setNumber(f.key, e.target.value)}
                className="input-field"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">
            {submitting ? (editing ? 'Updating…' : 'Creating…') : editing ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
