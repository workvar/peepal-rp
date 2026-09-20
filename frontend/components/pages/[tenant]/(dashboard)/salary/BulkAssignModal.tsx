'use client';

// BulkAssignModal — pick one template + multi-select employees to assign.
// Supports optional extra allowance / extra deduction that applies to every
// assignment created here. Per-employee fine-tuning can be done after.

import { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { SalaryTemplate, AssignmentEmployee } from './types';
import SearchableSelect from "@/components/ui/SearchableSelect";

interface Props {
  isOpen: boolean;
  templates: SalaryTemplate[];
  employees: AssignmentEmployee[];
  submitting: boolean;
  /** Pre-selected template (e.g. when opened from a specific template row). */
  initialTemplateId?: string;
  onClose: () => void;
  onSubmit: (payload: {
    template_id: string;
    employee_ids: string[];
    extra_allowance: number;
    extra_deduction: number;
    effective_from: string;
    notes: string;
  }) => Promise<void> | void;
}

export default function BulkAssignModal({
  isOpen,
  templates,
  employees,
  submitting,
  initialTemplateId,
  onClose,
  onSubmit,
}: Props) {
  const [templateId, setTemplateId] = useState(initialTemplateId ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extraAllowance, setExtraAllowance] = useState(0);
  const [extraDeduction, setExtraDeduction] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return employees;
    return employees.filter((e) => {
      return (
        e.user?.name.toLowerCase().includes(needle) ||
        e.user?.email.toLowerCase().includes(needle) ||
        e.employee_id?.toLowerCase().includes(needle) ||
        e.department?.name.toLowerCase().includes(needle)
      );
    });
  }, [employees, search]);

  function toggle(empId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e) => e.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) return;
    await onSubmit({
      template_id: templateId,
      employee_ids: Array.from(selected),
      extra_allowance: extraAllowance,
      extra_deduction: extraDeduction,
      effective_from: effectiveFrom,
      notes,
    });
  }

  const disabled = !templateId || selected.size === 0 || submitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Template to Employees" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground/80">Template *</label>
          <SearchableSelect
            required
            value={templateId}
            onChange={setTemplateId}
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Select a template…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Effective From *</label>
            <input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for assignment (optional)"
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Extra Allowance (per employee)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={extraAllowance}
              onChange={(e) => setExtraAllowance(parseFloat(e.target.value) || 0)}
              className="input-field"
            />
            <p className="mt-1 text-xs text-muted-foreground">Added on top of the template earnings.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/80">Extra Deduction (per employee)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={extraDeduction}
              onChange={(e) => setExtraDeduction(parseFloat(e.target.value) || 0)}
              className="input-field"
            />
            <p className="mt-1 text-xs text-muted-foreground">E.g. loan recovery, per-person adjustment.</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-foreground/80">
              Employees <span className="text-muted-foreground">({selected.size} selected)</span>
            </label>
            <button type="button" onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
              {selected.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, department…"
            className="input-field mb-2"
          />

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No employees</div>
            ) : (
              <ul className="divide-y divide-border/60">
                {filtered.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggle(e.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-foreground">{e.user?.name ?? e.employee_id ?? e.id}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.user?.email} {e.department?.name ? `· ${e.department.name}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button type="submit" disabled={disabled} className="btn-primary flex-1 disabled:opacity-50">
            {submitting ? 'Assigning…' : `Assign to ${selected.size} employee${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
