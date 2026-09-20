'use client'

import { PAYROLL_MONTHS } from '@/constants/payroll/months'
import type { GqlPayroll } from '@/types/pages/payroll/page'
import { PAYMENT_MODES } from './helpers'
import type { PayrollPageState } from './usePayrollPage'

// Modal to capture payment mode and date when marking a payroll as paid.
export default function MarkPaidModal({ s, payroll }: { s: PayrollPageState; payroll: GqlPayroll }) {
  const { markPaidForm, setMarkPaidForm, statusUpdatingId } = s
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-1">Mark as Paid</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {payroll.employee?.user?.name
            ? `${payroll.employee.user.name} · `
            : ''}{PAYROLL_MONTHS[payroll.month - 1]} {payroll.year}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Payment Mode *</label>
            <select
              required
              value={markPaidForm.paymentMode}
              onChange={e => setMarkPaidForm(f => ({ ...f, paymentMode: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select payment mode</option>
              {PAYMENT_MODES.map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Payment Date</label>
            <input
              type="date"
              value={markPaidForm.paymentDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setMarkPaidForm(f => ({ ...f, paymentDate: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => s.setMarkPaidPayroll(null)}
              className="flex-1 border border-border rounded-lg py-2 text-sm font-medium text-foreground/80 hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={s.handleMarkPaidConfirm}
              disabled={!markPaidForm.paymentMode || statusUpdatingId === payroll.id}
              className="flex-1 btn-primary text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
            >
              {statusUpdatingId === payroll.id ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
