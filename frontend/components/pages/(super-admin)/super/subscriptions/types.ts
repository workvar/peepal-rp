export const MODULE_LABELS: Record<string, string> = {
  attendance: 'Attendance',
  marks: 'Marks',
  leaves: 'Leaves',
  employees: 'Employees',
  students: 'Students',
  payroll: 'Payroll',
  fees: 'Fees',
  announcements: 'Announcements',
  reports: 'Reports',
  academic: 'Academic',
  learning: 'Learning Matrix',
  hostel: 'Hostel',
  transport: 'Transport',
  library: 'Library',
  events: 'Events',
  timetable: 'Timetable',
  notifications: 'Notifications',
}

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  suspended: 'bg-orange-100 text-orange-700',
  expired: 'bg-red-100 text-red-700',
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export const emptyAssignForm = {
  tenant_id: '',
  plan_id: '',
  billing_period: 'monthly',
  status: 'active',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  max_students_override: 0,
  max_employees_override: 0,
  modules_override: '',
  notes: '',
}

export type AssignForm = typeof emptyAssignForm
