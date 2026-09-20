'use client';

// TemplatesTab — lists all salary templates with edit / delete actions.

import { Edit2, Users } from 'lucide-react';
import Can from '@/components/access/Can';
import { formatCurrency, templateDeductions, templateGross, type SalaryTemplate } from './types';

interface Props {
  templates: SalaryTemplate[];
  loading: boolean;
  search: string;
  assignmentCounts: Record<string, number>; // template_id -> # active assignments
  onEdit: (t: SalaryTemplate) => void;
  onDelete: (t: SalaryTemplate) => void;
  onAssign: (t: SalaryTemplate) => void;
}

export default function TemplatesTab({
  templates,
  loading,
  search,
  assignmentCounts,
  onEdit,
  onDelete,
  onAssign,
}: Props) {
  const filtered = search.trim()
    ? templates.filter((t) =>
        [t.name, t.description]
          .some((v) => String(v ?? '').toLowerCase().includes(search.toLowerCase())),
      )
    : templates;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {loading ? (
        <div className="p-8 text-center text-muted-foreground/70">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground/70">
          No templates yet. Create one to get started.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Basic</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Allowances</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deductions</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Assigned</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((t) => {
              const allowances = templateGross(t) - t.basic_salary;
              const deductions = templateDeductions(t);
              const gross = templateGross(t);
              const assignedCount = assignmentCounts[t.id] ?? 0;
              return (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(t.basic_salary)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">+{formatCurrency(allowances)}</td>
                  <td className="px-4 py-3 text-right text-red-500">-{formatCurrency(deductions)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(gross)}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{assignedCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Can module="salary-assignments" action="create">
                        <button
                          onClick={() => onAssign(t)}
                          className="flex items-center gap-1 text-xs text-green-700 hover:underline"
                          title="Assign to employees"
                        >
                          <Users size={14} /> Assign
                        </button>
                      </Can>
                      <Can module="salary-templates" action="edit">
                        <button
                          onClick={() => onEdit(t)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      </Can>
                      <Can module="salary-templates" action="delete">
                        <button
                          onClick={() => onDelete(t)}
                          className="text-xs text-red-500 hover:underline"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
