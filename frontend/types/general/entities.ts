// ── Auth ──────────────────────────────────────────────────────
export type Role = "admin" | "teacher" | "student" | "staff" | "super_admin" | "patient";

/**
 * One switchable role context. A user with several roles can move between
 * workspaces; every permission check resolves against the active one.
 */
export interface Workspace {
  role: Role;
  label: string;
  /** The workspace backed by the user's primary role. Cannot be revoked. */
  isPrimary: boolean;
  customRoleId?: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** The ACTIVE workspace role — may differ from base_role after a switch. */
  role: Role;
  /** The user's primary role. Always present as a workspace. */
  base_role?: Role;
  /** Every workspace this user may switch into. */
  workspaces?: Workspace[];
  tenant_id: string;
  photo_url?: string;
  // Tenant identity policy (from /auth/login and /auth/me). When false, that
  // population signs in by Employee ID / Roll Number and email is optional.
  staff_email_required?: boolean;
  student_email_required?: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  // True when a login happened in this browser. The actual credential is an
  // httpOnly cookie that JavaScript cannot read; this flag only drives UI.
  hasSession: boolean;
  tenantSlug: string | null;
  loading: boolean;
  error: string | null;
}

// ── User ──────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  photo_url?: string;
}

// ── Tenant ────────────────────────────────────────────────────
export type TenantStatus = "active" | "suspended";
// Canonical tenant verticals supported by the platform.
// "college" and "enterprise" are kept as legacy aliases for rows already in
// the database — new tenants should use the canonical names.
export type TenantType =
  | "education"
  | "corporate"
  | "healthcare"
  | "nonprofit"
  | "college" // legacy → education
  | "enterprise"; // legacy → corporate

export interface Tenant {
  id: string;
  name: string;
  type: TenantType;
  status: TenantStatus;
  subdomain: string;
  logo_url: string;
  timezone: string;
  currency: string;
  primary_admin_email: string;
  staff_email_required?: boolean;
  student_email_required?: boolean;
  // Super-admin capability switch: may this tenant send invite/system mail?
  email_sending_allowed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_users: number;
}

// ── Academic Year & Semester ──────────────────────────────────
export interface AcademicYear {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface Semester {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  number: number;
  name: string;
  start_date: string;
  end_date: string;
}

// ── Org Profile ────────────────────────────────────────────────
export interface OrgProfile {
  id: string;
  tenant_id: string;
  name: string;
  logo_url: string;
  tagline: string;
  primary_color: string;
  accent_color: string;
  accreditation: string;
}

// ── Custom Role ────────────────────────────────────────────────
export interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  permissions: string;
  created_at: string;
}

// ── Role Access Matrix ─────────────────────────────────────────
// CRUD flags for one role on one module.
export interface ModuleAccess {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AccessModuleMeta {
  id: string;
  label: string;
  group: string;
}

export interface RoleAccess {
  subjectType: string; // "system" | "custom"
  subjectKey: string;  // role name or CustomRole id
  label: string;
  isCustom: boolean;
  modules: ModuleAccess[];
}

export interface AccessMatrix {
  modules: AccessModuleMeta[];
  roles: RoleAccess[];
}

export type AccessActionKey = "canView" | "canCreate" | "canEdit" | "canDelete";

// ── Setup Status ───────────────────────────────────────────────
export interface SetupStatus {
  org_profile: boolean;
  departments: boolean;
  academic_year: boolean;
  first_user: boolean;
}

// ── Department ────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  code?: string;
  created_at: string;
}

// ── Employee Payment Details ───────────────────────────────────
export interface EmployeePaymentDetails {
  id?: string;
  bank_name?: string;
  account_number?: string;
  account_type?: string;
  ifsc_code?: string;
  branch_name?: string;
  pf_number?: string;
  uan_number?: string;
  pf_employee_percent?: number;
  pf_employer_percent?: number;
  esi_number?: string;
  esi_dispensary?: string;
  pan_number?: string;
  tax_regime?: string;
  form16_ref?: string;
  nps_account_number?: string;
  nps_tier?: string;
  gratuity_eligible?: boolean;
}

// ── Employee ──────────────────────────────────────────────────
export interface Employee {
  id: string;
  user_id: string;
  user: User;
  department_id: string;
  department: Department;
  designation: string;
  phone: string;
  join_date: string;
  employee_id?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  photo_url?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  nationality?: string;
  personal_email?: string;
  emergency_name?: string;
  emergency_phone?: string;
  employment_type?: string;
  probation_end_date?: string;
  grade_level?: string;
  payment_details?: EmployeePaymentDetails;
}

// ── Course ────────────────────────────────────────────────────
export interface Course {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

// ── Student ───────────────────────────────────────────────────
export interface Student {
  id: string;
  user_id: string;
  user: User;
  course_id: string;
  course: Course;
  roll_number: string;
  section: string;
  semester: number;
  phone: string;
  enroll_date: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  photo_url?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  nationality?: string;
  emergency_name?: string;
  emergency_phone?: string;
  father_name?: string;
  father_phone?: string;
  mother_name?: string;
  mother_phone?: string;
  admission_status?: string;
  batch?: string;
}

// ── Attendance ────────────────────────────────────────────────
export type AttendanceStatus = "present" | "absent" | "late";

export interface Attendance {
  id: string;
  entity_id: string;
  entity_type: "student" | "employee";
  date: string;
  status: AttendanceStatus;
  marked_by: string;
  remarks: string;
  subject_id?: string;
  created_at: string;
}

// ── Holiday ────────────────────────────────────────────────────
export type HolidayType =
  | "public"
  | "institutional"
  | "mandatory"
  | "optional"
  | "half_day"
  | "weekend";

export interface Holiday {
  id: string;
  tenant_id: string;
  name: string;
  date: string;
  type: HolidayType;
  auto_gen?: boolean;
  created_at: string;
}

// ── Calendar Settings ──────────────────────────────────────────
export interface CalendarSettings {
  id?: string;
  tenant_id?: string;
  sunday_off: boolean;
  saturday_rule: "none" | "all" | "specific";
  saturday_weeks: string; // e.g. "2,4"
  default_working: number;
}

// ── Calendar Month View ────────────────────────────────────────
export type CalendarDayType = HolidayType | "working";

export interface CalendarDay {
  date: string;        // YYYY-MM-DD
  weekday: number;     // 0=Sun ... 6=Sat
  type: CalendarDayType;
  name: string;
  id?: string;
  auto_gen?: boolean;
  // All holidays on this date (backend sends multiple when >1 exist for the day)
  holidays?: { id: string; name: string; type: string }[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
  working: number;
  half_days: number;
  total_days: number;
}

// ── Attendance Settings ────────────────────────────────────────
export interface AttendanceSettings {
  id?: string;
  tenant_id: string;
  min_attendance_pct: number;
  grace_period_minutes: number;
  lock_after_hours: number;
}

// ── Attendance Summary ─────────────────────────────────────────
export interface AttendanceSummaryRow {
  entity_id: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  attendance_pct: number;
}

// ── Shortage Item ──────────────────────────────────────────────
export interface ShortageItem {
  student: Student;
  total: number;
  present: number;
  attendance_pct: number;
}

// ── Leave Type Config ──────────────────────────────────────────
export interface LeaveTypeConfig {
  id?: string;
  tenant_id?: string;
  name: string;
  code: string;
  days_per_year: number;
  carry_forward: boolean;
  max_carry_forward: number;
  applicable_to: string;
  is_active?: boolean;
  created_at?: string;
}

// ── Leave Balance ──────────────────────────────────────────────
export interface LeaveBalance {
  id: string;
  tenant_id: string;
  user_id: string;
  user?: User;
  leave_type_id: string;
  leave_type?: LeaveTypeConfig;
  year: number;
  total: number;
  used: number;
  pending: number;
}

// ── Mark ──────────────────────────────────────────────────────
export interface Mark {
  id: string;
  student_id: string;
  student: Student;
  subject: string;
  exam_type: string;
  semester: number;
  marks_obtained: number;
  max_marks: number;
  grade: string;
  entered_by: string;
  subject_id?: string;
  assessment_type?: string;
  status?: string;
  academic_year_id?: string;
}

// ── Leave ─────────────────────────────────────────────────────
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface Leave {
  id: string;
  applicant_id: string;
  applicant: User;
  leave_type: string;
  leave_type_id?: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: LeaveStatus;
  reviewed_by: string;
  review_note: string;
  created_at: string;
}

// ── Subject ────────────────────────────────────────────────────
export interface Subject {
  id: string;
  tenant_id: string;
  department_id: string;
  department?: Department;
  name: string;
  code: string;
  credits: number;
  teaching_hours: number;
  lab_hours: number;
  semester_number: number;
  description: string;
  syllabus_url: string;
  created_at: string;
  updated_at: string;
}

// ── Exam Schedule ──────────────────────────────────────────────
export type ExamType = "internal" | "semester" | "assignment";

export interface ExamSchedule {
  id: string;
  tenant_id: string;
  academic_year_id: string;
  name: string;
  exam_type: ExamType;
  semester_number: number;
  start_date: string;
  end_date: string;
  published: boolean;
  instructions: string;
  created_at: string;
  updated_at: string;
}

// ── Student Portal ─────────────────────────────────────────────
export interface StudentPortalData {
  student: Student;
  attendance_total: number;
  attendance_present: number;
  attendance_pct: number;
  recent_marks: Mark[];
}

// ── API Response ──────────────────────────────────────────────
export interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// ── Salary Structure ───────────────────────────────────────────
export interface SalaryStructure {
  id: string
  tenant_id: string
  employee_id: string
  employee?: Employee
  basic_salary: number
  hra: number
  da: number
  ta: number
  medical_allowance: number
  other_allowances: number
  pf: number
  esi: number
  tds: number
  other_deductions: number
  effective_from: string
  is_active: boolean
  notes: string
  created_at: string
}

// ── Payroll ────────────────────────────────────────────────────
export interface Payroll {
  id: string
  tenant_id: string
  employee_id: string
  employee?: Employee
  month: number
  year: number
  basic_salary: number
  hra: number
  da: number
  ta: number
  medical_allowance: number
  other_allowances: number
  gross_salary: number
  pf: number
  esi: number
  tds: number
  other_deductions: number
  total_deductions: number
  net_salary: number
  working_days: number
  present_days: number
  leave_days: number
  status: 'draft' | 'approved' | 'paid'
  payment_date?: string
  payment_mode?: string
  notes: string
  processed_by: string
  created_at: string
}

// ── Payroll Summary ────────────────────────────────────────────
export interface PayrollSummary {
  total_employees: number
  total_gross: number
  total_deductions: number
  total_net: number
  draft_count: number
  approved_count: number
  paid_count: number
}

// ── Fee Category ────────────────────────────────────────────────
export interface FeeCategory {
  id: string
  tenant_id: string
  name: string
  code: string
  description: string
  is_active: boolean
  created_at: string
}

// ── Fee Structure ───────────────────────────────────────────────
export interface FeeStructure {
  id: string
  tenant_id: string
  academic_year_id: string
  academic_year?: { id: string; name: string }
  course_id: string
  course?: { id: string; name: string; code: string }
  fee_category_id: string
  fee_category?: FeeCategory
  semester_number: number
  amount: number
  due_date: string
  late_fee_per_day: number
  max_late_fee: number
  is_active: boolean
  created_at: string
}

// ── Fee Payment ─────────────────────────────────────────────────
export interface FeePayment {
  id: string
  tenant_id: string
  student_id: string
  student?: Student
  fee_structure_id: string
  fee_structure?: FeeStructure
  academic_year_id: string
  amount: number
  late_fee: number
  total_amount: number
  payment_date: string
  payment_mode: string
  transaction_ref: string
  status: 'pending' | 'paid' | 'cancelled'
  remarks: string
  received_by: string
  receipt_number: string
  created_at: string
}

// ── Fee Due ─────────────────────────────────────────────────────
export interface FeeDue {
  student_id: string
  student_name: string
  roll_number: string
  course_name: string
  category_name: string
  fee_structure_id: string
  total_due: number
  total_paid: number
  outstanding: number
  due_date: string
  is_overdue: boolean
}

// ── Fee Collection Summary ──────────────────────────────────────
export interface FeeCollectionSummary {
  total_collected: number
  payment_count: number
  pending_dues: number
  total_expected: number
}

// ── Announcement ────────────────────────────────────────────────
export interface Announcement {
  id: string
  tenant_id: string
  title: string
  body: string
  author_id: string
  author?: { id: string; name: string; email: string }
  target_roles: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_published: boolean
  expires_at?: string
  created_at: string
  updated_at: string
}

// ── Notification ───────────────────────────────────────────────
export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  title: string
  body: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: string
  ref_id: string
  ref_type: string
  is_read: boolean
  created_at: string
}

// ── Dashboard Stats ─────────────────────────────────────────────
export interface DashboardStats {
  students: number
  employees: number
  teachers: number
  users: number
  pending_leaves: number
  pending_payrolls: number
  today_present: number
  today_absent: number
}

// ── Attendance Report ───────────────────────────────────────────
export interface AttendanceReportRow {
  date: string
  present: number
  absent: number
  late: number
  total: number
}

export interface AttendanceReport {
  from_date: string
  to_date: string
  entity_type: string
  daily: AttendanceReportRow[]
}

// ── Marks Report ────────────────────────────────────────────────
export interface GradeDistributionRow {
  grade: string
  count: number
}

export interface SubjectAvgRow {
  subject_id: string
  subject_name: string
  avg_marks: number
  max_marks: number
  pass_count: number
  fail_count: number
  total_count: number
}

export interface MarksReport {
  grade_distribution: GradeDistributionRow[]
  subject_averages: SubjectAvgRow[]
}

// ── Leave Report ────────────────────────────────────────────────
export interface LeaveReportMonthRow {
  month: string
  count: number
}

export interface LeaveReport {
  year: string
  total: number
  approved: number
  status_breakdown: { status: string; count: number }[]
  monthly_trend: LeaveReportMonthRow[]
  by_department: { department: string; count: number }[]
}

// ── Fee Report ──────────────────────────────────────────────────
export interface FeeReportMonthRow {
  month: string
  amount: number
  count: number
}

export interface FeeReport {
  total_collected: number
  payment_count: number
  monthly_trend: FeeReportMonthRow[]
  by_payment_mode: { mode: string; amount: number; count: number }[]
  by_category: { category: string; amount: number; count: number }[]
}

// ── Payroll Report ──────────────────────────────────────────────
export interface PayrollReportMonthRow {
  month: string
  gross_salary: number
  net_salary: number
  total_deductions: number
  employee_count: number
}

export interface PayrollReport {
  year: string
  total_gross: number
  total_net: number
  total_employees: number
  monthly_trend: PayrollReportMonthRow[]
}

// ── Subscription & Billing ─────────────────────────────
export const ALL_MODULES = [
  'attendance', 'marks', 'leaves', 'employees', 'students',
  'payroll', 'fees', 'announcements', 'reports', 'academic',
  'learning', 'hostel', 'transport', 'library', 'events',
  'timetable', 'notifications',
] as const

export type ModuleName = typeof ALL_MODULES[number]

// ── Module configurator (super-admin) ──────────────────
// A coarse subscription module (the toggles on the subscription screen).
export interface ModuleCatalogItem {
  key: string
  label: string
  sort: number
}

// A fine-grained page (access module) and the coarse module it maps to
// (module_key === '' means the page is core / never gated).
export interface ModulePageItem {
  id: string
  label: string
  group: string
  module_key: string
}

// A vertical quick-fill preset (e.g. "Education", "Hospital") offered in the
// plan creator — a named group of module keys, server-defined so the
// frontend never hardcodes its own copy.
export interface ModulePreset {
  key: string
  label: string
  modules: string[]
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_annually: number
  max_students: number
  max_employees: number
  modules: string  // comma-separated
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenantSubscription {
  id: string
  tenant_id: string
  tenant?: Tenant
  plan_id: string
  plan?: SubscriptionPlan
  max_students_override: number
  max_employees_override: number
  modules_override: string
  status: 'active' | 'suspended' | 'expired' | 'trial'
  billing_period: 'monthly' | 'annual'
  start_date: string
  end_date: string
  trial_end_date: string
  notes: string
  created_at: string
  updated_at: string
}

export interface SubscriptionUsage {
  subscription: TenantSubscription | null
  usage: {
    students: number
    employees: number
    max_students: number
    max_employees: number
    modules: string
  }
}

// ── Quota status (banner) ──────────────────────────────────────
// Lightweight usage-vs-limits payload from GET /api/v1/quota, readable by
// every authenticated tenant user (no billing details).
export interface QuotaBreach {
  resource: string // 'students' | 'employees'
  limit: number
  current: number
  over_by: number
}

export interface QuotaStatus {
  has_subscription: boolean
  status: string // 'active' | 'trial' | 'suspended' | 'expired' | ''
  students: number
  employees: number
  max_students: number
  max_employees: number
  breaches: QuotaBreach[]
}

// ── Events / Calendar ──────────────────────────────────────────
export interface CalendarEvent {
  id: string
  title: string
  description: string
  event_date: string
  end_date: string
  location: string
  category: string
  color: string
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// ── Hostel Management ──────────────────────────────────────────
export interface HostelBlock {
  id: string
  name: string
  type: string
  floors: number
  created_at: string
}

export interface RoomClass {
  id: string
  name: string
  description: string
  rateType: string // monthly | semester | annual
  rateAmount: number
  semesterRate: number
  annualRate: number
  monthlyRate: number
}

export interface HostelRoom {
  id: string
  blockId: string
  block: HostelBlock
  roomNumber: string
  floor: number
  capacity: number
  occupied: number
  roomType: string
  status: string
  monthlyFee: number
  roomClassId?: string | null
  roomClass?: RoomClass | null
  rateType?: string | null // per-room override
  rateAmount?: number | null
  effectiveRateType: string
  semesterRate: number
  annualRate: number
  monthlyRate: number
}

// Slim person record returned by allocation joins. GraphQL returns
// { id name email } directly; older payloads nested it as { user: { name } },
// so both shapes stay optional for readers.
export interface AllocatedPerson {
  id: string
  name?: string
  email?: string
  rollNumber?: string
  gender?: string
  user?: { id: string; name: string } | null
}

export interface HostelAllocation {
  id: string
  studentId: string
  student?: AllocatedPerson | null
  roomId: string
  room: HostelRoom
  bedNumber?: number
  allocDate: string
  vacateDate?: string
  status: string
}

// ── Transport Management ───────────────────────────────────────
export interface TransportRoute {
  id: string
  route_name: string
  start_point: string
  end_point: string
  stops: string
  distance: number
}

export interface TransportVehicle {
  id: string
  vehicle_number: string
  vehicle_type: string
  capacity: number
  driver_name: string
  driver_phone: string
  route_id: string
  route: TransportRoute
  status: string
}

export interface TransportAllocation {
  id: string
  alloc_type?: string
  student_id: string
  student?: AllocatedPerson | null
  employee_id?: string
  employee?: AllocatedPerson | null
  vehicle_id: string
  vehicle: TransportVehicle
  pickup_stop: string
  status: string
  start_date: string
}

// ── Library Management ─────────────────────────────────────────
export interface LibraryBook {
  id: string
  title: string
  author: string
  isbn: string
  publisher: string
  publish_year: number
  category: string
  total_copies: number
  available_copies: number
  rack: string
  shelf: string
}

export interface LibraryIssue {
  id: string
  book_id: string
  book: LibraryBook
  user_id: string
  user?: { id: string; name?: string; email?: string } | null
  issue_date: string
  due_date: string
  return_date?: string
  status: string
  fine_amount: number
}

// ── Result Publishing ──────────────────────────────────────────
export interface PublishedResult {
  id: string
  student_id: string
  subject_id: string
  score: number
  max_score: number
  grade: string
  remarks: string
  is_published: boolean
  published_at?: string
}

// ── Dashboard Charts ───────────────────────────────────────────
export interface DashboardCharts {
  attendance_trend: Array<{
    date: string
    present_count: number
    absent_count: number
    percentage: number
  }>
  enrollment_by_course: Array<{
    course_name: string
    count: number
  }>
  leave_status_breakdown: Array<{
    status: string
    count: number
  }>
  marks_distribution: Array<{
    grade: string
    count: number
  }>
  monthly_fee_collection: Array<{
    month: string
    amount: number
  }>
}
