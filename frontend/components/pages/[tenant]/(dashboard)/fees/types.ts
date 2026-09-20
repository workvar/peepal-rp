// Shared GraphQL result shapes for the fees module.

export interface GqlFeeCategory {
  id: string
  name: string
  code: string
  description?: string | null
  isActive: boolean
}

export interface GqlFeeStructureItem {
  id: string
  feeCategoryId: string
  yearNumber: number
  amount: number
  feeCategory?: { id: string; name: string; code: string } | null
}

export interface GqlFeeYearTotal {
  yearNumber: number
  amount: number
}

export interface GqlFeeStructure {
  id: string
  courseId: string
  name: string
  code: string
  batchId?: string | null
  description?: string | null
  isActive: boolean
  totalAmount: number
  allocationCount: number
  yearTotals: GqlFeeYearTotal[]
  items: GqlFeeStructureItem[]
  course?: {
    id: string
    name: string
    code: string
    durationYears?: number | null
    totalSemesters?: number | null
  } | null
  batch?: { id: string; name: string } | null
}

export interface GqlFeeAllocationInstallment {
  id: string
  sequence: number
  label: string
  yearNumber: number
  dueDate?: string | null
  amount: number
}

export interface GqlFeeAllocation {
  id: string
  feeStructureId: string
  name: string
  frequency: string
  targetType: string
  targetId: string
  targetName: string
  totalAmount: number
  isActive: boolean
  studentCount: number
  installments: GqlFeeAllocationInstallment[]
  feeStructure?: { id: string; name: string; code: string; course?: { id: string; name: string } | null } | null
}

export interface GqlFeeAddOn {
  id: string
  name: string
  code: string
  kind: string
  feeCategoryId: string
  amountPerYear: number
  description?: string | null
  isActive: boolean
  studentCount: number
  feeCategory?: { id: string; name: string; code: string } | null
}

export interface GqlStudentFeeAddOn {
  id: string
  feeAddOnId: string
  yearNumber: number
  amount: number
  feeAddOn?: { id: string; name: string; code: string } | null
}

export interface GqlStudentFeeDiscount {
  id: string
  label: string
  discountType: string
  value: number
  amount: number
  remarks?: string | null
}

export interface GqlStudentFeeInstallment {
  id: string
  sequence: number
  label: string
  dueDate?: string | null
  amount: number
  paidAmount: number
  status: string
  isOverdue: boolean
}

export interface GqlStudentFee {
  id: string
  studentId: string
  feeAllocationId: string
  grossAmount: number
  discountAmount: number
  netAmount: number
  paidAmount: number
  status: string
  discounts: GqlStudentFeeDiscount[]
  addOns: GqlStudentFeeAddOn[]
  installments: GqlStudentFeeInstallment[]
  student?: {
    id: string
    rollNumber: string
    user?: { id: string; name: string } | null
    course?: { id: string; name: string } | null
  } | null
  feeAllocation?: {
    id: string
    name: string
    frequency: string
    feeStructure?: {
      id: string
      name: string
      course?: { id: string; name: string; durationYears?: number | null } | null
    } | null
  } | null
}

export interface GqlFeePayment {
  id: string
  studentFeeId?: string
  studentId?: string
  installmentId?: string | null
  amount: number
  paymentDate: string
  paymentMode: string
  transactionRef?: string | null
  status: string
  remarks?: string | null
  receiptNumber: string
  student?: { id: string; rollNumber: string; user?: { id: string; name: string } | null } | null
  studentFee?: { id: string; feeAllocation?: { id: string; name: string } | null } | null
}

export interface GqlFeeSummary {
  totalCollected: number
  paymentCount: number
  pendingDues: number
  totalExpected: number
}

export interface GqlFeeCourseRow {
  courseId: string
  courseName: string
  expected: number
  collected: number
  pending: number
  studentCount: number
}

export interface GqlFeeModeRow {
  mode: string
  amount: number
  count: number
}

export interface GqlFeeMonthRow {
  month: string
  amount: number
  count: number
}

export interface GqlFeeOverview {
  summary: GqlFeeSummary
  byCourse: GqlFeeCourseRow[]
  byMode: GqlFeeModeRow[]
  byMonth: GqlFeeMonthRow[]
  recentPayments: GqlFeePayment[]
}

export interface GqlCourse {
  id: string
  name: string
  code: string
  description?: string | null
  durationYears?: number | null
  totalSemesters?: number | null
  department?: { id: string; name: string } | null
}

export interface GqlCourseBatch {
  id: string
  name: string
  startYear: number
  endYear: number
}
