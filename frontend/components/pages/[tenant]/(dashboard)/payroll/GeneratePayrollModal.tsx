'use client'

import { PAYROLL_MONTHS } from '@/constants/payroll/months'
import { currentYear } from './helpers'
import type { PayrollPageState } from './usePayrollPage'
import SearchableSelect from "@/components/ui/SearchableSelect"

// Modal form to generate a payroll record for one employee/month/year.
export default function GeneratePayrollModal({ s }: { s: PayrollPageState }) {
  const { genForm, setGenForm, submitting, payrollEligibleEmployees } = s
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Generate Payroll</h2>
        <form onSubmit={s.handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Employee *</label>
            <SearchableSelect
              required
              value={genForm.employee_id}
              onChange={v => setGenForm(f => ({ ...f, employee_id: v }))}
              options={payrollEligibleEmployees.map((emp) => ({
                value: emp.id,
                label: `${emp.user?.name} — ${emp.department?.name}`,
              }))}
              placeholder={payrollEligibleEmployees.length > 0 ? 'Select employee' : 'No employees with an assigned salary template'}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Only employees with an assigned salary template can be selected here.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Month *</label>
              <select
                value={genForm.month}
                onChange={e => setGenForm(f => ({ ...f, month: Number(e.target.value) }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYROLL_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Year *</label>
              <select
                value={genForm.year}
                onChange={e => setGenForm(f => ({ ...f, year: Number(e.target.value) }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Working Days</label>
              <input
                type="number" min={1} max={31}
                value={genForm.working_days}
                onChange={e => setGenForm(f => ({ ...f, working_days: Number(e.target.value) }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Present Days</label>
              <input
                type="number" min={0} max={31}
                value={genForm.present_days}
                onChange={e => setGenForm(f => ({ ...f, present_days: Number(e.target.value) }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Leave Days</label>
              <input
                type="number" min={0} max={31}
                value={genForm.leave_days}
                onChange={e => setGenForm(f => ({ ...f, leave_days: Number(e.target.value) }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Notes</label>
            <textarea
              value={genForm.notes}
              onChange={e => setGenForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => s.setShowGenModal(false)}
              className="flex-1 border border-border rounded-lg py-2 text-sm font-medium text-foreground/80 hover:bg-muted/40">
              Cancel
            </button>
            <button type="submit" disabled={submitting || payrollEligibleEmployees.length === 0}
              className="flex-1 btn-primary text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
              {submitting ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
