'use client';

// AssignmentsTab — flat list of every (employee, template) assignment.
// Lets admins see who has what template at a glance and remove assignments.

import { formatCurrency, templateGross, type AssignmentEmployee, type SalaryAssignment } from './types';

interface Props {
  assignments: SalaryAssignment[];
  loading: boolean;
  search: string;
  showActiveOnly: boolean;
  onToggleActiveOnly: (v: boolean) => void;
  onRemove: (a: SalaryAssignment) => void;
  /** Fallback lookup: employee UUID → employee, used when the assignment's
   *  embedded employee field is not preloaded by the backend. */
  employeesById?: Record<string, AssignmentEmployee>;
}

export default function AssignmentsTab({
  assignments,
  loading,
  search,
  showActiveOnly,
  onToggleActiveOnly,
  onRemove,
  employeesById = {},
}: Props) {
  // Resolve the employee for a given assignment: prefer the embedded record
  // (populated by the backend preload) and fall back to the separately loaded
  // employees list so names always appear even when preloading fails.
  function resolveEmployee(a: SalaryAssignment): AssignmentEmployee | null {
    if (a.employee?.user?.name) return a.employee;
    return employeesById[a.employee_id] ?? a.employee ?? null;
  }
  const filtered = assignments.filter((a) => {
    if (showActiveOnly && !a.is_active) return false;
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    const emp = resolveEmployee(a);
    return (
      emp?.user?.name?.toLowerCase().includes(needle) ||
      emp?.user?.email?.toLowerCase().includes(needle) ||
      emp?.employee_id?.toLowerCase().includes(needle) ||
      a.template?.name?.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={showActiveOnly}
          onChange={(e) => onToggleActiveOnly(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Show only currently active assignments
      </label>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground/70">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground/70">No assignments found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Template</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Template Gross</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">+Extra</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">-Extra</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Effective</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((a) => {
                const gross = a.template ? templateGross(a.template) : 0;
                const emp = resolveEmployee(a);
                return (
                  <tr key={a.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {emp?.user?.name ?? emp?.employee_id ?? a.employee_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {emp?.department?.name ?? ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{a.template?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(gross)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">
                      {a.extra_allowance ? `+${formatCurrency(a.extra_allowance)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500">
                      {a.extra_deduction ? `-${formatCurrency(a.extra_deduction)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(a.effective_from).toLocaleDateString()}
                      {a.effective_to && (
                        <span className="text-xs"> → {new Date(a.effective_to).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        {a.is_active ? 'Active' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onRemove(a)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
