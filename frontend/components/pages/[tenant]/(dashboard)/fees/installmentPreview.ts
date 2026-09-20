// Client-side mirror of the backend's installment auto-generation, used to
// preview an allocation's schedule before it is created. The backend remains
// the source of truth; this only exists so the admin sees (and may tweak)
// the schedule instantly.

import type { GqlFeeStructure } from './types'

export interface PreviewRow {
  label: string
  yearNumber: number
  dueDate: string // YYYY-MM-DD or ''
  amount: number
}

const round2 = (v: number) => Math.round(v * 100) / 100

function addMonths(iso: string, months: number): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

// buildInstallmentPreview mirrors backend buildAllocationInstallments:
// one_time = single slot; yearly = one slot per course year; semester = each
// year's total split evenly across that year's semesters.
export function buildInstallmentPreview(
  fs: GqlFeeStructure,
  frequency: string,
  firstDue: string,
): PreviewRow[] {
  const years = fs.yearTotals.map(yt => yt.yearNumber).sort((a, b) => a - b)
  const totals = new Map(fs.yearTotals.map(yt => [yt.yearNumber, yt.amount]))
  const grand = round2(fs.yearTotals.reduce((sum, yt) => sum + yt.amount, 0))
  if (grand <= 0) return []

  if (frequency === 'one_time') {
    return [{ label: 'Full Payment', yearNumber: 0, dueDate: firstDue, amount: grand }]
  }

  if (frequency === 'yearly') {
    return years
      .filter(y => (totals.get(y) ?? 0) > 0)
      .map((y, i) => ({
        label: `Year ${y}`,
        yearNumber: y,
        dueDate: addMonths(firstDue, 12 * i),
        amount: totals.get(y) ?? 0,
      }))
  }

  // semester
  let semPerYear = 2
  const totalSem = fs.course?.totalSemesters ?? 0
  if (totalSem > 0 && years.length > 0) {
    const s = Math.floor(totalSem / years.length)
    if (s > 0) semPerYear = s
  }
  const monthsPerSem = Math.floor(12 / semPerYear)
  const rows: PreviewRow[] = []
  let semester = 0
  years.forEach((y, i) => {
    const yt = totals.get(y) ?? 0
    if (yt <= 0) { semester += semPerYear; return }
    let assigned = 0
    for (let s = 0; s < semPerYear; s++) {
      semester++
      let amount = round2(yt / semPerYear)
      if (s === semPerYear - 1) amount = round2(yt - assigned)
      assigned = round2(assigned + amount)
      rows.push({
        label: `Semester ${semester}`,
        yearNumber: y,
        dueDate: addMonths(firstDue, 12 * i + monthsPerSem * s),
        amount,
      })
    }
  })
  return rows
}
