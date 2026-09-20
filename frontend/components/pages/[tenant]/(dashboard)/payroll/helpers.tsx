export const currentYear = new Date().getFullYear()
export const currentMonth = new Date().getMonth() + 1

export const PAYMENT_MODES = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'NEFT', 'RTGS']

// Minimal employee shape used by the Generate Payroll dropdown.
export interface PayrollEmployeeOption {
  id: string
  employeeId?: string | null
  user?: { name?: string } | null
  department?: { name?: string } | null
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-muted/60 text-foreground/80',
    approved: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[status] || 'bg-muted/60 text-foreground/80'}`}>
      {status}
    </span>
  )
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
