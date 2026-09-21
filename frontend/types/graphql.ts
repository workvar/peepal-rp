export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

/** A student's full academic result: every semester plus the cumulative roll-up. */
export type AcademicResult = {
  __typename?: 'AcademicResult';
  cgpa: Scalars['Float']['output'];
  courseName: Scalars['String']['output'];
  /** RFC3339 timestamp the result was computed. */
  generatedAt: Scalars['String']['output'];
  gpaMax: Scalars['Float']['output'];
  isPass: Scalars['Boolean']['output'];
  letter: Scalars['String']['output'];
  marksObtained: Scalars['Float']['output'];
  maxMarks: Scalars['Float']['output'];
  /** Scheme mode in effect (drives client display). */
  mode: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
  rollNumber: Scalars['String']['output'];
  semesters: Array<SemesterResult>;
  studentId: Scalars['String']['output'];
  studentName: Scalars['String']['output'];
  totalCredits: Scalars['Int']['output'];
};

/** An academic year (e.g. 2024–2025). */
export type AcademicYear = {
  __typename?: 'AcademicYear';
  /** End date (YYYY-MM-DD). */
  endDate: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether this is the currently active academic year. */
  isCurrent: Scalars['Boolean']['output'];
  /** Display name (e.g. 2024-25). */
  name: Scalars['String']['output'];
  /** Start date (YYYY-MM-DD). */
  startDate: Scalars['String']['output'];
};

/** The full role access matrix for the tenant. */
export type AccessMatrix = {
  __typename?: 'AccessMatrix';
  modules: Array<AccessModuleMeta>;
  roles: Array<RoleAccess>;
};

/** Display metadata for a module row in the matrix. */
export type AccessModuleMeta = {
  __typename?: 'AccessModuleMeta';
  group: Scalars['String']['output'];
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
};

/** One node of the chart of accounts (a tree). System accounts are seeded and immutable. */
export type Account = {
  __typename?: 'Account';
  active: Scalars['Boolean']['output'];
  code: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isSystem: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  parentId: Maybe<Scalars['String']['output']>;
  systemKey: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

/** Running-balance view of a single account over a date range. */
export type AccountLedger = {
  __typename?: 'AccountLedger';
  account: Account;
  closingBalance: Scalars['Float']['output'];
  openingBalance: Scalars['Float']['output'];
  rows: Array<AccountLedgerRow>;
};

export type AccountLedgerRow = {
  __typename?: 'AccountLedgerRow';
  balance: Scalars['Float']['output'];
  batchId: Scalars['String']['output'];
  credit: Scalars['Float']['output'];
  date: Scalars['String']['output'];
  debit: Scalars['Float']['output'];
  memo: Maybe<Scalars['String']['output']>;
};

/** Input for attaching an add-on to a student fee. */
export type AddStudentFeeAddOnInput = {
  /** Fee add-on UUID. */
  feeAddOnId: Scalars['String']['input'];
  /** Student fee UUID. */
  studentFeeId: Scalars['String']['input'];
  /** Course years to charge it in (e.g. [1, 2, 3, 4]). */
  yearNumbers: Array<Scalars['Int']['input']>;
};

/** Input for adding a discount to a student fee. */
export type AddStudentFeeDiscountInput = {
  /** fixed | percent. */
  discountType: Scalars['String']['input'];
  /** Label (e.g. Merit Scholarship). */
  label: Scalars['String']['input'];
  /** Optional remarks. */
  remarks?: InputMaybe<Scalars['String']['input']>;
  /** Student fee UUID. */
  studentFeeId: Scalars['String']['input'];
  /** Amount (for fixed) or percentage 0-100 (for percent). */
  value: Scalars['Float']['input'];
};

/** An inpatient admission: patient on a bed, with the discharge summary. */
export type Admission = {
  __typename?: 'Admission';
  admissionDate: Scalars['String']['output'];
  bedId: Maybe<Scalars['String']['output']>;
  bedNumber: Maybe<Scalars['String']['output']>;
  clinicianId: Maybe<Scalars['String']['output']>;
  clinicianName: Maybe<Scalars['String']['output']>;
  conditionOnDischarge: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  dischargeDate: Maybe<Scalars['String']['output']>;
  dischargeDiagnosis: Maybe<Scalars['String']['output']>;
  encounterId: Maybe<Scalars['String']['output']>;
  followUpInstructions: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  patientId: Scalars['String']['output'];
  patientMrn: Scalars['String']['output'];
  patientName: Scalars['String']['output'];
  reason: Maybe<Scalars['String']['output']>;
  /** Status: admitted | discharged. */
  status: Scalars['String']['output'];
  transfers: Array<BedTransfer>;
  treatmentGiven: Maybe<Scalars['String']['output']>;
  wardId: Maybe<Scalars['String']['output']>;
  wardName: Maybe<Scalars['String']['output']>;
};

/** One open receivable/payable row for the aging report, pulled from source docs. */
export type AgingRow = {
  __typename?: 'AgingRow';
  amount: Scalars['Float']['output'];
  bucket: Scalars['String']['output'];
  date: Maybe<Scalars['String']['output']>;
  daysOverdue: Scalars['Int']['output'];
  dueDate: Maybe<Scalars['String']['output']>;
  partyId: Scalars['String']['output'];
  partyName: Scalars['String']['output'];
  reference: Scalars['String']['output'];
};

export type AllocateHostelRoomInput = {
  allocDate: Scalars['String']['input'];
  bedNumber?: InputMaybe<Scalars['Int']['input']>;
  roomId: Scalars['String']['input'];
  studentId: Scalars['String']['input'];
};

export type AllocateTransportInput = {
  /** Provide exactly one of studentId or employeeId (staff member). */
  employeeId?: InputMaybe<Scalars['String']['input']>;
  pickupStop?: InputMaybe<Scalars['String']['input']>;
  startDate: Scalars['String']['input'];
  /** Provide exactly one of studentId or employeeId. */
  studentId?: InputMaybe<Scalars['String']['input']>;
  vehicleId: Scalars['String']['input'];
};

export type Ambulance = {
  __typename?: 'Ambulance';
  active: Scalars['Boolean']['output'];
  code: Scalars['String']['output'];
  driverName: Maybe<Scalars['String']['output']>;
  driverPhone: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  registration: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  vehicleType: Scalars['String']['output'];
};

export type AmbulanceTrip = {
  __typename?: 'AmbulanceTrip';
  ambulanceCode: Scalars['String']['output'];
  ambulanceId: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  destination: Maybe<Scalars['String']['output']>;
  dispatchTime: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  origin: Maybe<Scalars['String']['output']>;
  patientId: Maybe<Scalars['String']['output']>;
  patientName: Maybe<Scalars['String']['output']>;
  returnTime: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  tripType: Scalars['String']['output'];
};

/** An announcement broadcast to selected roles. */
export type AnnouncementItem = {
  __typename?: 'AnnouncementItem';
  /** Author user object. */
  author: Maybe<User>;
  /** UUID of the author. */
  authorId: Scalars['String']['output'];
  /** Full announcement body (supports markdown). */
  body: Scalars['String']['output'];
  /** Expiry datetime after which the announcement is hidden. */
  expiresAt: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether the announcement is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** Priority: low | normal | high | urgent. */
  priority: Scalars['String']['output'];
  /** Comma-separated list of target roles (e.g. student,teacher). */
  targetRoles: Scalars['String']['output'];
  /** Announcement title. */
  title: Scalars['String']['output'];
};

/** Input for submitting a leave application. */
export type ApplyLeaveInput = {
  /** Start date (YYYY-MM-DD). */
  fromDate: Scalars['String']['input'];
  /** Leave type name. */
  leaveType: Scalars['String']['input'];
  /** Leave type UUID (preferred over name when available). */
  leaveTypeId?: InputMaybe<Scalars['String']['input']>;
  /** Reason for the leave. */
  reason: Scalars['String']['input'];
  /** End date (YYYY-MM-DD). */
  toDate: Scalars['String']['input'];
};

/** A booked consultation slot between a patient and a clinician (an Employee). */
export type Appointment = {
  __typename?: 'Appointment';
  /** Clinician (Employee) UUID. Blank when the clinician left the organisation. */
  clinicianId: Scalars['String']['output'];
  /** Clinician display name. */
  clinicianName: Scalars['String']['output'];
  /** Creation timestamp (RFC3339). */
  createdAt: Maybe<Scalars['String']['output']>;
  /** Appointment date (YYYY-MM-DD). */
  date: Scalars['String']['output'];
  /** Department UUID, when scoped to one. */
  departmentId: Maybe<Scalars['String']['output']>;
  /** Department name. */
  departmentName: Maybe<Scalars['String']['output']>;
  /** End time (HH:MM, 24h). */
  endTime: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Internal notes. */
  notes: Maybe<Scalars['String']['output']>;
  /** Patient UUID. */
  patientId: Scalars['String']['output'];
  /** Patient MRN. */
  patientMrn: Scalars['String']['output'];
  /** Patient display name. */
  patientName: Scalars['String']['output'];
  /** Reason for visit. */
  reason: Maybe<Scalars['String']['output']>;
  /** Who referred the patient (doctor, camp, or SELF). Printed on the OPD slip. */
  referredBy: Maybe<Scalars['String']['output']>;
  /** Start time (HH:MM, 24h). */
  startTime: Scalars['String']['output'];
  /** Status: scheduled | completed | cancelled | no_show. */
  status: Scalars['String']['output'];
};

/** An approval request raised by a user. */
export type ApprovalRequest = {
  __typename?: 'ApprovalRequest';
  createdAt: Scalars['String']['output'];
  currentStep: Scalars['Int']['output'];
  flowId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  process: Scalars['String']['output'];
  referenceId: Scalars['String']['output'];
  requesterId: Scalars['String']['output'];
  status: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type AssignSalaryTemplateInput = {
  effectiveFrom?: InputMaybe<Scalars['String']['input']>;
  employeeId: Scalars['String']['input'];
  extraAllowance?: InputMaybe<Scalars['Float']['input']>;
  extraDeduction?: InputMaybe<Scalars['Float']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  templateId: Scalars['String']['input'];
};

/**
 * One student's answer to one assignment. At most one row per
 * (student, assignment) — resubmitting updates the same row.
 */
export type AssignmentSubmission = {
  __typename?: 'AssignmentSubmission';
  assignmentId: Scalars['String']['output'];
  assignmentTitle: Maybe<Scalars['String']['output']>;
  /** Uploaded file URL. */
  attachmentUrl: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  feedback: Maybe<Scalars['String']['output']>;
  gradedByName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  marksAwarded: Maybe<Scalars['Float']['output']>;
  /** Marks the parent assignment is out of, so a grading form needs one fetch. */
  maxMarks: Scalars['Float']['output'];
  rollNumber: Maybe<Scalars['String']['output']>;
  /** submitted | graded | returned. */
  status: Scalars['String']['output'];
  studentId: Scalars['String']['output'];
  studentName: Scalars['String']['output'];
  /** Date submitted (YYYY-MM-DD). */
  submittedAt: Maybe<Scalars['String']['output']>;
  /** Typed answer. */
  text: Maybe<Scalars['String']['output']>;
};

/** A single attendance record for a student or employee on a specific date. */
export type AttendanceRecord = {
  __typename?: 'AttendanceRecord';
  /** Date of attendance (YYYY-MM-DD). */
  date: Scalars['String']['output'];
  /** UUID of the student or employee. */
  entityId: Scalars['String']['output'];
  /** Entity type: student | employee. */
  entityType: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** UUID of the staff who marked attendance. */
  markedBy: Maybe<Scalars['String']['output']>;
  /** Optional remarks. */
  remarks: Maybe<Scalars['String']['output']>;
  /** Attendance status: present | absent | late. */
  status: Scalars['String']['output'];
  /** Subject UUID (applicable for student subject-level attendance). */
  subjectId: Maybe<Scalars['String']['output']>;
};

/** Attendance report for a date range. */
export type AttendanceReportResult = {
  __typename?: 'AttendanceReportResult';
  /** Daily breakdown rows. */
  daily: Array<DailyAttendanceRow>;
  /** Entity type covered: student | employee. */
  entityType: Scalars['String']['output'];
  /** Report start date. */
  fromDate: Scalars['String']['output'];
  /** Report end date. */
  toDate: Scalars['String']['output'];
};

/** Per-tenant attendance configuration. */
export type AttendanceSettings = {
  __typename?: 'AttendanceSettings';
  gracePeriodMinutes: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  lockAfterHours: Scalars['Int']['output'];
  minAttendancePct: Scalars['Float']['output'];
};

/** Aggregated attendance statistics for a single student or employee. */
export type AttendanceSummaryRow = {
  __typename?: 'AttendanceSummaryRow';
  /** Days absent. */
  absent: Scalars['Int']['output'];
  /** Attendance percentage (present / total × 100). */
  attendancePct: Scalars['Float']['output'];
  /** UUID of the student or employee. */
  entityId: Scalars['String']['output'];
  /** Days late. */
  late: Scalars['Int']['output'];
  /** Days present. */
  present: Scalars['Int']['output'];
  /** Total days recorded. */
  total: Scalars['Int']['output'];
};

export type AuditLog = {
  __typename?: 'AuditLog';
  action: Scalars['String']['output'];
  actorId: Maybe<Scalars['String']['output']>;
  actorName: Maybe<Scalars['String']['output']>;
  actorRole: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  detail: Maybe<Scalars['String']['output']>;
  entityId: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  ip: Maybe<Scalars['String']['output']>;
  module: Maybe<Scalars['String']['output']>;
  operation: Maybe<Scalars['String']['output']>;
};

/** A bed within a ward. */
export type Bed = {
  __typename?: 'Bed';
  admissionId: Maybe<Scalars['String']['output']>;
  bay: Maybe<Scalars['String']['output']>;
  bedNumber: Scalars['String']['output'];
  dailyCharge: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  /** Current occupant (when occupied). */
  patientId: Maybe<Scalars['String']['output']>;
  patientName: Maybe<Scalars['String']['output']>;
  /** Status: available | occupied | maintenance. */
  status: Scalars['String']['output'];
  wardId: Scalars['String']['output'];
};

/** One ward/bed move within an admission (the T in ADT). */
export type BedTransfer = {
  __typename?: 'BedTransfer';
  fromBedId: Maybe<Scalars['String']['output']>;
  fromBedNumber: Maybe<Scalars['String']['output']>;
  fromWardName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  reason: Maybe<Scalars['String']['output']>;
  toBedId: Maybe<Scalars['String']['output']>;
  toBedNumber: Maybe<Scalars['String']['output']>;
  toWardName: Maybe<Scalars['String']['output']>;
  transferDate: Maybe<Scalars['String']['output']>;
};

/** A priced catalog entry used to bill clinical services (consultation, procedure, X-ray, …). */
export type BillableService = {
  __typename?: 'BillableService';
  /** Whether the service is offered (shown when billing). */
  active: Scalars['Boolean']['output'];
  /** Category: consultation | procedure | lab | radiology | other. */
  category: Scalars['String']['output'];
  /** Short code, unique within the tenant. */
  code: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** Price per unit. */
  unitPrice: Scalars['Float']['output'];
};

export type BloodRequest = {
  __typename?: 'BloodRequest';
  bloodGroup: Scalars['String']['output'];
  component: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  patientMrn: Scalars['String']['output'];
  patientName: Scalars['String']['output'];
  requestDate: Maybe<Scalars['String']['output']>;
  requestedByName: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  unitsRequired: Scalars['Int']['output'];
};

export type BloodUnit = {
  __typename?: 'BloodUnit';
  bagNumber: Scalars['String']['output'];
  bloodGroup: Scalars['String']['output'];
  collectedDate: Maybe<Scalars['String']['output']>;
  component: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  donorName: Maybe<Scalars['String']['output']>;
  expiryDate: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  issuedDate: Maybe<Scalars['String']['output']>;
  issuedToId: Maybe<Scalars['String']['output']>;
  issuedToName: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  volumeMl: Scalars['Int']['output'];
};

/** Result of a bulk salary assignment. */
export type BulkAssignResult = {
  __typename?: 'BulkAssignResult';
  assignedCount: Scalars['Int']['output'];
};

export type BulkAssignSalaryTemplateInput = {
  effectiveFrom?: InputMaybe<Scalars['String']['input']>;
  employeeIds: Array<Scalars['String']['input']>;
  extraAllowance?: InputMaybe<Scalars['Float']['input']>;
  extraDeduction?: InputMaybe<Scalars['Float']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  templateId: Scalars['String']['input'];
};

/** Input for bulk-replacing a timetable for a course/semester. */
export type BulkCreateTimetableSlotsInput = {
  /** Academic year UUID. */
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  /** Course UUID. */
  courseId: Scalars['String']['input'];
  /** Section label. */
  section?: InputMaybe<Scalars['String']['input']>;
  /** Semester number. */
  semester: Scalars['Int']['input'];
  /** Slots to create (replaces existing slots for this course/semester). */
  slots: Array<CreateTimetableSlotInput>;
};

/**
 * Per-row outcome of a bulkSetDutyRoster call, so a roster grid submit can
 * report exactly which shifts landed and which collided.
 */
export type BulkDutyRosterResult = {
  __typename?: 'BulkDutyRosterResult';
  created: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
};

export type BulkSetDutyRosterInput = {
  shifts: Array<DutyRosterShiftInput>;
};

/** A single day in the calendar month view. */
export type CalendarDay = {
  __typename?: 'CalendarDay';
  autoGen: Scalars['Boolean']['output'];
  date: Scalars['String']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
  weekday: Scalars['Int']['output'];
};

/** Full calendar month response. */
export type CalendarMonth = {
  __typename?: 'CalendarMonth';
  days: Array<CalendarDay>;
  month: Scalars['Int']['output'];
  totalDays: Scalars['Int']['output'];
  working: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};

/** Calendar generation rules for a tenant. */
export type CalendarSettings = {
  __typename?: 'CalendarSettings';
  defaultWorking: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  saturdayRule: Scalars['String']['output'];
  saturdayWeeks: Scalars['String']['output'];
  sundayOff: Scalars['Boolean']['output'];
};

/** One weekly availability window for a clinician. Booking validates against these when any exist. */
export type ClinicianSchedule = {
  __typename?: 'ClinicianSchedule';
  /** Whether the window is in effect. */
  active: Scalars['Boolean']['output'];
  /** Clinician (Employee) UUID. */
  clinicianId: Scalars['String']['output'];
  /** Clinician display name. */
  clinicianName: Scalars['String']['output'];
  /** Day of week: 0 = Sunday … 6 = Saturday. */
  dayOfWeek: Scalars['Int']['output'];
  /** Window end (HH:MM, 24h). */
  endTime: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Default consultation length in minutes. */
  slotMinutes: Scalars['Int']['output'];
  /** Window start (HH:MM, 24h). */
  startTime: Scalars['String']['output'];
};

/** Result of a bulk-copy operation. */
export type CopyResult = {
  __typename?: 'CopyResult';
  copied: Scalars['Int']['output'];
};

/** A course or programme offered by the institution (e.g. B.Tech CSE). */
export type Course = {
  __typename?: 'Course';
  /** Batches/cohorts under this course. */
  batches: Array<CourseBatch>;
  /** Short course code (e.g. BTCSE). */
  code: Scalars['String']['output'];
  /** Department details. */
  department: Maybe<Department>;
  /** Department UUID. */
  departmentId: Maybe<Scalars['String']['output']>;
  /** Optional description. */
  description: Maybe<Scalars['String']['output']>;
  /** Duration in years. */
  durationYears: Maybe<Scalars['Int']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Full course name. */
  name: Scalars['String']['output'];
  /** Total number of semesters. */
  totalSemesters: Maybe<Scalars['Int']['output']>;
};

/** A batch/cohort under a course (e.g. 2024-2028). */
export type CourseBatch = {
  __typename?: 'CourseBatch';
  courseId: Scalars['String']['output'];
  endYear: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  startYear: Scalars['Int']['output'];
};

export type CreateAcademicYearInput = {
  endDate: Scalars['String']['input'];
  isCurrent?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
};

export type CreateAccountInput = {
  code: Scalars['String']['input'];
  name: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
};

export type CreateAdmissionInput = {
  admissionDate?: InputMaybe<Scalars['String']['input']>;
  bedId: Scalars['String']['input'];
  clinicianId?: InputMaybe<Scalars['String']['input']>;
  /** Open a linked IPD encounter for this admission when true. */
  openEncounter?: InputMaybe<Scalars['Boolean']['input']>;
  patientId: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  wardId: Scalars['String']['input'];
};

export type CreateAmbulanceInput = {
  code: Scalars['String']['input'];
  driverName?: InputMaybe<Scalars['String']['input']>;
  driverPhone?: InputMaybe<Scalars['String']['input']>;
  registration?: InputMaybe<Scalars['String']['input']>;
  vehicleType?: InputMaybe<Scalars['String']['input']>;
};

/** Input for creating an announcement. */
export type CreateAnnouncementInput = {
  /** Body text (markdown supported). */
  body: Scalars['String']['input'];
  /** Expiry datetime (ISO 8601). */
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  /** Publish immediately. Defaults to false. */
  isPublished?: InputMaybe<Scalars['Boolean']['input']>;
  /** Priority: low | normal | high | urgent. Defaults to normal. */
  priority?: InputMaybe<Scalars['String']['input']>;
  /** Comma-separated target roles. Defaults to all roles. */
  targetRoles?: InputMaybe<Scalars['String']['input']>;
  /** Announcement title. */
  title: Scalars['String']['input'];
};

export type CreateAppointmentInput = {
  clinicianId: Scalars['String']['input'];
  /** Appointment date (YYYY-MM-DD). */
  date: Scalars['String']['input'];
  departmentId?: InputMaybe<Scalars['String']['input']>;
  /** End time (HH:MM, 24h). */
  endTime?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  /** Who referred the patient (doctor, camp, or SELF). */
  referredBy?: InputMaybe<Scalars['String']['input']>;
  /** Start time (HH:MM, 24h). */
  startTime: Scalars['String']['input'];
};

export type CreateBedInput = {
  bay?: InputMaybe<Scalars['String']['input']>;
  bedNumber: Scalars['String']['input'];
  dailyCharge?: InputMaybe<Scalars['Float']['input']>;
  wardId: Scalars['String']['input'];
};

export type CreateBillableServiceInput = {
  /** Category: consultation | procedure | lab | radiology | other. */
  category?: InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  name: Scalars['String']['input'];
  unitPrice: Scalars['Float']['input'];
};

export type CreateBloodRequestInput = {
  bloodGroup: Scalars['String']['input'];
  component?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  requestedById?: InputMaybe<Scalars['String']['input']>;
  unitsRequired?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateBloodUnitInput = {
  bagNumber: Scalars['String']['input'];
  bloodGroup: Scalars['String']['input'];
  collectedDate?: InputMaybe<Scalars['String']['input']>;
  component?: InputMaybe<Scalars['String']['input']>;
  donorName?: InputMaybe<Scalars['String']['input']>;
  expiryDate?: InputMaybe<Scalars['String']['input']>;
  volumeMl?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateClinicianScheduleInput = {
  clinicianId: Scalars['String']['input'];
  /** Day of week: 0 = Sunday … 6 = Saturday. */
  dayOfWeek: Scalars['Int']['input'];
  endTime: Scalars['String']['input'];
  /** Default consultation length in minutes (default 15). */
  slotMinutes?: InputMaybe<Scalars['Int']['input']>;
  startTime: Scalars['String']['input'];
};

/** Input for creating a course/programme. */
export type CreateCourseInput = {
  /** Course code. */
  code: Scalars['String']['input'];
  /** Department UUID. */
  departmentId?: InputMaybe<Scalars['String']['input']>;
  /** Optional description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Duration in years. */
  durationYears?: InputMaybe<Scalars['Int']['input']>;
  /** Course name. */
  name: Scalars['String']['input'];
  /** Total semesters. */
  totalSemesters?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateCustomRoleInput = {
  name: Scalars['String']['input'];
  permissions?: InputMaybe<Scalars['String']['input']>;
};

/** Input for creating a department. */
export type CreateDepartmentInput = {
  /** Employee UUID to designate as Head of Department. */
  headEmployeeId?: InputMaybe<Scalars['ID']['input']>;
  /** Department name. */
  name: Scalars['String']['input'];
};

export type CreateDietPlanInput = {
  admissionId: Scalars['String']['input'];
  calories?: InputMaybe<Scalars['Int']['input']>;
  dietType?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  restrictions?: InputMaybe<Scalars['String']['input']>;
};

export type CreateDispenseInput = {
  /** Dispense date (YYYY-MM-DD). Defaults to today. */
  date?: InputMaybe<Scalars['String']['input']>;
  /** Linked encounter UUID; omit for direct dispensing. */
  encounterId?: InputMaybe<Scalars['String']['input']>;
  items: Array<DispenseItemInput>;
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
};

/** Log a received lot for a drug, with its own expiry and remaining quantity. */
export type CreateDrugBatchInput = {
  batchNo: Scalars['String']['input'];
  drugId: Scalars['ID']['input'];
  /** Expiry date (YYYY-MM-DD). Blank for non-expiring stock. */
  expiryDate?: InputMaybe<Scalars['String']['input']>;
  qty: Scalars['Float']['input'];
  unitCost?: InputMaybe<Scalars['Float']['input']>;
};

export type CreateDrugInput = {
  /** Optional batch number. When set, the opening stock is recorded as an initial DrugBatch (enables expiry tracking + FEFO). */
  batchNo?: InputMaybe<Scalars['String']['input']>;
  /** Optional batch expiry date (YYYY-MM-DD). Only used when batchNo is set. */
  expiryDate?: InputMaybe<Scalars['String']['input']>;
  /** Form: tablet | capsule | syrup | injection | ointment | drops | other. */
  form?: InputMaybe<Scalars['String']['input']>;
  genericName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  reorderLevel?: InputMaybe<Scalars['Float']['input']>;
  /** Opening stock (default 0). */
  stockQty?: InputMaybe<Scalars['Float']['input']>;
  strength?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
  unitPrice: Scalars['Float']['input'];
};

export type CreateDutyRosterInput = {
  /** Shift date (YYYY-MM-DD). */
  date: Scalars['String']['input'];
  employeeId: Scalars['String']['input'];
  endTime: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  shiftName?: InputMaybe<Scalars['String']['input']>;
  startTime: Scalars['String']['input'];
};

/** Input for creating a new employee profile. */
export type CreateEmployeeInput = {
  /** Street address. */
  address?: InputMaybe<Scalars['String']['input']>;
  /** Blood group. */
  bloodGroup?: InputMaybe<Scalars['String']['input']>;
  /** City. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** Date of birth (YYYY-MM-DD). */
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  /** Department UUID. */
  departmentId?: InputMaybe<Scalars['ID']['input']>;
  /** Job title. */
  designation?: InputMaybe<Scalars['String']['input']>;
  /**
   * Login email. Optional only when the organisation signs staff in by
   * Employee ID; required otherwise. Unique within the tenant when set.
   */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Emergency contact name. */
  emergencyName?: InputMaybe<Scalars['String']['input']>;
  /** Emergency contact phone. */
  emergencyPhone?: InputMaybe<Scalars['String']['input']>;
  /** Internal employee ID / badge number. */
  employeeId: Scalars['String']['input'];
  /** Employment type: full_time | part_time | contract | visiting. */
  employmentType?: InputMaybe<Scalars['String']['input']>;
  /** Gender: Male | Female | Other. */
  gender?: InputMaybe<Scalars['String']['input']>;
  /** Grade/level. */
  gradeLevel?: InputMaybe<Scalars['String']['input']>;
  /** Join date (YYYY-MM-DD). */
  joinDate?: InputMaybe<Scalars['String']['input']>;
  /** Full name for the employee's login account. */
  name: Scalars['String']['input'];
  /** Nationality. */
  nationality?: InputMaybe<Scalars['String']['input']>;
  /**
   * Initial password (hashed on the server). Optional — omit it and set
   * sendInvite to e-mail the user a link to choose their own password.
   */
  password?: InputMaybe<Scalars['String']['input']>;
  /** Banking and PF details. */
  paymentDetails?: InputMaybe<PaymentDetailsInput>;
  /** Personal email. */
  personalEmail?: InputMaybe<Scalars['String']['input']>;
  /** Contact phone. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** Profile photo URL. */
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  /** PIN code. */
  pincode?: InputMaybe<Scalars['String']['input']>;
  /** Probation end date (YYYY-MM-DD). */
  probationEndDate?: InputMaybe<Scalars['String']['input']>;
  /** Base role for the account: teacher | staff. Defaults to staff. */
  role?: InputMaybe<Scalars['String']['input']>;
  /**
   * When true, e-mail the user a password-setup invite. Honoured only when the
   * tenant is allowed and able to send mail, and the user has an email.
   */
  sendInvite?: InputMaybe<Scalars['Boolean']['input']>;
  /** State. */
  state?: InputMaybe<Scalars['String']['input']>;
};

export type CreateEncounterInput = {
  /** Linked appointment UUID; omit for walk-ins. */
  appointmentId?: InputMaybe<Scalars['String']['input']>;
  chiefComplaint?: InputMaybe<Scalars['String']['input']>;
  clinicianId: Scalars['String']['input'];
  diagnosis?: InputMaybe<Scalars['String']['input']>;
  followUpDate?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  prescription?: InputMaybe<Scalars['String']['input']>;
  /** Visit date (YYYY-MM-DD). Defaults to today. */
  visitDate?: InputMaybe<Scalars['String']['input']>;
  /** Visit type: opd (default) | ipd | emergency. */
  visitType?: InputMaybe<Scalars['String']['input']>;
  /** Vitals as a JSON object string. */
  vitals?: InputMaybe<Scalars['String']['input']>;
};

/** Input for creating a tenant event category. */
export type CreateEventCategoryInput = {
  /** Hex color for calendar display. */
  color?: InputMaybe<Scalars['String']['input']>;
  /** Optional notes about the category. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Display name (e.g. Workshop). */
  name: Scalars['String']['input'];
};

/** Input for creating a calendar event. */
export type CreateEventInput = {
  /** Category: holiday | exam | cultural | sports | other. */
  category: Scalars['String']['input'];
  /** Hex color. */
  color?: InputMaybe<Scalars['String']['input']>;
  /** Description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** End date (YYYY-MM-DD). Defaults to eventDate if omitted. */
  endDate?: InputMaybe<Scalars['String']['input']>;
  /** Start date (YYYY-MM-DD). */
  eventDate: Scalars['String']['input'];
  /** Visible to all roles. Defaults to true. */
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  /** Location. */
  location?: InputMaybe<Scalars['String']['input']>;
  /** Event title. */
  title: Scalars['String']['input'];
};

/** Input for creating an exam schedule. */
export type CreateExamScheduleInput = {
  /** Academic year UUID. */
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  /** End date (YYYY-MM-DD). */
  endDate?: InputMaybe<Scalars['String']['input']>;
  /** Exam type: internal | external | practical. */
  examType: Scalars['String']['input'];
  /** Student instructions. */
  instructions?: InputMaybe<Scalars['String']['input']>;
  /** Schedule name. */
  name: Scalars['String']['input'];
  /** Applicable semester. */
  semesterNumber?: InputMaybe<Scalars['Int']['input']>;
  /** Start date (YYYY-MM-DD). */
  startDate?: InputMaybe<Scalars['String']['input']>;
};

/** Input for creating a department-scoped exam type. */
export type CreateExamTypeInput = {
  /** Whether the exam type is active. Defaults to true. */
  active?: InputMaybe<Scalars['Boolean']['input']>;
  /** Owning department UUID. Omit/blank for an org-wide exam type. */
  departmentId?: InputMaybe<Scalars['String']['input']>;
  /** Default max marks (e.g. 20, 100). */
  maxMarks: Scalars['Float']['input'];
  /** Display name (e.g. Mid Semester). */
  name: Scalars['String']['input'];
  /** Percent contribution to the final grade. Optional. */
  weightage?: InputMaybe<Scalars['Float']['input']>;
};

/** Input for defining a fee add-on. */
export type CreateFeeAddOnInput = {
  /** Charge per course year. */
  amountPerYear: Scalars['Float']['input'];
  /** Short unique code. */
  code: Scalars['String']['input'];
  /** Optional description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Fee category UUID to bill under. */
  feeCategoryId: Scalars['String']['input'];
  /** Kind: other | transport | hostel. Defaults to other. */
  kind?: InputMaybe<Scalars['String']['input']>;
  /** Add-on name. */
  name: Scalars['String']['input'];
};

/**
 * Input for creating a fee allocation. Omit installments to auto-generate them
 * from the frequency: one_time = single payment, yearly = one per course year,
 * semester = two per course year.
 */
export type CreateFeeAllocationInput = {
  /** Fee structure UUID. */
  feeStructureId: Scalars['String']['input'];
  /** Due date of the first installment (YYYY-MM-DD). Later slots are spaced by frequency. */
  firstDueDate?: InputMaybe<Scalars['String']['input']>;
  /** one_time | yearly | semester. */
  frequency: Scalars['String']['input'];
  /** Custom installment schedule (overrides auto-generation). */
  installments?: InputMaybe<Array<FeeAllocationInstallmentInput>>;
  /** Allocation name (defaults to structure + frequency). */
  name?: InputMaybe<Scalars['String']['input']>;
  /** UUID of the course, batch, or student. */
  targetId: Scalars['String']['input'];
  /** course | batch | student. */
  targetType: Scalars['String']['input'];
};

/** Input for creating a fee category. */
export type CreateFeeCategoryInput = {
  /** Short code. */
  code: Scalars['String']['input'];
  /** Optional description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Category name. */
  name: Scalars['String']['input'];
};

/** Input for creating a course fee structure (variation). */
export type CreateFeeStructureInput = {
  /** Optional intake batch UUID. */
  batchId?: InputMaybe<Scalars['String']['input']>;
  /** Short unique code. */
  code: Scalars['String']['input'];
  /** Course UUID. */
  courseId: Scalars['String']['input'];
  /** Optional description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Per-year line items (at least one). */
  items: Array<FeeStructureItemInput>;
  /** Variation name (e.g. Regular, NRI Quota). */
  name: Scalars['String']['input'];
};

export type CreateHolidayInput = {
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  startDate?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type CreateHostelBlockInput = {
  floors: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export type CreateHostelRoomInput = {
  blockId: Scalars['String']['input'];
  capacity: Scalars['Int']['input'];
  floor?: InputMaybe<Scalars['Int']['input']>;
  monthlyFee: Scalars['Float']['input'];
  rateAmount?: InputMaybe<Scalars['Float']['input']>;
  rateType?: InputMaybe<Scalars['String']['input']>;
  roomClassId?: InputMaybe<Scalars['String']['input']>;
  roomNumber: Scalars['String']['input'];
  roomType?: InputMaybe<Scalars['String']['input']>;
};

export type CreateInsuranceClaimInput = {
  admissionId?: InputMaybe<Scalars['String']['input']>;
  claimAmount?: InputMaybe<Scalars['Float']['input']>;
  diagnosis?: InputMaybe<Scalars['String']['input']>;
  invoiceId?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  payerId: Scalars['String']['input'];
  policyNumber?: InputMaybe<Scalars['String']['input']>;
};

export type CreateInsurancePayerInput = {
  code: Scalars['String']['input'];
  contactName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  payerType?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type CreateInventoryItemInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  linkedDrugId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  openingStock?: InputMaybe<Scalars['Float']['input']>;
  reorderLevel?: InputMaybe<Scalars['Float']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
  unitCost?: InputMaybe<Scalars['Float']['input']>;
};

export type CreateInvoiceInput = {
  /** Invoice date (YYYY-MM-DD). Defaults to today. */
  date?: InputMaybe<Scalars['String']['input']>;
  /** Flat discount off the subtotal. */
  discount?: InputMaybe<Scalars['Float']['input']>;
  /** Linked encounter UUID; omit when billing directly. */
  encounterId?: InputMaybe<Scalars['String']['input']>;
  items: Array<InvoiceItemInput>;
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
};

export type CreateLabOrderInput = {
  encounterId?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  orderDate?: InputMaybe<Scalars['String']['input']>;
  orderedById?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  tests: Array<LabOrderItemInput>;
};

export type CreateLabTestInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  method?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  panel?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  refHigh?: InputMaybe<Scalars['Float']['input']>;
  refLow?: InputMaybe<Scalars['Float']['input']>;
  refText?: InputMaybe<Scalars['String']['input']>;
  sampleType?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type CreateLearningAssignmentInput = {
  assessmentType: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  orderIndex: Scalars['Int']['input'];
  passScore?: InputMaybe<Scalars['Float']['input']>;
  sectionId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type CreateLearningGoalInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['String']['input']>;
  isMandatory: Scalars['Boolean']['input'];
  title: Scalars['String']['input'];
};

export type CreateLearningQuestionInput = {
  assignmentId: Scalars['ID']['input'];
  correctAnswers: Array<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  options: Array<Scalars['String']['input']>;
  orderIndex?: InputMaybe<Scalars['Int']['input']>;
  points?: InputMaybe<Scalars['Float']['input']>;
  prompt: Scalars['String']['input'];
};

export type CreateLearningSectionInput = {
  goalId: Scalars['ID']['input'];
  orderIndex: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};

export type CreateLearningUnitInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  orderIndex: Scalars['Int']['input'];
  sectionId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
  videoType?: InputMaybe<Scalars['String']['input']>;
  videoUrl?: InputMaybe<Scalars['String']['input']>;
};

/** Input for creating a leave type configuration. */
export type CreateLeaveTypeInput = {
  /** Applicable to: all | employee | student. */
  applicableTo: Scalars['String']['input'];
  /** Allow carry-forward. */
  carryForward: Scalars['Boolean']['input'];
  /** Short code. */
  code: Scalars['String']['input'];
  /** Days allowed per year. */
  daysPerYear: Scalars['Int']['input'];
  /** Max days that can be carried forward. */
  maxCarryForward: Scalars['Int']['input'];
  /** Leave type name. */
  name: Scalars['String']['input'];
};

export type CreateLibraryBookInput = {
  author: Scalars['String']['input'];
  availableCopies?: InputMaybe<Scalars['Int']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  isbn?: InputMaybe<Scalars['String']['input']>;
  publishYear?: InputMaybe<Scalars['Int']['input']>;
  publisher?: InputMaybe<Scalars['String']['input']>;
  rack?: InputMaybe<Scalars['String']['input']>;
  shelf?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  totalCopies: Scalars['Int']['input'];
};

export type CreateManualJournalInput = {
  date: Scalars['String']['input'];
  lines: Array<LedgerLineInput>;
  memo?: InputMaybe<Scalars['String']['input']>;
};

/** Input for recording a mark entry. */
export type CreateMarkInput = {
  /** Academic year UUID. */
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  /** Assessment type. */
  assessmentType?: InputMaybe<Scalars['String']['input']>;
  /** Staff UUID who entered this mark. */
  enteredBy?: InputMaybe<Scalars['String']['input']>;
  /** Exam type. */
  examType: Scalars['String']['input'];
  /** Marks obtained. */
  marksObtained: Scalars['Float']['input'];
  /** Maximum marks. */
  maxMarks: Scalars['Float']['input'];
  /** Semester number. */
  semester: Scalars['Int']['input'];
  /** Student UUID. */
  studentId: Scalars['String']['input'];
  /** Subject name. */
  subject: Scalars['String']['input'];
  /** Subject UUID. */
  subjectId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateMedicationOrderInput = {
  admissionId: Scalars['String']['input'];
  dose?: InputMaybe<Scalars['String']['input']>;
  drugId?: InputMaybe<Scalars['String']['input']>;
  drugName: Scalars['String']['input'];
  endDate?: InputMaybe<Scalars['String']['input']>;
  frequency?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  orderedById?: InputMaybe<Scalars['String']['input']>;
  route?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type CreateOperationTheatreInput = {
  code: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreatePatientInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  allergies?: InputMaybe<Scalars['String']['input']>;
  bloodGroup?: InputMaybe<Scalars['String']['input']>;
  chronicConditions?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emergencyName?: InputMaybe<Scalars['String']['input']>;
  emergencyPhone?: InputMaybe<Scalars['String']['input']>;
  firstName: Scalars['String']['input'];
  gender?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** Medical Record Number. Auto-generated when omitted. */
  mrn?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  pincode?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePurchaseInvoiceInput = {
  dueDate?: InputMaybe<Scalars['String']['input']>;
  invoiceDate?: InputMaybe<Scalars['String']['input']>;
  invoiceNumber: Scalars['String']['input'];
  purchaseOrderId?: InputMaybe<Scalars['String']['input']>;
  subtotal?: InputMaybe<Scalars['Float']['input']>;
  taxTotal?: InputMaybe<Scalars['Float']['input']>;
  total?: InputMaybe<Scalars['Float']['input']>;
  vendorId: Scalars['String']['input'];
};

export type CreatePurchaseOrderInput = {
  expectedDate?: InputMaybe<Scalars['String']['input']>;
  items: Array<PurchaseOrderItemInput>;
  notes?: InputMaybe<Scalars['String']['input']>;
  orderDate?: InputMaybe<Scalars['String']['input']>;
  vendorId: Scalars['String']['input'];
};

export type CreateQuestionBankItemInput = {
  /** Whether the question joins the active pool. Defaults to true. */
  active?: InputMaybe<Scalars['Boolean']['input']>;
  /** Model answer or correct option. */
  answer?: InputMaybe<Scalars['String']['input']>;
  /** Course-outcome tag. */
  courseOutcome?: InputMaybe<Scalars['String']['input']>;
  /** Curriculum subject the question belongs to. */
  curriculumSubjectId: Scalars['ID']['input'];
  /** Difficulty: easy | medium | hard. Defaults to medium. */
  difficulty?: InputMaybe<Scalars['String']['input']>;
  /** Marks the question carries. Defaults to 1. */
  marks?: InputMaybe<Scalars['Float']['input']>;
  /** Answer choices, for mcq questions. */
  options?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The question text. Required. */
  questionText: Scalars['String']['input'];
  /** Shape: mcq | short | long | numeric. Defaults to long. */
  questionType?: InputMaybe<Scalars['String']['input']>;
  /** Syllabus unit / topic label. */
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type CreateRadiologyOrderInput = {
  encounterId?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  orderDate?: InputMaybe<Scalars['String']['input']>;
  orderedById?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  studyId: Scalars['String']['input'];
};

export type CreateRadiologyStudyInput = {
  bodyPart?: InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  modality?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  price?: InputMaybe<Scalars['Float']['input']>;
};

export type CreateReferralInput = {
  fromClinicianId?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  referredTo: Scalars['String']['input'];
  specialty?: InputMaybe<Scalars['String']['input']>;
  urgency?: InputMaybe<Scalars['String']['input']>;
};

export type CreateRoomClassInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  rateAmount: Scalars['Float']['input'];
  rateType: Scalars['String']['input'];
};

/** Input for creating a salary structure. */
export type CreateSalaryStructureInput = {
  /** Monthly basic salary. */
  basicSalary: Scalars['Float']['input'];
  /** DA amount. */
  da?: InputMaybe<Scalars['Float']['input']>;
  /** Effective from date (YYYY-MM-DD). */
  effectiveFrom: Scalars['String']['input'];
  /** Employee UUID. */
  employeeId: Scalars['ID']['input'];
  /** ESI deduction amount. */
  esi?: InputMaybe<Scalars['Float']['input']>;
  /** HRA amount. */
  hra?: InputMaybe<Scalars['Float']['input']>;
  /** Medical allowance amount. */
  medicalAllowance?: InputMaybe<Scalars['Float']['input']>;
  /** Optional notes. */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Other allowances amount. */
  otherAllowances?: InputMaybe<Scalars['Float']['input']>;
  /** Other deductions amount. */
  otherDeductions?: InputMaybe<Scalars['Float']['input']>;
  /** PF deduction amount. */
  pf?: InputMaybe<Scalars['Float']['input']>;
  /** TA amount. */
  ta?: InputMaybe<Scalars['Float']['input']>;
  /** TDS deduction amount. */
  tds?: InputMaybe<Scalars['Float']['input']>;
};

export type CreateSalaryTemplateInput = {
  basicSalary: Scalars['Float']['input'];
  da?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  esi?: InputMaybe<Scalars['Float']['input']>;
  hra?: InputMaybe<Scalars['Float']['input']>;
  medicalAllowance?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  otherAllowances?: InputMaybe<Scalars['Float']['input']>;
  otherDeductions?: InputMaybe<Scalars['Float']['input']>;
  pf?: InputMaybe<Scalars['Float']['input']>;
  ta?: InputMaybe<Scalars['Float']['input']>;
  tds?: InputMaybe<Scalars['Float']['input']>;
};

export type CreateSemesterInput = {
  academicYearId: Scalars['String']['input'];
  endDate?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  number?: InputMaybe<Scalars['Int']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type CreateStudentAssignmentInput = {
  attachmentUrl?: InputMaybe<Scalars['String']['input']>;
  courseId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** Due date (YYYY-MM-DD). */
  dueDate?: InputMaybe<Scalars['String']['input']>;
  maxMarks?: InputMaybe<Scalars['Float']['input']>;
  section?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

/** Input for enrolling a new student. */
export type CreateStudentInput = {
  /** Address. */
  address?: InputMaybe<Scalars['String']['input']>;
  /** Admission status. */
  admissionStatus?: InputMaybe<Scalars['String']['input']>;
  /** Batch/cohort label. */
  batch?: InputMaybe<Scalars['String']['input']>;
  /** Blood group. */
  bloodGroup?: InputMaybe<Scalars['String']['input']>;
  /** City. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** Course UUID. */
  courseId?: InputMaybe<Scalars['String']['input']>;
  /** Date of birth (YYYY-MM-DD). */
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  /**
   * Login email. Optional only when the organisation signs students in by
   * Roll Number; required otherwise. Unique within the tenant when set.
   */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Emergency contact name. */
  emergencyName?: InputMaybe<Scalars['String']['input']>;
  /** Emergency contact phone. */
  emergencyPhone?: InputMaybe<Scalars['String']['input']>;
  /** Enrollment date (YYYY-MM-DD). */
  enrollDate?: InputMaybe<Scalars['String']['input']>;
  /** Father's name. */
  fatherName?: InputMaybe<Scalars['String']['input']>;
  /** Father's phone. */
  fatherPhone?: InputMaybe<Scalars['String']['input']>;
  /** Gender. */
  gender?: InputMaybe<Scalars['String']['input']>;
  /** Mother's name. */
  motherName?: InputMaybe<Scalars['String']['input']>;
  /** Mother's phone. */
  motherPhone?: InputMaybe<Scalars['String']['input']>;
  /** Full name for the student's login account. */
  name: Scalars['String']['input'];
  /** Nationality. */
  nationality?: InputMaybe<Scalars['String']['input']>;
  /**
   * Initial password (hashed on the server). Optional — omit it and set
   * sendInvite to e-mail the student a link to choose their own password.
   */
  password?: InputMaybe<Scalars['String']['input']>;
  /** Phone number. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** Photo URL. */
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  /** PIN code. */
  pincode?: InputMaybe<Scalars['String']['input']>;
  /** Roll number. */
  rollNumber: Scalars['String']['input'];
  /** Section. */
  section?: InputMaybe<Scalars['String']['input']>;
  /** Current semester. */
  semester?: InputMaybe<Scalars['Int']['input']>;
  /**
   * When true, e-mail the student a password-setup invite. Honoured only when
   * the tenant is allowed and able to send mail, and the student has an email.
   */
  sendInvite?: InputMaybe<Scalars['Boolean']['input']>;
  /** State. */
  state?: InputMaybe<Scalars['String']['input']>;
};

/** Input for creating a subject. */
export type CreateSubjectInput = {
  /** Subject code. */
  code: Scalars['String']['input'];
  /** Course outcome statements. */
  courseOutcomes?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Credit units. */
  credits?: InputMaybe<Scalars['Int']['input']>;
  /** Department UUID. */
  departmentId?: InputMaybe<Scalars['String']['input']>;
  /** Description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Weekly lab hours. */
  labHours?: InputMaybe<Scalars['Int']['input']>;
  /** Subject name. */
  name: Scalars['String']['input'];
  /** Semester number. */
  semesterNumber?: InputMaybe<Scalars['Int']['input']>;
  /** Syllabus URL. */
  syllabusUrl?: InputMaybe<Scalars['String']['input']>;
  /** Weekly teaching hours. */
  teachingHours?: InputMaybe<Scalars['Int']['input']>;
  /** Course plan units. */
  units?: InputMaybe<Array<SubjectUnitInput>>;
};

/** Input for creating a timetable slot. */
export type CreateTimetableSlotInput = {
  /** Academic year UUID. */
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  /** Course UUID. */
  courseId: Scalars['String']['input'];
  /** Day of week. */
  dayOfWeek: Scalars['String']['input'];
  /** Teacher UUID. */
  employeeId?: InputMaybe<Scalars['String']['input']>;
  /** End time (HH:MM). */
  endTime: Scalars['String']['input'];
  /** Period number. */
  periodNumber: Scalars['Int']['input'];
  /** Room. */
  room?: InputMaybe<Scalars['String']['input']>;
  /** Section. */
  section?: InputMaybe<Scalars['String']['input']>;
  /** Semester number. */
  semester: Scalars['Int']['input'];
  /** Start time (HH:MM). */
  startTime: Scalars['String']['input'];
  /** Subject UUID. */
  subjectId: Scalars['String']['input'];
};

export type CreateTransportRouteInput = {
  distance?: InputMaybe<Scalars['Float']['input']>;
  endPoint: Scalars['String']['input'];
  routeName: Scalars['String']['input'];
  startPoint: Scalars['String']['input'];
  stops?: InputMaybe<Scalars['String']['input']>;
};

export type CreateTransportVehicleInput = {
  capacity: Scalars['Int']['input'];
  /** Optional Employee UUID of the driver (enables driver attendance). */
  driverEmployeeId?: InputMaybe<Scalars['String']['input']>;
  driverName?: InputMaybe<Scalars['String']['input']>;
  driverPhone?: InputMaybe<Scalars['String']['input']>;
  routeId: Scalars['String']['input'];
  vehicleNumber: Scalars['String']['input'];
  vehicleType: Scalars['String']['input'];
};

export type CreateTriageCaseInput = {
  assignedClinicianId?: InputMaybe<Scalars['String']['input']>;
  chiefComplaint?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  triageLevel?: InputMaybe<Scalars['Int']['input']>;
  vitals?: InputMaybe<Scalars['String']['input']>;
};

/** Input for creating a user account. */
export type CreateUserInput = {
  /**
   * Email address. Unique within the tenant when set. Pass an empty string for
   * staff/students on tenants that sign in by Employee ID / Roll Number; admins
   * always need a real email.
   */
  email: Scalars['String']['input'];
  /** Display name. */
  name: Scalars['String']['input'];
  /**
   * Initial password (hashed on the server). Optional — omit it and set
   * sendInvite to e-mail the user a link to choose their own password.
   */
  password?: InputMaybe<Scalars['String']['input']>;
  /** Role: admin | teacher | staff | student. */
  role: Scalars['String']['input'];
  /**
   * When true, e-mail the user a password-setup invite. Honoured only when the
   * tenant is allowed and able to send mail.
   */
  sendInvite?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CreateVendorInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  address?: InputMaybe<Scalars['String']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  contactName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  gstin?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  paymentTerms?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type CreateWardInput = {
  code: Scalars['String']['input'];
  floor?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  wardType?: InputMaybe<Scalars['String']['input']>;
};

/** A subject assigned to a semester of a course's curriculum. */
export type CurriculumSubject = {
  __typename?: 'CurriculumSubject';
  /** Course (programme) UUID. */
  courseId: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Semester number within the course (1-based). */
  semesterNumber: Scalars['Int']['output'];
  /** Display order within the semester. */
  sortOrder: Maybe<Scalars['Int']['output']>;
  /** The assigned subject, with its course plan and outcomes. */
  subject: Subject;
};

/** A custom role defined by the admin. */
export type CustomRole = {
  __typename?: 'CustomRole';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  permissions: Scalars['String']['output'];
};

/** Daily attendance breakdown row for the attendance report. */
export type DailyAttendanceRow = {
  __typename?: 'DailyAttendanceRow';
  /** Count absent. */
  absent: Scalars['Int']['output'];
  /** Date (YYYY-MM-DD). */
  date: Scalars['String']['output'];
  /** Count late. */
  late: Scalars['Int']['output'];
  /** Count present. */
  present: Scalars['Int']['output'];
  /** Total records for this day. */
  total: Scalars['Int']['output'];
};

/** Key count metrics shown on the admin dashboard. */
export type DashboardStats = {
  __typename?: 'DashboardStats';
  /** Total number of employees. */
  employees: Scalars['Int']['output'];
  /** Number of leave applications awaiting review. */
  pendingLeaves: Scalars['Int']['output'];
  /** Number of payroll records in draft status. */
  pendingPayrolls: Scalars['Int']['output'];
  /** Total number of active students. */
  students: Scalars['Int']['output'];
  /** Total number of employees with the teacher role. */
  teachers: Scalars['Int']['output'];
  /** Students/employees absent today. */
  todayAbsent: Scalars['Int']['output'];
  /** Students/employees present today. */
  todayPresent: Scalars['Int']['output'];
  /** Total number of user accounts. */
  users: Scalars['Int']['output'];
  /** Registered patients (healthcare). Zero outside that vertical. */
  patients: Scalars['Int']['output'];
  /** Appointments scheduled for today, excluding cancelled. */
  todayAppointments: Scalars['Int']['output'];
  /** OPD visits recorded today. */
  todayOpd: Scalars['Int']['output'];
  /** OPD visits still open. */
  openOpd: Scalars['Int']['output'];
  /** Patients currently admitted (IPD). */
  activeAdmissions: Scalars['Int']['output'];
  /** Beds currently occupied. */
  occupiedBeds: Scalars['Int']['output'];
  /** Beds currently available. */
  availableBeds: Scalars['Int']['output'];
};

/** An organisational department within the institution. */
export type Department = {
  __typename?: 'Department';
  /** Head of Department (HOD). Students in this department are automatically placed under this employee in the org hierarchy. */
  headEmployee: Maybe<Employee>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Department name (e.g. Computer Science, Finance). */
  name: Scalars['String']['output'];
};

/** One app install that can receive push notifications. */
export type DeviceToken = {
  __typename?: 'DeviceToken';
  /** App version that last registered this token. */
  appVersion: Maybe<Scalars['String']['output']>;
  /** ISO 8601 timestamp when the install first registered. */
  createdAt: Scalars['String']['output'];
  /** The app's own install id, for showing a recognisable device list. */
  deviceId: Maybe<Scalars['String']['output']>;
  /** Human label for the device, e.g. "Ward 3 iPad". */
  deviceName: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** ISO 8601 timestamp of the last registration from this install. */
  lastSeenAt: Scalars['String']['output'];
  /** Device platform: ios | android | web. */
  platform: Scalars['String']['output'];
};

export type DietPlan = {
  __typename?: 'DietPlan';
  admissionId: Scalars['String']['output'];
  calories: Scalars['Int']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  dietType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  restrictions: Maybe<Scalars['String']['output']>;
  servings: Array<MealServing>;
  status: Scalars['String']['output'];
};

/** One difficulty bucket's marks target in a generation rule. */
export type DifficultyMarksInput = {
  /** easy | medium | hard. */
  difficulty: Scalars['String']['input'];
  /** Marks to fill from this bucket. */
  marks: Scalars['Float']['input'];
};

export type DischargeAdmissionInput = {
  admissionId: Scalars['ID']['input'];
  conditionOnDischarge?: InputMaybe<Scalars['String']['input']>;
  dischargeDate?: InputMaybe<Scalars['String']['input']>;
  dischargeDiagnosis?: InputMaybe<Scalars['String']['input']>;
  followUpInstructions?: InputMaybe<Scalars['String']['input']>;
  treatmentGiven?: InputMaybe<Scalars['String']['input']>;
};

export type DispatchAmbulanceInput = {
  ambulanceId: Scalars['String']['input'];
  destination?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  origin?: InputMaybe<Scalars['String']['input']>;
  patientId?: InputMaybe<Scalars['String']['input']>;
  tripType?: InputMaybe<Scalars['String']['input']>;
};

/** One hand-over of drugs to a patient. Creating it decrements stock. */
export type Dispense = {
  __typename?: 'Dispense';
  /** Creation timestamp (RFC3339). */
  createdAt: Maybe<Scalars['String']['output']>;
  /** Dispense date (YYYY-MM-DD). */
  date: Scalars['String']['output'];
  /** Linked encounter UUID; blank for counter sales to registered patients. */
  encounterId: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Dispensed lines. */
  items: Array<DispenseItem>;
  /** Notes. */
  notes: Maybe<Scalars['String']['output']>;
  /** Patient UUID. */
  patientId: Scalars['String']['output'];
  /** Patient MRN. */
  patientMrn: Scalars['String']['output'];
  /** Patient display name. */
  patientName: Scalars['String']['output'];
  /** Total value of the dispense. */
  totalAmount: Scalars['Float']['output'];
};

/** One drug line handed over on a dispense; name/price frozen at hand-over. */
export type DispenseItem = {
  __typename?: 'DispenseItem';
  /** Line amount. */
  amount: Scalars['Float']['output'];
  /** Drug UUID. */
  drugId: Scalars['String']['output'];
  /** Drug name at hand-over. */
  drugName: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Units dispensed. */
  qty: Scalars['Float']['output'];
  /** Price per unit at hand-over. */
  unitPrice: Scalars['Float']['output'];
};

export type DispenseItemInput = {
  drugId: Scalars['String']['input'];
  qty: Scalars['Float']['input'];
};

/** A driver's day sheet: which vehicle they signed on to and when. */
export type DriverAttendance = {
  __typename?: 'DriverAttendance';
  /** HH:MM. */
  checkInAt: Maybe<Scalars['String']['output']>;
  checkOutAt: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  /** YYYY-MM-DD. */
  date: Scalars['String']['output'];
  employeeId: Scalars['String']['output'];
  employeeName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** present | absent | leave. */
  status: Scalars['String']['output'];
  vehicleId: Maybe<Scalars['String']['output']>;
  vehicleNumber: Maybe<Scalars['String']['output']>;
};

export type DriverAttendanceInput = {
  checkInAt?: InputMaybe<Scalars['String']['input']>;
  checkOutAt?: InputMaybe<Scalars['String']['input']>;
  date: Scalars['String']['input'];
  employeeId: Scalars['String']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
  vehicleId?: InputMaybe<Scalars['String']['input']>;
};

/** A pharmacy catalog entry with live stock. */
export type Drug = {
  __typename?: 'Drug';
  /** Whether the drug is dispensable. */
  active: Scalars['Boolean']['output'];
  /** Form: tablet | capsule | syrup | injection | ointment | drops | other. */
  form: Scalars['String']['output'];
  /** Generic (INN) name. */
  genericName: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Brand/display name, unique within the tenant. */
  name: Scalars['String']['output'];
  /** Stock level that should trigger a re-order. */
  reorderLevel: Scalars['Float']['output'];
  /** Units currently in stock. */
  stockQty: Scalars['Float']['output'];
  /** Strength, e.g. 500mg. */
  strength: Maybe<Scalars['String']['output']>;
  /** What one stock count means (tablet, bottle, vial). */
  unit: Scalars['String']['output'];
  /** Selling price per unit. */
  unitPrice: Scalars['Float']['output'];
};

/** A received lot of a drug with its own expiry and remaining quantity (FEFO). */
export type DrugBatch = {
  __typename?: 'DrugBatch';
  batchNo: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  drugId: Scalars['String']['output'];
  drugName: Maybe<Scalars['String']['output']>;
  expiryDate: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  qty: Scalars['Float']['output'];
  receivedFromPoId: Maybe<Scalars['String']['output']>;
  unitCost: Scalars['Float']['output'];
};

/** One dated shift assignment for an employee. */
export type DutyRoster = {
  __typename?: 'DutyRoster';
  createdAt: Maybe<Scalars['String']['output']>;
  /** Shift date (YYYY-MM-DD). */
  date: Scalars['String']['output'];
  /** Employee (Employee) UUID. */
  employeeId: Scalars['String']['output'];
  /** Employee display name. */
  employeeName: Scalars['String']['output'];
  /** Shift end (HH:MM, 24h). */
  endTime: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Ward / desk / department, free text. */
  location: Maybe<Scalars['String']['output']>;
  notes: Maybe<Scalars['String']['output']>;
  /** Shift label: Morning | Evening | Night | custom. */
  shiftName: Maybe<Scalars['String']['output']>;
  /** Shift start (HH:MM, 24h). */
  startTime: Scalars['String']['output'];
};

/** One shift row within a bulkSetDutyRoster call. */
export type DutyRosterShiftInput = {
  date: Scalars['String']['input'];
  employeeId: Scalars['String']['input'];
  endTime: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  shiftName?: InputMaybe<Scalars['String']['input']>;
  startTime: Scalars['String']['input'];
};

/** Why a tenant can or cannot currently send email. */
export type EmailSendStatus = {
  __typename?: 'EmailSendStatus';
  /** Super-admin capability switch for this tenant. */
  allowed: Scalars['Boolean']['output'];
  /** allowed && enabled && transportConfigured. */
  canSend: Scalars['Boolean']['output'];
  /** The tenant admin's own on/off toggle. */
  enabled: Scalars['Boolean']['output'];
  /** Whether a usable SMTP transport exists (own or the platform fallback). */
  transportConfigured: Scalars['Boolean']['output'];
};

/**
 * A tenant's outbound email (SMTP) configuration. The stored password is never
 * returned — only whether one is set (hasPassword).
 */
export type EmailSettings = {
  __typename?: 'EmailSettings';
  /** Whether this tenant's own sending is switched on. */
  enabled: Scalars['Boolean']['output'];
  /** From address used as the envelope sender. */
  fromEmail: Scalars['String']['output'];
  /** Display name on the From header. */
  fromName: Scalars['String']['output'];
  /** Whether an SMTP password is stored (the value itself is never exposed). */
  hasPassword: Scalars['Boolean']['output'];
  /** SMTP server hostname. */
  smtpHost: Scalars['String']['output'];
  /** SMTP server port (587 STARTTLS, 465 implicit TLS). */
  smtpPort: Scalars['Int']['output'];
  /** SMTP auth username. */
  smtpUsername: Scalars['String']['output'];
  /** Whether to use implicit TLS (port 465) instead of STARTTLS. */
  useTls: Scalars['Boolean']['output'];
};

/** An employee of the institution, linked to a user account. */
export type Employee = {
  __typename?: 'Employee';
  /** Residential address. */
  address: Maybe<Scalars['String']['output']>;
  /** ABO blood group (e.g. O+). */
  bloodGroup: Maybe<Scalars['String']['output']>;
  /** City of residence. */
  city: Maybe<Scalars['String']['output']>;
  /** Date of birth in YYYY-MM-DD format. */
  dateOfBirth: Maybe<Scalars['String']['output']>;
  /** Department the employee belongs to. */
  department: Maybe<Department>;
  /** Job title or designation (e.g. Associate Professor). */
  designation: Maybe<Scalars['String']['output']>;
  /** Name of the emergency contact person. */
  emergencyName: Maybe<Scalars['String']['output']>;
  /** Phone number of the emergency contact. */
  emergencyPhone: Maybe<Scalars['String']['output']>;
  /** Internal employee ID / badge number. */
  employeeId: Scalars['String']['output'];
  /** Employment type: full_time | part_time | contract | visiting. */
  employmentType: Maybe<Scalars['String']['output']>;
  /** Gender: Male | Female | Other. */
  gender: Maybe<Scalars['String']['output']>;
  /** Pay grade or level (e.g. L3, Senior). */
  gradeLevel: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Date the employee joined in YYYY-MM-DD format. */
  joinDate: Maybe<Scalars['String']['output']>;
  /** Nationality. */
  nationality: Maybe<Scalars['String']['output']>;
  /** Payroll and banking details. */
  paymentDetails: Maybe<EmployeePaymentDetails>;
  /** Personal email address (different from login email). */
  personalEmail: Maybe<Scalars['String']['output']>;
  /** Contact phone number. */
  phone: Maybe<Scalars['String']['output']>;
  /** URL to the employee's profile photo. */
  photoUrl: Maybe<Scalars['String']['output']>;
  /** Postal/PIN code. */
  pincode: Maybe<Scalars['String']['output']>;
  /** Probation end date in YYYY-MM-DD format. */
  probationEndDate: Maybe<Scalars['String']['output']>;
  /** State of residence. */
  state: Maybe<Scalars['String']['output']>;
  /** Associated user account. */
  user: User;
};

/** Employee-level progress on a learning goal. */
export type EmployeeGoalProgress = {
  __typename?: 'EmployeeGoalProgress';
  /** Completion timestamp, if status = completed. */
  completedAt: Maybe<Scalars['String']['output']>;
  /** Employee UUID. */
  employeeId: Scalars['ID']['output'];
  /** Goal details. */
  goal: LearningGoal;
  /** Goal UUID. */
  goalId: Scalars['ID']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Unified list of item progress rows. */
  itemProgress: Array<ItemProgress>;
  /** Progress status: not_started | in_progress | completed. */
  status: Scalars['String']['output'];
};

/** Banking, provident fund, and tax details for payroll processing. */
export type EmployeePaymentDetails = {
  __typename?: 'EmployeePaymentDetails';
  /** Bank account number. */
  accountNumber: Maybe<Scalars['String']['output']>;
  /** Account type: savings | current. */
  accountType: Maybe<Scalars['String']['output']>;
  /** Bank name for salary credit. */
  bankName: Maybe<Scalars['String']['output']>;
  /** Bank branch name. */
  branchName: Maybe<Scalars['String']['output']>;
  /** ESI dispensary name. */
  esiDispensary: Maybe<Scalars['String']['output']>;
  /** Employee State Insurance number. */
  esiNumber: Maybe<Scalars['String']['output']>;
  /** Form 16 reference or document path. */
  form16Ref: Maybe<Scalars['String']['output']>;
  /** Whether the employee is eligible for gratuity. */
  gratuityEligible: Maybe<Scalars['Boolean']['output']>;
  /** IFSC code identifying the bank branch. */
  ifscCode: Maybe<Scalars['String']['output']>;
  /** National Pension System account number. */
  npsAccountNumber: Maybe<Scalars['String']['output']>;
  /** NPS tier: Tier-I | Tier-II. */
  npsTier: Maybe<Scalars['String']['output']>;
  /** PAN (Permanent Account Number) for tax purposes. */
  panNumber: Maybe<Scalars['String']['output']>;
  /** Employee PF contribution percentage (default 12%). */
  pfEmployeePercent: Maybe<Scalars['Float']['output']>;
  /** Employer PF contribution percentage (default 12%). */
  pfEmployerPercent: Maybe<Scalars['Float']['output']>;
  /** Provident Fund member number. */
  pfNumber: Maybe<Scalars['String']['output']>;
  /** Income tax regime: old | new. */
  taxRegime: Maybe<Scalars['String']['output']>;
  /** Universal Account Number for PF. */
  uanNumber: Maybe<Scalars['String']['output']>;
};

/** One clinical visit (OPD): complaint, findings, vitals, and prescription. May link back to the appointment that produced it. */
export type Encounter = {
  __typename?: 'Encounter';
  /** Linked appointment UUID; blank for walk-ins. */
  appointmentId: Maybe<Scalars['String']['output']>;
  /** Presenting complaint. */
  chiefComplaint: Maybe<Scalars['String']['output']>;
  /** Clinician (Employee) UUID. Blank when the clinician left the organisation. */
  clinicianId: Scalars['String']['output'];
  /** Clinician display name. */
  clinicianName: Scalars['String']['output'];
  /** Per-visit Case Record number. Server-assigned on creation. */
  crNumber: Maybe<Scalars['String']['output']>;
  /** Creation timestamp (RFC3339). */
  createdAt: Maybe<Scalars['String']['output']>;
  /** Clinician's diagnosis. */
  diagnosis: Maybe<Scalars['String']['output']>;
  /** Follow-up date (YYYY-MM-DD). */
  followUpDate: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Clinical notes. */
  notes: Maybe<Scalars['String']['output']>;
  /** Patient allergies, surfaced for safety. */
  patientAllergies: Maybe<Scalars['String']['output']>;
  /** Patient UUID. */
  patientId: Scalars['String']['output'];
  /** Patient MRN. */
  patientMrn: Scalars['String']['output'];
  /** Patient display name. */
  patientName: Scalars['String']['output'];
  /** Prescription text. */
  prescription: Maybe<Scalars['String']['output']>;
  /** Status: open | closed. */
  status: Scalars['String']['output'];
  /** Visit date (YYYY-MM-DD). */
  visitDate: Scalars['String']['output'];
  /** Visit type: opd. */
  visitType: Scalars['String']['output'];
  /** Vitals as a JSON object string (bp, pulse, temp_c, spo2, weight_kg). */
  vitals: Maybe<Scalars['String']['output']>;
};

/** A tenant-defined event category that supplements the built-in defaults. */
export type EventCategory = {
  __typename?: 'EventCategory';
  /** Hex color for calendar display (e.g. #FF5733). */
  color: Maybe<Scalars['String']['output']>;
  /** Optional notes about the category. */
  description: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Display name (e.g. Workshop). */
  name: Scalars['String']['output'];
  /** Stable slug stored on an event's category field. */
  slug: Scalars['String']['output'];
};

/** A college calendar event (holiday, exam, cultural programme, etc.). */
export type EventItem = {
  __typename?: 'EventItem';
  /** Category: holiday | exam | cultural | sports | other. */
  category: Scalars['String']['output'];
  /** Hex color for calendar display (e.g. #FF5733). */
  color: Maybe<Scalars['String']['output']>;
  /** UUID of the user who created this event. */
  createdBy: Maybe<Scalars['String']['output']>;
  /** Event description. */
  description: Maybe<Scalars['String']['output']>;
  /** Event end date (YYYY-MM-DD). */
  endDate: Scalars['String']['output'];
  /** Event start date (YYYY-MM-DD). */
  eventDate: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether the event is visible to all roles. */
  isPublic: Scalars['Boolean']['output'];
  /** Venue or location. */
  location: Maybe<Scalars['String']['output']>;
  /** Event title. */
  title: Scalars['String']['output'];
};

/** An exam schedule grouping multiple exams into a schedule window. */
export type ExamSchedule = {
  __typename?: 'ExamSchedule';
  /** Academic year UUID. */
  academicYearId: Maybe<Scalars['String']['output']>;
  /** Schedule end date (YYYY-MM-DD). */
  endDate: Maybe<Scalars['String']['output']>;
  /** Exam type: internal | external | practical. */
  examType: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Instructions for students. */
  instructions: Maybe<Scalars['String']['output']>;
  /** Schedule name (e.g. Mid-Sem Nov 2024). */
  name: Scalars['String']['output'];
  /** Whether this schedule is published/visible to students. */
  published: Scalars['Boolean']['output'];
  /** Applicable semester number. */
  semesterNumber: Maybe<Scalars['Int']['output']>;
  /** Schedule start date (YYYY-MM-DD). */
  startDate: Maybe<Scalars['String']['output']>;
};

/** A reusable, department-scoped assessment definition that populates the marks assessment-type dropdown. */
export type ExamType = {
  __typename?: 'ExamType';
  /** Whether this exam type is active and shown in dropdowns. */
  active: Scalars['Boolean']['output'];
  /** Creation timestamp (RFC3339). */
  createdAt: Maybe<Scalars['String']['output']>;
  /** Owning department, when scoped to one. */
  department: Maybe<Department>;
  /** Owning department UUID. Null/blank means available to every department. */
  departmentId: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Default max marks pre-filled when this exam is picked for a mark. */
  maxMarks: Scalars['Float']['output'];
  /** Display name (e.g. Mid Semester, Internal 1, Assignment). */
  name: Scalars['String']['output'];
  /** Percent contribution to the final grade (0 = unset). */
  weightage: Maybe<Scalars['Float']['output']>;
};

/**
 * An optional facility charge (Transport, Hostel, Mess…) that admins attach
 * to individual students on top of their base course fee. Attach/remove per
 * course year — no separate fee structure needed.
 */
export type FeeAddOn = {
  __typename?: 'FeeAddOn';
  /** Charge per course year. */
  amountPerYear: Scalars['Float']['output'];
  /** Short unique code. */
  code: Scalars['String']['output'];
  /** Optional description. */
  description: Maybe<Scalars['String']['output']>;
  /** Fee category object. */
  feeCategory: Maybe<FeeCategory>;
  /** Fee category UUID this add-on bills under. */
  feeCategoryId: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether this add-on can currently be attached. */
  isActive: Scalars['Boolean']['output'];
  /** Kind: other | transport | hostel. transport/hostel auto-attach on allocation. */
  kind: Scalars['String']['output'];
  /** Add-on name (e.g. College Bus, Hostel Room). */
  name: Scalars['String']['output'];
  /** Number of student-fee attachments. */
  studentCount: Scalars['Int']['output'];
};

/**
 * An allocation applies a course fee structure to students with a payment
 * schedule: all at once, yearly, or semester-wise. Installments are
 * auto-generated from the structure's per-year amounts and stay editable until
 * payments exist. Creating an allocation materializes student fee records.
 */
export type FeeAllocation = {
  __typename?: 'FeeAllocation';
  /** The source structure. */
  feeStructure: Maybe<FeeStructure>;
  /** Fee structure UUID. */
  feeStructureId: Scalars['String']['output'];
  /** Payment frequency: one_time | yearly | semester. */
  frequency: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Installment schedule. */
  installments: Array<FeeAllocationInstallment>;
  /** Whether this allocation is active. */
  isActive: Scalars['Boolean']['output'];
  /** Allocation name. */
  name: Scalars['String']['output'];
  /** Number of student fee records generated. */
  studentCount: Scalars['Int']['output'];
  /** UUID of the target entity. */
  targetId: Scalars['String']['output'];
  /** Display name of the target. */
  targetName: Scalars['String']['output'];
  /** Allocation target: course | batch | student. */
  targetType: Scalars['String']['output'];
  /** Total payable under this allocation. */
  totalAmount: Scalars['Float']['output'];
};

/** One slot of an allocation's payment schedule. */
export type FeeAllocationInstallment = {
  __typename?: 'FeeAllocationInstallment';
  /** Installment amount. */
  amount: Scalars['Float']['output'];
  /** Due date (YYYY-MM-DD). */
  dueDate: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Label (e.g. Year 1, Semester 3, Full Payment). */
  label: Scalars['String']['output'];
  /** Order of the installment (1-based). */
  sequence: Scalars['Int']['output'];
  /** Course year this slot belongs to (0 = n/a). */
  yearNumber: Scalars['Int']['output'];
};

/** One installment override for an allocation schedule. */
export type FeeAllocationInstallmentInput = {
  /** Amount. All installments must sum to the structure total. */
  amount: Scalars['Float']['input'];
  /** Due date (YYYY-MM-DD). */
  dueDate?: InputMaybe<Scalars['String']['input']>;
  /** Label (e.g. Year 1). */
  label: Scalars['String']['input'];
  /** Course year this slot belongs to (0 = n/a). */
  yearNumber?: InputMaybe<Scalars['Int']['input']>;
};

/** A master fee code (e.g. Tuition, Transport, Food, Hostel). */
export type FeeCategory = {
  __typename?: 'FeeCategory';
  /** Short code (e.g. TUITION, TRANSPORT). */
  code: Scalars['String']['output'];
  /** Optional description. */
  description: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether this category is currently active. */
  isActive: Scalars['Boolean']['output'];
  /** Category name. */
  name: Scalars['String']['output'];
};

/** High-level fee collection summary. */
export type FeeCollectionSummary = {
  __typename?: 'FeeCollectionSummary';
  /** Number of payments recorded. */
  paymentCount: Scalars['Int']['output'];
  /** Total outstanding across all student fees. */
  pendingDues: Scalars['Float']['output'];
  /** Total amount collected. */
  totalCollected: Scalars['Float']['output'];
  /** Total net payable across all student fees. */
  totalExpected: Scalars['Float']['output'];
};

/** Per-course collection row for the fees overview. */
export type FeeCourseRow = {
  __typename?: 'FeeCourseRow';
  /** Total collected for the course. */
  collected: Scalars['Float']['output'];
  /** Course UUID. */
  courseId: Scalars['String']['output'];
  /** Course name. */
  courseName: Scalars['String']['output'];
  /** Total net payable for the course. */
  expected: Scalars['Float']['output'];
  /** Outstanding for the course. */
  pending: Scalars['Float']['output'];
  /** Students with fee records in the course. */
  studentCount: Scalars['Int']['output'];
};

/** Fee collection grouped by payment mode. */
export type FeeModeRow = {
  __typename?: 'FeeModeRow';
  /** Total amount collected via this mode. */
  amount: Scalars['Float']['output'];
  /** Number of transactions via this mode. */
  count: Scalars['Int']['output'];
  /** Payment mode (cash | online | cheque | dd). */
  mode: Scalars['String']['output'];
};

/** Monthly fee collection row. */
export type FeeMonthRow = {
  __typename?: 'FeeMonthRow';
  /** Amount collected this month. */
  amount: Scalars['Float']['output'];
  /** Number of payments this month. */
  count: Scalars['Int']['output'];
  /** Month label (e.g. January). */
  month: Scalars['String']['output'];
};

/** Analytics payload for the fees overview tab. */
export type FeeOverview = {
  __typename?: 'FeeOverview';
  /** Collection broken down by course. */
  byCourse: Array<FeeCourseRow>;
  /** Collection broken down by payment mode. */
  byMode: Array<FeeModeRow>;
  /** Monthly collection trend. */
  byMonth: Array<FeeMonthRow>;
  /** Most recent payments. */
  recentPayments: Array<FeePayment>;
  /** Headline totals. */
  summary: FeeCollectionSummary;
};

/** A recorded payment against a student fee. */
export type FeePayment = {
  __typename?: 'FeePayment';
  /** Amount paid. */
  amount: Scalars['Float']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Specific installment paid (null = applied oldest-first). */
  installmentId: Maybe<Scalars['String']['output']>;
  /** Payment date (YYYY-MM-DD). */
  paymentDate: Scalars['String']['output'];
  /** Payment mode: cash | online | cheque | dd. */
  paymentMode: Scalars['String']['output'];
  /** System-generated receipt number. */
  receiptNumber: Scalars['String']['output'];
  /** UUID of the staff who received the payment. */
  receivedBy: Maybe<Scalars['String']['output']>;
  /** Internal remarks. */
  remarks: Maybe<Scalars['String']['output']>;
  /** paid | cancelled. */
  status: Scalars['String']['output'];
  /** Student object. */
  student: Maybe<Student>;
  /** Student fee object. */
  studentFee: Maybe<StudentFee>;
  /** Student fee UUID. */
  studentFeeId: Scalars['String']['output'];
  /** Student UUID. */
  studentId: Scalars['String']['output'];
  /** Bank transaction reference or cheque number. */
  transactionRef: Maybe<Scalars['String']['output']>;
};

/** Fee collection grouped by fee plan. */
export type FeePlanReportRow = {
  __typename?: 'FeePlanReportRow';
  /** Total collected under this plan. */
  amount: Scalars['Float']['output'];
  /** Number of payments under this plan. */
  count: Scalars['Int']['output'];
  /** Fee plan name. */
  plan: Scalars['String']['output'];
};

/** Fee collection report. */
export type FeeReportResult = {
  __typename?: 'FeeReportResult';
  /** Breakdown by payment mode. */
  byPaymentMode: Array<FeeModeRow>;
  /** Breakdown by fee plan. */
  byPlan: Array<FeePlanReportRow>;
  /** Monthly collection trend. */
  monthlyTrend: Array<FeeMonthRow>;
  /** Total payment transactions. */
  paymentCount: Scalars['Int']['output'];
  /** Total amount collected. */
  totalCollected: Scalars['Float']['output'];
};

/**
 * One fee variation of a course covering the entire course duration
 * (e.g. "Regular", "NRI Quota", "2026 Scholarship"). Structures are grouped
 * by course; line items define per-year category amounts.
 */
export type FeeStructure = {
  __typename?: 'FeeStructure';
  /** Number of allocations created from this structure. */
  allocationCount: Scalars['Int']['output'];
  /** Intake batch object. */
  batch: Maybe<CourseBatch>;
  /** Optional intake batch UUID this variation is limited to. */
  batchId: Maybe<Scalars['String']['output']>;
  /** Short unique code. */
  code: Scalars['String']['output'];
  /** Course object. */
  course: Maybe<Course>;
  /** Course UUID this structure belongs to. */
  courseId: Scalars['String']['output'];
  /** Optional description. */
  description: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether this structure is active. */
  isActive: Scalars['Boolean']['output'];
  /** Per-year line items. */
  items: Array<FeeStructureItem>;
  /** Variation name (e.g. Regular, NRI Quota, Merit Scholarship). */
  name: Scalars['String']['output'];
  /** Total payable across the whole course duration. */
  totalAmount: Scalars['Float']['output'];
  /** Per-year totals. */
  yearTotals: Array<FeeYearTotal>;
};

/** One line of a fee structure: a category amount for one course year. */
export type FeeStructureItem = {
  __typename?: 'FeeStructureItem';
  /** Amount for this category in this year. */
  amount: Scalars['Float']['output'];
  /** Fee category object. */
  feeCategory: Maybe<FeeCategory>;
  /** Fee category UUID. */
  feeCategoryId: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Course year this amount belongs to (1-based). */
  yearNumber: Scalars['Int']['output'];
};

/** One per-year line item of a fee structure. */
export type FeeStructureItemInput = {
  /** Amount. */
  amount: Scalars['Float']['input'];
  /** Fee category UUID. */
  feeCategoryId: Scalars['String']['input'];
  /** Course year (1-based). */
  yearNumber: Scalars['Int']['input'];
};

/** Total fee amount of one course year within a structure. */
export type FeeYearTotal = {
  __typename?: 'FeeYearTotal';
  /** Sum of item amounts for the year. */
  amount: Scalars['Float']['output'];
  /** Course year (1-based). */
  yearNumber: Scalars['Int']['output'];
};

/** A computed P&L or balance sheet: titled sections with a headline total. */
export type FinancialStatement = {
  __typename?: 'FinancialStatement';
  asOf: Maybe<Scalars['String']['output']>;
  balanced: Scalars['Boolean']['output'];
  from: Maybe<Scalars['String']['output']>;
  sections: Array<StatementSection>;
  title: Scalars['String']['output'];
  to: Maybe<Scalars['String']['output']>;
  total: Scalars['Float']['output'];
};

/** Result of calendar auto-generation. */
export type GenerateCalendarResult = {
  __typename?: 'GenerateCalendarResult';
  created: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};

/** Input for generating a payroll record for a month. */
export type GeneratePayrollInput = {
  /** Employee UUID. */
  employeeId: Scalars['ID']['input'];
  /** Leave days taken. */
  leaveDays: Scalars['Int']['input'];
  /** Month (1–12). */
  month: Scalars['Int']['input'];
  /** Optional internal notes. */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Days the employee was present. */
  presentDays: Scalars['Int']['input'];
  /** Total working days in the month. */
  workingDays: Scalars['Int']['input'];
  /** Year (e.g. 2025). */
  year: Scalars['Int']['input'];
};

export type GenerateQuestionPaperInput = {
  /** Marks target per difficulty bucket. Omit to let the generator spread freely. */
  byDifficulty?: InputMaybe<Array<DifficultyMarksInput>>;
  /** Curriculum subject to draw questions from. */
  curriculumSubjectId: Scalars['ID']['input'];
  /** Exam duration in minutes. */
  durationMinutes?: InputMaybe<Scalars['Int']['input']>;
  /** Exam type (assessment definition) to link. */
  examTypeId?: InputMaybe<Scalars['String']['input']>;
  /** Instructions to print above the questions. */
  instructions?: InputMaybe<Scalars['String']['input']>;
  /** Seed for reproducible generation. Omit for a fresh random set. */
  seed?: InputMaybe<Scalars['Int']['input']>;
  /** Paper title. */
  title: Scalars['String']['input'];
  /** Target total marks. */
  totalMarks: Scalars['Float']['input'];
  /** Desired question count per shape. */
  typeMix?: InputMaybe<Array<TypeCountInput>>;
  /** Restrict to these syllabus units. Omit for the whole syllabus. */
  units?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Department assignment of a learning goal. */
export type GoalAssignmentItem = {
  __typename?: 'GoalAssignmentItem';
  /** Creation timestamp. */
  createdAt: Scalars['String']['output'];
  /** Department details. */
  department: Department;
  /** Department UUID. */
  departmentId: Scalars['ID']['output'];
  /** Goal details. */
  goal: LearningGoal;
  /** Goal UUID. */
  goalId: Scalars['ID']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
};

/** One row of the grade scale: a percentage range mapped to a letter and grade point. */
export type GradeBand = {
  __typename?: 'GradeBand';
  gradePoint: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  isPass: Scalars['Boolean']['output'];
  letter: Scalars['String']['output'];
  maxPercent: Scalars['Float']['output'];
  minPercent: Scalars['Float']['output'];
  sortOrder: Scalars['Int']['output'];
};

/** One grade band to save (bands are replaced wholesale on each save). */
export type GradeBandInput = {
  gradePoint: Scalars['Float']['input'];
  isPass: Scalars['Boolean']['input'];
  letter: Scalars['String']['input'];
  maxPercent: Scalars['Float']['input'];
  minPercent: Scalars['Float']['input'];
  sortOrder: Scalars['Int']['input'];
};

/** Grade count row for the marks report. */
export type GradeRow = {
  __typename?: 'GradeRow';
  /** Number of students who received this grade. */
  count: Scalars['Int']['output'];
  /** Grade label (e.g. A, B+, F). */
  grade: Scalars['String']['output'];
};

/** Per-tenant grading configuration: how subject marks become semester and cumulative results. */
export type GradingScheme = {
  __typename?: 'GradingScheme';
  /** Grade scale rows, ascending by sortOrder. */
  bands: Array<GradeBand>;
  /** Average grade points weighted by each subject's credits. */
  creditWeighted: Scalars['Boolean']['output'];
  /** Decimal places used when rounding SGPA / CGPA / percentage. */
  decimals: Scalars['Int']['output'];
  /** Top grade point on the scale (e.g. 10 or 4). */
  gpaMax: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  /** Primary metric reported: cgpa | gpa | percentage | letter | pass_fail. */
  mode: Scalars['String']['output'];
  /** Minimum subject percentage required to pass. */
  passThreshold: Scalars['Float']['output'];
  /** Combine a subject's assessments using matched exam-type weightages. */
  weightedByExamType: Scalars['Boolean']['output'];
};

/** A student's admit card for one exam schedule. */
export type HallTicket = {
  __typename?: 'HallTicket';
  /** Creation timestamp (RFC3339). */
  createdAt: Maybe<Scalars['String']['output']>;
  /** Whether the student cleared the eligibility check. */
  eligible: Scalars['Boolean']['output'];
  /** Exam centre / venue. */
  examCenter: Maybe<Scalars['String']['output']>;
  /** The exam schedule itself, when loaded. */
  examSchedule: Maybe<ExamSchedule>;
  /** Exam schedule this ticket admits the student to. */
  examScheduleId: Scalars['ID']['output'];
  /** Why the ticket is on hold, when it is. */
  holdReason: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Issue date (YYYY-MM-DD). */
  issuedOn: Maybe<Scalars['String']['output']>;
  /** Signed verify URL encoded into the printed QR code. */
  qrPayload: Scalars['String']['output'];
  /** Assigned seat, when seating has been allotted. */
  seatNumber: Maybe<Scalars['String']['output']>;
  /** issued | held | revoked. */
  status: Scalars['String']['output'];
  /** The student, when loaded. */
  student: Maybe<Student>;
  /** Student UUID. */
  studentId: Scalars['ID']['output'];
  /** Human-readable ticket number, HT-000123, unique per tenant. */
  ticketNumber: Scalars['String']['output'];
};

/** Outcome of a bulk hall-ticket issue run. */
export type HallTicketIssueResult = {
  __typename?: 'HallTicketIssueResult';
  /** Students stored as held because they failed the eligibility check. */
  held: Scalars['Int']['output'];
  /** Tickets issued to eligible students in this run. */
  issued: Scalars['Int']['output'];
  /** Students that already had a ticket for this schedule. */
  skipped: Scalars['Int']['output'];
  /** Every ticket for the schedule after the run. */
  tickets: Array<HallTicket>;
};

/** A holiday entry on the institutional calendar. */
export type Holiday = {
  __typename?: 'Holiday';
  academicYearId: Scalars['String']['output'];
  autoGen: Scalars['Boolean']['output'];
  date: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

/** An active or past hostel allocation for a student. */
export type HostelAllocation = {
  __typename?: 'HostelAllocation';
  allocDate: Scalars['String']['output'];
  bedNumber: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  room: Maybe<HostelRoom>;
  roomId: Scalars['String']['output'];
  status: Scalars['String']['output'];
  student: Maybe<Student>;
  studentId: Scalars['String']['output'];
  vacateDate: Maybe<Scalars['String']['output']>;
};

/** A hostel block (building). */
export type HostelBlock = {
  __typename?: 'HostelBlock';
  floors: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

/** A room within a hostel block. */
export type HostelRoom = {
  __typename?: 'HostelRoom';
  annualRate: Scalars['Float']['output'];
  block: Maybe<HostelBlock>;
  blockId: Scalars['String']['output'];
  capacity: Scalars['Int']['output'];
  /** Effective rate after resolving override -> class -> legacy monthly fee. */
  effectiveRateType: Scalars['String']['output'];
  floor: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  monthlyFee: Scalars['Float']['output'];
  monthlyRate: Scalars['Float']['output'];
  occupied: Scalars['Int']['output'];
  rateAmount: Maybe<Scalars['Float']['output']>;
  /** Per-room override rate type (monthly, semester, annual). Null means inherit the class rate. */
  rateType: Maybe<Scalars['String']['output']>;
  roomClass: Maybe<RoomClass>;
  roomClassId: Maybe<Scalars['String']['output']>;
  roomNumber: Scalars['String']['output'];
  roomType: Scalars['String']['output'];
  semesterRate: Scalars['Float']['output'];
  status: Scalars['String']['output'];
};

/** A reimbursement claim for a patient's care. */
export type InsuranceClaim = {
  __typename?: 'InsuranceClaim';
  admissionId: Maybe<Scalars['String']['output']>;
  approvedAmount: Scalars['Float']['output'];
  claimAmount: Scalars['Float']['output'];
  claimNumber: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  diagnosis: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  invoiceId: Maybe<Scalars['String']['output']>;
  notes: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  patientMrn: Scalars['String']['output'];
  patientName: Scalars['String']['output'];
  payerId: Maybe<Scalars['String']['output']>;
  payerName: Maybe<Scalars['String']['output']>;
  policyNumber: Maybe<Scalars['String']['output']>;
  settledAt: Maybe<Scalars['String']['output']>;
  /** Status: draft | submitted | under_review | approved | rejected | settled. */
  status: Scalars['String']['output'];
  submittedAt: Maybe<Scalars['String']['output']>;
};

/** An insurer or TPA the hospital bills claims to. */
export type InsurancePayer = {
  __typename?: 'InsurancePayer';
  active: Scalars['Boolean']['output'];
  code: Scalars['String']['output'];
  contactName: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  payerType: Scalars['String']['output'];
  phone: Maybe<Scalars['String']['output']>;
};

/** A stocked line in the central store. */
export type InventoryItem = {
  __typename?: 'InventoryItem';
  active: Scalars['Boolean']['output'];
  category: Scalars['String']['output'];
  code: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  linkedDrugId: Maybe<Scalars['String']['output']>;
  linkedDrugName: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  reorderLevel: Scalars['Float']['output'];
  stockQty: Scalars['Float']['output'];
  unit: Scalars['String']['output'];
  unitCost: Scalars['Float']['output'];
};

/** Outcome of issuing a password-setup invite. */
export type InviteResult = {
  __typename?: 'InviteResult';
  /** When the link stops working (RFC3339). */
  expiresAt: Scalars['String']['output'];
  /** The accept link (always present so it can be copied manually). */
  link: Scalars['String']['output'];
  /** Whether the invite email was actually delivered. */
  sent: Scalars['Boolean']['output'];
};

/** A patient bill: line items, discount, payments, and a derived status. */
export type Invoice = {
  __typename?: 'Invoice';
  /** Total received so far. */
  amountPaid: Scalars['Float']['output'];
  /** Creation timestamp (RFC3339). */
  createdAt: Maybe<Scalars['String']['output']>;
  /** Invoice date (YYYY-MM-DD). */
  date: Scalars['String']['output'];
  /** Flat discount applied to the subtotal. */
  discount: Scalars['Float']['output'];
  /** The linked encounter's Case Record number, when billed from a visit. */
  encounterCrNumber: Maybe<Scalars['String']['output']>;
  /** Linked encounter UUID; blank when billed directly. */
  encounterId: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Human-facing number, unique per tenant (INV-00001). */
  invoiceNo: Scalars['String']['output'];
  /** Charged lines. */
  items: Array<InvoiceItem>;
  /** Notes. */
  notes: Maybe<Scalars['String']['output']>;
  /** Patient UUID. */
  patientId: Scalars['String']['output'];
  /** Patient MRN. */
  patientMrn: Scalars['String']['output'];
  /** Patient display name. */
  patientName: Scalars['String']['output'];
  /** Patient's lifetime UHID, surfaced for printing on the invoice. */
  patientUhid: Maybe<Scalars['String']['output']>;
  /** Payments received. */
  payments: Array<InvoicePayment>;
  /** Status: unpaid | partially_paid | paid | cancelled. */
  status: Scalars['String']['output'];
  /** Sum of line amounts. */
  subtotal: Scalars['Float']['output'];
  /** Amount owed (subtotal − discount). */
  total: Scalars['Float']['output'];
};

/** One charged line on an invoice. Description and price are frozen at billing time. */
export type InvoiceItem = {
  __typename?: 'InvoiceItem';
  /** Line amount (qty × unitPrice). */
  amount: Scalars['Float']['output'];
  /** Line description. */
  description: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Quantity. */
  qty: Scalars['Float']['output'];
  /** Source catalog service UUID; blank for free-text lines. */
  serviceId: Maybe<Scalars['String']['output']>;
  /** Price per unit at billing time. */
  unitPrice: Scalars['Float']['output'];
};

export type InvoiceItemInput = {
  /** Line description. Defaults to the service name when serviceId is given. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Quantity (default 1). */
  qty?: InputMaybe<Scalars['Float']['input']>;
  /** Catalog service UUID; omit for a free-text line. */
  serviceId?: InputMaybe<Scalars['String']['input']>;
  /** Price per unit. Defaults to the service's catalog price. */
  unitPrice?: InputMaybe<Scalars['Float']['input']>;
};

/** Money received against an invoice. */
export type InvoicePayment = {
  __typename?: 'InvoicePayment';
  /** Amount received. */
  amount: Scalars['Float']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Invoice UUID. */
  invoiceId: Scalars['String']['output'];
  /** Mode: cash | card | upi | online | cheque. */
  mode: Scalars['String']['output'];
  /** When the money was received (RFC3339). */
  paidAt: Maybe<Scalars['String']['output']>;
  /** External reference (transaction id, cheque no). */
  reference: Maybe<Scalars['String']['output']>;
};

export type IssueHallTicketsInput = {
  /** Hold students who have outstanding fee dues. */
  checkFeeDues?: InputMaybe<Scalars['Boolean']['input']>;
  /** Restrict to one course. Omit to cover every course in the schedule's semester. */
  courseId?: InputMaybe<Scalars['String']['input']>;
  /** Exam centre printed on every ticket. */
  examCenter?: InputMaybe<Scalars['String']['input']>;
  /** Exam schedule to issue tickets for. */
  examScheduleId: Scalars['ID']['input'];
  /** Hold students below this attendance percentage. Omit to skip the check. */
  minAttendancePercent?: InputMaybe<Scalars['Float']['input']>;
  /** Seat-number prefix; seats are numbered sequentially from 1. */
  seatPrefix?: InputMaybe<Scalars['String']['input']>;
  /** Override the schedule's semester number. */
  semesterNumber?: InputMaybe<Scalars['Int']['input']>;
};

export type IssueLibraryBookInput = {
  bookId: Scalars['String']['input'];
  dueDate: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

/** Progress on a single unit or assignment. */
export type ItemProgress = {
  __typename?: 'ItemProgress';
  /** Completion timestamp. */
  completedAt: Maybe<Scalars['String']['output']>;
  /** Unique identifier of the progress row. */
  id: Scalars['ID']['output'];
  /** Underlying unit or assignment UUID. */
  itemId: Scalars['ID']['output'];
  /** Discriminator: unit | assignment. */
  itemType: Scalars['String']['output'];
  /** Assignment score if applicable. */
  score: Maybe<Scalars['Float']['output']>;
  /** Status — pending | completed (unit) | pending | passed | failed (assignment). */
  status: Scalars['String']['output'];
};

/** A lab order: one or more tests for a patient, optionally tied to an encounter. */
export type LabOrder = {
  __typename?: 'LabOrder';
  createdAt: Maybe<Scalars['String']['output']>;
  encounterId: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  items: Array<LabOrderItem>;
  notes: Maybe<Scalars['String']['output']>;
  orderDate: Scalars['String']['output'];
  orderedById: Maybe<Scalars['String']['output']>;
  orderedByName: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  patientMrn: Scalars['String']['output'];
  patientName: Scalars['String']['output'];
  /** Status: ordered | collected | resulted | cancelled. */
  status: Scalars['String']['output'];
  totalPrice: Scalars['Float']['output'];
};

/** One test line on a lab order, with its frozen catalog snapshot and result. */
export type LabOrderItem = {
  __typename?: 'LabOrderItem';
  /** Flag: normal | high | low | abnormal (blank until resulted). */
  flag: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  price: Scalars['Float']['output'];
  refHigh: Scalars['Float']['output'];
  refLow: Scalars['Float']['output'];
  refText: Maybe<Scalars['String']['output']>;
  resultValue: Maybe<Scalars['String']['output']>;
  resultedAt: Maybe<Scalars['String']['output']>;
  testCode: Scalars['String']['output'];
  testId: Scalars['String']['output'];
  testName: Scalars['String']['output'];
  unit: Maybe<Scalars['String']['output']>;
};

export type LabOrderItemInput = {
  testId: Scalars['String']['input'];
};

export type LabResultInput = {
  itemId: Scalars['ID']['input'];
  resultValue: Scalars['String']['input'];
};

/** A catalog lab test the lab can order and result. */
export type LabTest = {
  __typename?: 'LabTest';
  active: Scalars['Boolean']['output'];
  category: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Assay/technique used, e.g. ELISA. */
  method: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** Order-set grouping (CBC, LFT, KFT, …); independent of category. */
  panel: Maybe<Scalars['String']['output']>;
  price: Scalars['Float']['output'];
  refHigh: Scalars['Float']['output'];
  /** Numeric reference bounds; when both are 0 the test is qualitative. */
  refLow: Scalars['Float']['output'];
  refText: Maybe<Scalars['String']['output']>;
  /** Sample type: blood | urine | stool | swab | other. */
  sampleType: Scalars['String']['output'];
  unit: Maybe<Scalars['String']['output']>;
};

/** A named learning goal (course/training) assignable to departments. */
export type LearningGoal = {
  __typename?: 'LearningGoal';
  /** Creation timestamp. */
  createdAt: Scalars['String']['output'];
  /** Optional long-form description. */
  description: Maybe<Scalars['String']['output']>;
  /** Optional due date (YYYY-MM-DD). */
  dueDate: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether completion is mandatory. */
  isMandatory: Scalars['Boolean']['output'];
  /** Ordered list of sections. */
  sections: Array<LearningSection>;
  /** Title displayed to learners. */
  title: Scalars['String']['output'];
};

/**
 * A unified item — either a unit (content) or assignment (assessment). Fields
 * not applicable to the itemType are null.
 */
export type LearningItem = {
  __typename?: 'LearningItem';
  /** Assignment only — completion | score. */
  assessmentType: Maybe<Scalars['String']['output']>;
  /** Unit only — markdown reading material. */
  content: Maybe<Scalars['String']['output']>;
  /** Long-form description. */
  description: Maybe<Scalars['String']['output']>;
  /** Unique identifier of the underlying unit or assignment. */
  id: Scalars['ID']['output'];
  /** Discriminator: unit | assignment. */
  itemType: Scalars['String']['output'];
  /** 0-based order within the parent section (units and assignments share order). */
  orderIndex: Scalars['Int']['output'];
  /** Assignment only — passing score for score-based. */
  passScore: Maybe<Scalars['Float']['output']>;
  /** Assignment only — quiz questions in order. */
  questions: Maybe<Array<LearningQuestion>>;
  /** Parent section UUID. */
  sectionId: Scalars['ID']['output'];
  /** Display title. */
  title: Scalars['String']['output'];
  /** Unit only — none | upload | external. */
  videoType: Maybe<Scalars['String']['output']>;
  /** Unit only — resolved URL (external or storage-served). */
  videoUrl: Maybe<Scalars['String']['output']>;
};

/** A single question inside a quiz/assignment. */
export type LearningQuestion = {
  __typename?: 'LearningQuestion';
  /** Parent assignment UUID. */
  assignmentID: Scalars['ID']['output'];
  /** Correct answer indices (as strings). For true_false this is ['true'] or ['false']. */
  correctAnswers: Array<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Kind: mcq | multi | true_false. */
  kind: Scalars['String']['output'];
  /** Option labels (ignored for true_false; the client renders True/False). */
  options: Array<Scalars['String']['output']>;
  /** Order within the quiz. */
  orderIndex: Scalars['Int']['output'];
  /** Point value for the question. */
  points: Scalars['Float']['output'];
  /** Question prompt (may contain short markdown). */
  prompt: Scalars['String']['output'];
};

/** A section groups ordered units and assignments within a goal. */
export type LearningSection = {
  __typename?: 'LearningSection';
  /** Parent goal UUID. */
  goalId: Scalars['ID']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Ordered list of items (units + assignments interleaved). */
  items: Array<LearningItem>;
  /** 0-based order within the parent goal. */
  orderIndex: Scalars['Int']['output'];
  /** Section title. */
  title: Scalars['String']['output'];
};

/** Annual leave balance for a user and leave type. */
export type LeaveBalance = {
  __typename?: 'LeaveBalance';
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Associated leave type configuration. */
  leaveType: Maybe<LeaveTypeConfig>;
  /** Leave type UUID. */
  leaveTypeId: Scalars['String']['output'];
  /** Days pending approval. */
  pending: Scalars['Float']['output'];
  /** Total days allocated for this year. */
  total: Scalars['Float']['output'];
  /** Days already used. */
  used: Scalars['Float']['output'];
  /** User UUID. */
  userId: Scalars['String']['output'];
  /** Calendar/academic year. */
  year: Scalars['Int']['output'];
};

/** Leave applications grouped by department. */
export type LeaveDeptRow = {
  __typename?: 'LeaveDeptRow';
  /** Number of leave applications from this department. */
  count: Scalars['Int']['output'];
  /** Department name. */
  department: Scalars['String']['output'];
};

/** Leave count for a calendar month. */
export type LeaveMonthRow = {
  __typename?: 'LeaveMonthRow';
  /** Number of leave applications in this month. */
  count: Scalars['Int']['output'];
  /** Month label (e.g. January). */
  month: Scalars['String']['output'];
};

/** A leave application submitted by a user. */
export type LeaveRecord = {
  __typename?: 'LeaveRecord';
  /** Applicant user object. */
  applicant: Maybe<User>;
  /** UUID of the user who applied. */
  applicantId: Scalars['String']['output'];
  /** Leave start date (YYYY-MM-DD). */
  fromDate: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Leave type UUID. */
  leaveTypeId: Maybe<Scalars['String']['output']>;
  /** Display name of the leave type. */
  leaveTypeName: Scalars['String']['output'];
  /** Reason provided by the applicant. */
  reason: Scalars['String']['output'];
  /** Review comments from the admin. */
  reviewNote: Maybe<Scalars['String']['output']>;
  /** UUID of the admin who reviewed the application. */
  reviewedBy: Maybe<Scalars['String']['output']>;
  /** Status: pending | approved | rejected. */
  status: Scalars['String']['output'];
  /** Leave end date (YYYY-MM-DD). */
  toDate: Scalars['String']['output'];
};

/** Leave report with status breakdown, monthly trend, and department breakdown. */
export type LeaveReportResult = {
  __typename?: 'LeaveReportResult';
  /** Total approved applications. */
  approved: Scalars['Int']['output'];
  /** Applications grouped by department. */
  byDepartment: Array<LeaveDeptRow>;
  /** Month-by-month application trend. */
  monthlyTrend: Array<LeaveMonthRow>;
  /** Breakdown by application status. */
  statusBreakdown: Array<LeaveStatusRow>;
  /** Total leave applications in the year. */
  total: Scalars['Int']['output'];
  /** Year covered by the report. */
  year: Scalars['String']['output'];
};

/** Leave count breakdown by status. */
export type LeaveStatusRow = {
  __typename?: 'LeaveStatusRow';
  /** Count of applications with this status. */
  count: Scalars['Int']['output'];
  /** Status: pending | approved | rejected. */
  status: Scalars['String']['output'];
};

/** A leave type available to employees/staff (e.g. Casual Leave, Sick Leave). */
export type LeaveTypeConfig = {
  __typename?: 'LeaveTypeConfig';
  /** Who this leave type applies to: all | employee | student. */
  applicableTo: Scalars['String']['output'];
  /** Whether unused days carry forward to the next year. */
  carryForward: Scalars['Boolean']['output'];
  /** Short code (e.g. CL, SL, EL). */
  code: Scalars['String']['output'];
  /** Number of days allowed per year. */
  daysPerYear: Scalars['Int']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether this leave type is currently active. */
  isActive: Scalars['Boolean']['output'];
  /** Maximum days that can be carried forward. */
  maxCarryForward: Scalars['Int']['output'];
  /** Leave type name. */
  name: Scalars['String']['output'];
};

/** A journal entry: a balanced set of lines mirroring one source document. */
export type LedgerBatch = {
  __typename?: 'LedgerBatch';
  createdAt: Maybe<Scalars['String']['output']>;
  date: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lines: Array<LedgerEntry>;
  memo: Maybe<Scalars['String']['output']>;
  posted: Scalars['Boolean']['output'];
  reversed: Scalars['Boolean']['output'];
  sourceId: Maybe<Scalars['String']['output']>;
  sourceType: Maybe<Scalars['String']['output']>;
};

/** One debit or credit line of a journal entry. */
export type LedgerEntry = {
  __typename?: 'LedgerEntry';
  accountCode: Maybe<Scalars['String']['output']>;
  accountId: Scalars['String']['output'];
  accountName: Maybe<Scalars['String']['output']>;
  batchId: Scalars['String']['output'];
  credit: Scalars['Float']['output'];
  debit: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  memo: Maybe<Scalars['String']['output']>;
};

export type LedgerLineInput = {
  accountId: Scalars['String']['input'];
  credit?: InputMaybe<Scalars['Float']['input']>;
  debit?: InputMaybe<Scalars['Float']['input']>;
  memo?: InputMaybe<Scalars['String']['input']>;
};

/** A book in the library catalogue. */
export type LibraryBook = {
  __typename?: 'LibraryBook';
  author: Scalars['String']['output'];
  availableCopies: Scalars['Int']['output'];
  category: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isbn: Scalars['String']['output'];
  publishYear: Scalars['Int']['output'];
  publisher: Scalars['String']['output'];
  rack: Scalars['String']['output'];
  shelf: Scalars['String']['output'];
  title: Scalars['String']['output'];
  totalCopies: Scalars['Int']['output'];
};

/** A book issue record. */
export type LibraryIssue = {
  __typename?: 'LibraryIssue';
  book: Maybe<LibraryBook>;
  bookId: Scalars['String']['output'];
  dueDate: Scalars['String']['output'];
  fineAmount: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  issueDate: Scalars['String']['output'];
  returnDate: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  user: Maybe<User>;
  userId: Scalars['String']['output'];
};

/** A vehicle with its last known position, for the live map. */
export type LiveVehicle = {
  __typename?: 'LiveVehicle';
  capacity: Scalars['Int']['output'];
  driverEmployeeId: Maybe<Scalars['String']['output']>;
  /** Driver's employee name, falling back to the legacy free-text driverName. */
  driverName: Maybe<Scalars['String']['output']>;
  driverPhone: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** RFC3339; null when the vehicle has never reported a position. */
  lastPingAt: Maybe<Scalars['String']['output']>;
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  routeId: Maybe<Scalars['String']['output']>;
  routeName: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  vehicleNumber: Scalars['String']['output'];
  vehicleType: Scalars['String']['output'];
};

/** A mark entry for a student in a specific exam/subject. */
export type Mark = {
  __typename?: 'Mark';
  /** Academic year UUID. */
  academicYearId: Maybe<Scalars['String']['output']>;
  /** Assessment type (maps to exam schedule type). */
  assessmentType: Maybe<Scalars['String']['output']>;
  /** UUID of the staff who entered this mark. */
  enteredBy: Maybe<Scalars['String']['output']>;
  /** Exam type: internal | external | practical. */
  examType: Scalars['String']['output'];
  /** Computed grade (e.g. A, B+, F). */
  grade: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether this mark has been published to the student. */
  isPublished: Scalars['Boolean']['output'];
  /** Marks scored by the student. */
  marksObtained: Scalars['Float']['output'];
  /** Maximum marks for the exam. */
  maxMarks: Scalars['Float']['output'];
  /** Timestamp when the mark was published. */
  publishedAt: Maybe<Scalars['String']['output']>;
  /** Semester number. */
  semester: Scalars['Int']['output'];
  /** Result status: pass | fail. */
  status: Maybe<Scalars['String']['output']>;
  /** Associated student object. */
  student: Maybe<Student>;
  /** Student UUID. */
  studentId: Scalars['String']['output'];
  /** Subject name (denormalized for display). */
  subject: Scalars['String']['output'];
  /** Subject UUID. */
  subjectId: Maybe<Scalars['String']['output']>;
};

/** Input for marking attendance for a single entity. */
export type MarkAttendanceInput = {
  /** Date (YYYY-MM-DD). */
  date: Scalars['String']['input'];
  /** UUID of the student or employee. */
  entityId: Scalars['String']['input'];
  /** Entity type: student | employee. */
  entityType: Scalars['String']['input'];
  /** Optional remarks. */
  remarks?: InputMaybe<Scalars['String']['input']>;
  /** Status: present | absent | late. */
  status: Scalars['String']['input'];
  /** Subject UUID (for subject-level student attendance). */
  subjectId?: InputMaybe<Scalars['String']['input']>;
};

/** Marks report with grade distribution and subject averages. */
export type MarksReportResult = {
  __typename?: 'MarksReportResult';
  /** Grade distribution across all students. */
  gradeDistribution: Array<GradeRow>;
  /** Per-subject averages and pass/fail counts. */
  subjectAverages: Array<SubjectAvgRow>;
};

export type MealServing = {
  __typename?: 'MealServing';
  id: Scalars['ID']['output'];
  mealType: Scalars['String']['output'];
  notes: Maybe<Scalars['String']['output']>;
  servedAt: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

/** One recorded dose event against a medication order. */
export type MedicationAdministration = {
  __typename?: 'MedicationAdministration';
  administeredAt: Scalars['String']['output'];
  administeredById: Maybe<Scalars['String']['output']>;
  administeredByName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

/** A prescribed drug on an admitted patient's MAR. */
export type MedicationOrder = {
  __typename?: 'MedicationOrder';
  administrations: Array<MedicationAdministration>;
  admissionId: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  dose: Maybe<Scalars['String']['output']>;
  drugId: Maybe<Scalars['String']['output']>;
  drugName: Scalars['String']['output'];
  endDate: Maybe<Scalars['String']['output']>;
  frequency: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  orderedById: Maybe<Scalars['String']['output']>;
  orderedByName: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  route: Maybe<Scalars['String']['output']>;
  startDate: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

/** Outcome of a roster-style mess attendance submit. */
export type MessAttendanceResult = {
  __typename?: 'MessAttendanceResult';
  cleared: Scalars['Int']['output'];
  marked: Scalars['Int']['output'];
};

/** One student's meal row for a date + meal. */
export type MessAttendanceRow = {
  __typename?: 'MessAttendanceRow';
  date: Scalars['String']['output'];
  id: Maybe<Scalars['ID']['output']>;
  meal: Scalars['String']['output'];
  present: Scalars['Boolean']['output'];
  rollNumber: Maybe<Scalars['String']['output']>;
  studentId: Scalars['String']['output'];
  studentName: Scalars['String']['output'];
};

/** Spend total for one expense category within the queried window. */
export type MessCategoryTotal = {
  __typename?: 'MessCategoryTotal';
  category: Scalars['String']['output'];
  total: Scalars['Float']['output'];
};

/** One mess provisioning cost, optionally traced to a Phase 2 vendor / PO. */
export type MessExpense = {
  __typename?: 'MessExpense';
  amount: Scalars['Float']['output'];
  /** groceries | gas | staff | other. */
  category: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  /** YYYY-MM-DD. */
  date: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  poNumber: Maybe<Scalars['String']['output']>;
  purchaseOrderId: Maybe<Scalars['String']['output']>;
  vendorId: Maybe<Scalars['String']['output']>;
  vendorName: Maybe<Scalars['String']['output']>;
};

export type MessExpenseInput = {
  amount: Scalars['Float']['input'];
  category?: InputMaybe<Scalars['String']['input']>;
  date: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  purchaseOrderId?: InputMaybe<Scalars['String']['input']>;
  vendorId?: InputMaybe<Scalars['String']['input']>;
};

/** Aggregate spend for the queried window, for the expense page header. */
export type MessExpenseSummary = {
  __typename?: 'MessExpenseSummary';
  byCategory: Array<MessCategoryTotal>;
  total: Scalars['Float']['output'];
};

/** One cell of the weekly menu grid: what is served for a given day + meal. */
export type MessMenu = {
  __typename?: 'MessMenu';
  createdAt: Maybe<Scalars['String']['output']>;
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: Scalars['Int']['output'];
  /** Optional hostel block; empty means campus-wide. */
  hostelBlockId: Maybe<Scalars['String']['output']>;
  hostelBlockName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Newline-separated item list. */
  items: Maybe<Scalars['String']['output']>;
  /** breakfast | lunch | snacks | dinner. */
  meal: Scalars['String']['output'];
};

export type MessMenuInput = {
  dayOfWeek: Scalars['Int']['input'];
  hostelBlockId?: InputMaybe<Scalars['String']['input']>;
  items?: InputMaybe<Scalars['String']['input']>;
  meal: Scalars['String']['input'];
};

/** CRUD flags for one role on one module. */
export type ModuleAccess = {
  __typename?: 'ModuleAccess';
  canCreate: Scalars['Boolean']['output'];
  canDelete: Scalars['Boolean']['output'];
  canEdit: Scalars['Boolean']['output'];
  canView: Scalars['Boolean']['output'];
  /** Module id (see AccessMatrix.modules). */
  module: Scalars['String']['output'];
};

/** CRUD flags for one module when saving a role's access. */
export type ModuleAccessInput = {
  canCreate: Scalars['Boolean']['input'];
  canDelete: Scalars['Boolean']['input'];
  canEdit: Scalars['Boolean']['input'];
  canView: Scalars['Boolean']['input'];
  module: Scalars['String']['input'];
};

/** Pre-signed upload URL for a unit's video. */
export type ModuleVideoUpload = {
  __typename?: 'ModuleVideoUpload';
  /** Unit the upload belongs to. */
  unitId: Scalars['ID']['output'];
  /** Pre-signed PUT URL — browser uploads directly. */
  uploadUrl: Scalars['String']['output'];
  /** Server storage path that will be recorded on the unit after upload. */
  videoStoragePath: Scalars['String']['output'];
};

/** Root mutation type — all write operations. */
export type Mutation = {
  __typename?: 'Mutation';
  /** _placeholder: reserved for schema validity. Do not use. */
  _placeholder: Maybe<Scalars['Boolean']['output']>;
  addBloodUnit: BloodUnit;
  /** Attach an add-on to a student fee for the given course years. Recomputes totals and unpaid installments. */
  addStudentFeeAddOn: StudentFee;
  /** Add a discount/waiver line to a student fee (only before any payment). */
  addStudentFeeDiscount: StudentFee;
  /** Adjust a drug's stock by a delta (positive = restock, negative = correction). Stock never goes below zero. */
  adjustDrugStock: Drug;
  /** Adjust stock by a signed delta (correction/consumption). */
  adjustInventoryStock: InventoryItem;
  /** Allocate a hostel room to a student. */
  allocateHostelRoom: HostelAllocation;
  /** Allocate a vehicle to a student. */
  allocateTransportVehicle: TransportAllocation;
  /** Submit a leave application. */
  applyLeave: LeaveRecord;
  /** Ask peepal-agent to apply the available update now. */
  applySystemUpdate: Scalars['Boolean']['output'];
  /** Approve an approval request. */
  approveRequest: ApprovalRequest;
  /** Assign a goal to a department — creates progress rows for every employee. */
  assignGoalToDepartment: GoalAssignmentItem;
  /** Assign a salary template to one employee. */
  assignSalaryTemplate: Scalars['Boolean']['output'];
  /** Assign (or detach) a custom role to a user. */
  assignUserCustomRole: Scalars['Boolean']['output'];
  /** Set manager and optional department for a user. */
  assignUserManager: Scalars['Boolean']['output'];
  /** Assign a salary template to multiple employees. */
  bulkAssignSalaryTemplate: BulkAssignResult;
  /** Replace all timetable slots for a course/semester in one atomic operation. */
  bulkCreateTimetableSlots: Array<TimetableSlot>;
  /** Delete multiple holidays. */
  bulkDeleteHolidays: Scalars['Int']['output'];
  /** Delete multiple hostel allocations by ID (frees a bed for active ones). */
  bulkDeleteHostelAllocations: Scalars['Int']['output'];
  /** Delete multiple hostel blocks by ID. */
  bulkDeleteHostelBlocks: Scalars['Int']['output'];
  /** Delete multiple hostel rooms by ID (also removes their allocations). */
  bulkDeleteHostelRooms: Scalars['Int']['output'];
  /** Delete multiple room classes by ID (unlinks rooms using them). */
  bulkDeleteRoomClasses: Scalars['Int']['output'];
  /** Delete multiple transport allocations by ID. */
  bulkDeleteTransportAllocations: Scalars['Int']['output'];
  /** Delete multiple transport routes by ID. */
  bulkDeleteTransportRoutes: Scalars['Int']['output'];
  /** Delete multiple transport vehicles by ID (also removes their allocations). */
  bulkDeleteTransportVehicles: Scalars['Int']['output'];
  /** Record attendance for multiple entities in one request. */
  bulkMarkAttendance: Array<AttendanceRecord>;
  /**
   * Write many shifts in one transaction (roster grid submit). Rows that
   * collide with an existing shift are skipped and reported, not fatal.
   */
  bulkSetDutyRoster: BulkDutyRosterResult;
  cancelAmbulanceTrip: AmbulanceTrip;
  cancelBloodRequest: BloodRequest;
  /** Cancel a payment and reverse its application to installments. */
  cancelFeePayment: FeePayment;
  /** Cancel an invoice (blocked once any payment is recorded). */
  cancelInvoice: Invoice;
  cancelLabOrder: LabOrder;
  cancelSurgery: SurgerySchedule;
  cancelTeleConsult: TeleConsult;
  /** Duplicate a structure (with all items) as a new variation, e.g. to create an NRI or scholarship tier. */
  cloneFeeStructure: FeeStructure;
  /** Stop accepting submissions. */
  closeStudentAssignment: StudentAssignment;
  completeAmbulanceTrip: AmbulanceTrip;
  /** Copy holidays into another academic year. */
  copyHolidaysToAcademicYear: CopyResult;
  /** Create a new academic year. */
  createAcademicYear: AcademicYear;
  createAccount: Account;
  createAdmission: Admission;
  createAmbulance: Ambulance;
  /** Create an announcement targeted at specific roles. */
  createAnnouncement: AnnouncementItem;
  /** Book an appointment. Rejects double-booking the clinician for the same date and start time. */
  createAppointment: Appointment;
  createBed: Bed;
  /** Add a billable service to the catalog. */
  createBillableService: BillableService;
  createBloodRequest: BloodRequest;
  /** Add a weekly availability window for a clinician. */
  createClinicianSchedule: ClinicianSchedule;
  /** Create a new course/programme. */
  createCourse: Course;
  /** Create a batch under a course. */
  createCourseBatch: CourseBatch;
  /** Create a custom role. */
  createCustomRole: CustomRole;
  /** Create a new department. */
  createDepartment: Department;
  createDietPlan: DietPlan;
  /** Dispense drugs to a patient; decrements stock atomically and rejects insufficient stock. */
  createDispense: Dispense;
  /** Add a drug to the pharmacy catalog. */
  createDrug: Drug;
  /** Log a received batch/lot for a drug (batch no + expiry + qty); bumps the drug's stock. Powers expiry tracking and FEFO dispensing without a full purchase order. */
  createDrugBatch: DrugBatch;
  createDutyRoster: DutyRoster;
  /** Create a new employee profile linked to an existing user account. */
  createEmployee: Employee;
  /** Record a clinical visit. Completing it later closes the encounter. */
  createEncounter: Encounter;
  /** Create a college calendar event. */
  createEvent: EventItem;
  /** Create a tenant event category. */
  createEventCategory: EventCategory;
  /** Create a new exam schedule. */
  createExamSchedule: ExamSchedule;
  /** Create a department-scoped exam type (assessment definition). */
  createExamType: ExamType;
  /** Define a fee add-on (an optional per-year facility charge). */
  createFeeAddOn: FeeAddOn;
  /** Create an allocation: pick a structure, frequency, and target. Installments are auto-generated and student fees materialized. */
  createFeeAllocation: FeeAllocation;
  /** Create a fee category (a master fee code). */
  createFeeCategory: FeeCategory;
  /** Create a course fee structure (variation) with per-year line items covering the course duration. */
  createFeeStructure: FeeStructure;
  /** Create a holiday (supports single date or date range). */
  createHoliday: Array<Holiday>;
  /** Create a new hostel block. */
  createHostelBlock: HostelBlock;
  /** Create a new hostel room. */
  createHostelRoom: HostelRoom;
  createInsuranceClaim: InsuranceClaim;
  createInsurancePayer: InsurancePayer;
  createInventoryItem: InventoryItem;
  /** Create an invoice for a patient from catalog and/or free-text lines. */
  createInvoice: Invoice;
  createLabOrder: LabOrder;
  createLabTest: LabTest;
  /** Create an assignment (admin). */
  createLearningAssignment: LearningItem;
  /** Create a new learning goal (admin). */
  createLearningGoal: LearningGoal;
  /** Create a quiz question (admin). */
  createLearningQuestion: LearningQuestion;
  /** Create a section within a goal (admin). */
  createLearningSection: LearningSection;
  /** Create a unit (video + text) within a section (admin). */
  createLearningUnit: LearningItem;
  /** Create a new leave type configuration. */
  createLeaveType: LeaveTypeConfig;
  /** Add a book to the library catalogue. */
  createLibraryBook: LibraryBook;
  createManualJournal: LedgerBatch;
  /** Record a mark entry for a student. */
  createMark: Mark;
  createMedicationOrder: MedicationOrder;
  createMessExpense: MessExpense;
  createOperationTheatre: OperationTheatre;
  /** Register a new patient. MRN is auto-generated when omitted. */
  createPatient: Patient;
  createPatientLogin: Patient;
  /** Record a supplier invoice, optionally against a PO. */
  createPurchaseInvoice: PurchaseInvoice;
  /** Create a purchase order (draft) with its line items. */
  createPurchaseOrder: PurchaseOrder;
  /** Add a question to the bank for a curriculum subject. */
  createQuestionBankItem: QuestionBankItem;
  createRadiologyOrder: RadiologyOrder;
  createRadiologyStudy: RadiologyStudy;
  createReferral: Referral;
  /** Create a room class (pricing template). */
  createRoomClass: RoomClass;
  /** Define a salary structure for an employee. */
  createSalaryStructure: SalaryStructure;
  /** Create a salary template. */
  createSalaryTemplate: SalaryTemplate;
  /** Create a new semester. */
  createSemester: Semester;
  /** Enroll a new student linked to an existing user account. */
  createStudent: Student;
  createStudentAssignment: StudentAssignment;
  /** Create a new subject. */
  createSubject: Subject;
  /** Create a single timetable slot. */
  createTimetableSlot: TimetableSlot;
  /** Create a transport route. */
  createTransportRoute: TransportRoute;
  /** Create a transport vehicle. */
  createTransportVehicle: TransportVehicle;
  createTriageCase: TriageCase;
  /** Create a new user account. */
  createUser: User;
  /** Create a supplier. */
  createVendor: Vendor;
  createWard: Ward;
  /** Deactivate a user account (soft-disable — does not delete). */
  deactivateUser: Scalars['Boolean']['output'];
  /** Delete an academic year and all its semesters. */
  deleteAcademicYear: Scalars['Boolean']['output'];
  deleteAccount: Scalars['Boolean']['output'];
  /** Delete every student in the tenant in one transaction. Returns the number removed. */
  deleteAllStudents: Scalars['Int']['output'];
  deleteAmbulance: Scalars['Boolean']['output'];
  /** Delete an announcement. */
  deleteAnnouncement: Scalars['Boolean']['output'];
  /** Delete an appointment. */
  deleteAppointment: Scalars['Boolean']['output'];
  deleteBed: Scalars['Boolean']['output'];
  /** Delete a billable service (invoice lines keep their frozen copy). */
  deleteBillableService: Scalars['Boolean']['output'];
  deleteBloodUnit: Scalars['Boolean']['output'];
  /** Delete an availability window. */
  deleteClinicianSchedule: Scalars['Boolean']['output'];
  /** Delete a course. */
  deleteCourse: Scalars['Boolean']['output'];
  /** Delete a course batch. */
  deleteCourseBatch: Scalars['Boolean']['output'];
  /** Delete a custom role. */
  deleteCustomRole: Scalars['Boolean']['output'];
  /** Delete a department (fails if employees are assigned). */
  deleteDepartment: Scalars['Boolean']['output'];
  deleteDriverAttendance: Scalars['Boolean']['output'];
  /** Delete a drug (dispense lines keep their frozen copy). */
  deleteDrug: Scalars['Boolean']['output'];
  deleteDutyRoster: Scalars['Boolean']['output'];
  /** Permanently delete an employee record by ID. */
  deleteEmployee: Scalars['Boolean']['output'];
  /** Delete an encounter. */
  deleteEncounter: Scalars['Boolean']['output'];
  /** Delete a calendar event. */
  deleteEvent: Scalars['Boolean']['output'];
  /** Delete a tenant event category. */
  deleteEventCategory: Scalars['Boolean']['output'];
  /** Delete an exam schedule. */
  deleteExamSchedule: Scalars['Boolean']['output'];
  /** Delete an exam type. */
  deleteExamType: Scalars['Boolean']['output'];
  /** Delete a fee add-on (blocked while attached to any student). */
  deleteFeeAddOn: Scalars['Boolean']['output'];
  /** Remove an allocation. Deletes generated student fees that have no payments (blocked if payments exist). */
  deleteFeeAllocation: Scalars['Boolean']['output'];
  /** Delete a fee category. */
  deleteFeeCategory: Scalars['Boolean']['output'];
  /** Delete a fee structure (blocked if allocations reference it). */
  deleteFeeStructure: Scalars['Boolean']['output'];
  /** Delete a single holiday. */
  deleteHoliday: Scalars['Boolean']['output'];
  deleteInsuranceClaim: Scalars['Boolean']['output'];
  deleteInsurancePayer: Scalars['Boolean']['output'];
  deleteInventoryItem: Scalars['Boolean']['output'];
  deleteLabTest: Scalars['Boolean']['output'];
  /** Delete an assignment (admin). */
  deleteLearningAssignment: Scalars['Boolean']['output'];
  /** Delete a learning goal and all descendants (admin). */
  deleteLearningGoal: Scalars['Boolean']['output'];
  /** Delete a quiz question (admin). */
  deleteLearningQuestion: Scalars['Boolean']['output'];
  /** Delete a section (admin). */
  deleteLearningSection: Scalars['Boolean']['output'];
  /** Delete a unit (admin). */
  deleteLearningUnit: Scalars['Boolean']['output'];
  /** Delete a leave type. */
  deleteLeaveType: Scalars['Boolean']['output'];
  /** Delete a library book. */
  deleteLibraryBook: Scalars['Boolean']['output'];
  /** Delete a single mark entry. */
  deleteMark: Scalars['Boolean']['output'];
  /** Delete multiple mark entries by ID. Returns the count deleted. */
  deleteMarks: Scalars['Int']['output'];
  /** Delete all mark entries matching the filter criteria. Returns the count deleted. */
  deleteMarksByFilter: Scalars['Int']['output'];
  deleteMessExpense: Scalars['Boolean']['output'];
  deleteMessMenu: Scalars['Boolean']['output'];
  /** Delete a notification. */
  deleteNotification: Scalars['Boolean']['output'];
  deleteOperationTheatre: Scalars['Boolean']['output'];
  /** Delete a patient and all their appointments and encounters. */
  deletePatient: Scalars['Boolean']['output'];
  /** Delete a payroll record. */
  deletePayroll: Scalars['Boolean']['output'];
  /** Delete a supplier invoice. */
  deletePurchaseInvoice: Scalars['Boolean']['output'];
  /** Delete a purchase order and its lines (blocked once any stock has been received). */
  deletePurchaseOrder: Scalars['Boolean']['output'];
  /** Delete a question-bank item. Papers already generated keep their frozen copy. */
  deleteQuestionBankItem: Scalars['Boolean']['output'];
  /** Delete a question paper and its items. Finalized papers cannot be deleted. */
  deleteQuestionPaper: Scalars['Boolean']['output'];
  deleteRadiologyStudy: Scalars['Boolean']['output'];
  deleteReferral: Scalars['Boolean']['output'];
  /** Delete a room class. */
  deleteRoomClass: Scalars['Boolean']['output'];
  /** Delete a salary assignment. */
  deleteSalaryAssignment: Scalars['Boolean']['output'];
  /** Delete a salary structure by ID. */
  deleteSalaryStructure: Scalars['Boolean']['output'];
  /** Delete a salary template (fails if in active use). */
  deleteSalaryTemplate: Scalars['Boolean']['output'];
  /** Delete a semester by ID. */
  deleteSemester: Scalars['Boolean']['output'];
  /** Delete a student record. */
  deleteStudent: Scalars['Boolean']['output'];
  deleteStudentAssignment: Scalars['Boolean']['output'];
  /** Delete a subject. */
  deleteSubject: Scalars['Boolean']['output'];
  /** Delete a timetable slot. */
  deleteTimetableSlot: Scalars['Boolean']['output'];
  /** Delete a transport route. */
  deleteTransportRoute: Scalars['Boolean']['output'];
  /** Delete a transport vehicle. */
  deleteTransportVehicle: Scalars['Boolean']['output'];
  /** Permanently delete a user account and all associated records. */
  deleteUser: Scalars['Boolean']['output'];
  /** Delete a supplier (blocked if purchase orders/invoices reference it). */
  deleteVendor: Scalars['Boolean']['output'];
  deleteWard: Scalars['Boolean']['output'];
  dischargeAdmission: Admission;
  discontinueDietPlan: DietPlan;
  discontinueMedicationOrder: MedicationOrder;
  dispatchAmbulance: AmbulanceTrip;
  /** Driver self check-in for today onto a vehicle. */
  driverCheckIn: DriverAttendance;
  /** Driver self check-out for today. */
  driverCheckOut: DriverAttendance;
  /** Enter/update results for one or more lines; auto-flags and advances status. */
  enterLabResults: LabOrder;
  /** Lock a draft paper. A finalized paper prints without the DRAFT watermark and cannot be edited. */
  finalizeQuestionPaper: QuestionPaper;
  fulfillBloodRequest: BloodRequest;
  /** Auto-generate weekend holiday rows for a year. */
  generateCalendar: GenerateCalendarResult;
  /** Generate a payroll record for an employee for a given month. */
  generatePayroll: Payroll;
  /** Generate a question paper from the bank using a difficulty/unit/type rule. */
  generateQuestionPaper: QuestionPaper;
  /** Award marks + feedback on a submission (teacher/admin). */
  gradeAssignmentSubmission: AssignmentSubmission;
  issueBloodUnit: BloodUnit;
  /** Issue hall tickets to every enrolled student for an exam schedule. Idempotent per (student, schedule); ineligible students are stored held with a reason. */
  issueHallTickets: HallTicketIssueResult;
  /** Issue a book to a user. */
  issueLibraryBook: LibraryIssue;
  /** Issue stock from the store into the linked pharmacy drug (atomic). */
  issueToPharmacy: InventoryItem;
  /** Mark all notifications for the current user as read. */
  markAllNotificationsRead: Scalars['Boolean']['output'];
  /** Record attendance for a single entity (student or employee). */
  markAttendance: AttendanceRecord;
  /** Create or update a driver's day sheet (upsert on employee + date). */
  markDriverAttendance: DriverAttendance;
  /**
   * Roster submit: the listed students are marked present for that meal and
   * every other student's existing mark for it is cleared.
   */
  markMessAttendance: MessAttendanceResult;
  /** Mark a specific notification as read. */
  markNotificationRead: Scalars['Boolean']['output'];
  /** Record a vehicle's current position and stamp lastPingAt. */
  pingVehicleLocation: LiveVehicle;
  /** Toggle the published state of an exam schedule. */
  publishExamSchedule: ExamSchedule;
  /** Publish results matching the filter criteria. Returns the count of records published. */
  publishResults: Scalars['Int']['output'];
  /** Make a draft visible to students. */
  publishStudentAssignment: StudentAssignment;
  /** Receive stock against a PO: writes the inventory ledger, drug batches, and recomputes PO status. */
  receivePurchaseOrder: PurchaseOrder;
  /** Receive stock into the store (positive qty). */
  receiveStock: InventoryItem;
  /** Record a payment against a student fee. Applies to installments oldest-first. */
  recordFeePayment: FeePayment;
  /** Record a payment against an invoice. Rejects overpayment. */
  recordInvoicePayment: Invoice;
  recordMealServing: DietPlan;
  recordMedicationAdministration: MedicationOrder;
  /** Record a payment against a supplier invoice. */
  recordPurchasePayment: PurchaseInvoice;
  recordVitals: VitalsRecord;
  /**
   * Register (or re-point) this install's push token for the calling user.
   * Registering a token already held by someone else reassigns it, so a shared
   * device never delivers one user's notifications to the next.
   */
  registerDeviceToken: DeviceToken;
  /** Reject an approval request. */
  rejectRequest: ApprovalRequest;
  /** Clear an eligibility hold and issue the ticket. */
  releaseHallTicketHold: HallTicket;
  /** Remove a goal-department assignment and cascade-delete its progress rows. */
  removeGoalAssignment: Scalars['Boolean']['output'];
  /** Detach one add-on year from a student fee (blocked if it would drop the total below what is already paid). */
  removeStudentFeeAddOn: StudentFee;
  /** Remove a discount line (only before any payment). */
  removeStudentFeeDiscount: StudentFee;
  /** Remove a transport allocation. */
  removeTransportAllocation: TransportAllocation;
  /** File findings + impression; flips the order to reported. */
  reportRadiologyOrder: RadiologyOrder;
  /**
   * Issue (or re-issue) a password-setup invite for a user and e-mail it.
   * Returns the link so it can be copied when no SMTP transport is configured.
   */
  resendInvite: InviteResult;
  /** Reset one role's access back to the built-in defaults (admin only). */
  resetRoleAccess: RoleAccess;
  /** Backfill transport/hostel add-ons onto students who hold an active allocation but are missing the fee. Returns rows created. */
  resyncFacilityFees: Scalars['Int']['output'];
  /** Return a book. */
  returnLibraryBook: LibraryIssue;
  /** Approve or reject a leave application (admin only). */
  reviewLeave: LeaveRecord;
  /**
   * Stop delivering to one push token. Called on sign-out so a signed-out device
   * goes quiet immediately rather than waiting for the token to expire.
   */
  revokeDeviceToken: Scalars['Boolean']['output'];
  /** Revoke an issued hall ticket. */
  revokeHallTicket: HallTicket;
  /**
   * End every session of the caller's except the one making the request. Returns
   * how many were ended, so the UI can report "signed out of 3 other devices".
   */
  revokeMyOtherSessions: Scalars['Int']['output'];
  /**
   * End one of the caller's own sessions. Naming a session that is not theirs is
   * refused rather than silently ignored, since the id is theirs to know.
   */
  revokeMySession: Scalars['Boolean']['output'];
  /**
   * End every session belonging to a user in the caller's tenant. Admin-only.
   * Returns how many were ended.
   */
  revokeUserSessions: Scalars['Int']['output'];
  /** Create or replace the tenant's grading scheme and its grade bands (admin). */
  saveGradingScheme: GradingScheme;
  scheduleSurgery: SurgerySchedule;
  scheduleTeleConsult: TeleConsult;
  /** Send a notification to a specific user (admin only). */
  sendNotification: NotificationItem;
  /** Mark an academic year as the current one. */
  setCurrentAcademicYear: AcademicYear;
  /** Replace the subjects assigned to one semester of a course's curriculum. */
  setCurriculumSubjects: Array<CurriculumSubject>;
  /** Create or replace the menu cell for a (day, meal, block). */
  setMessMenu: MessMenu;
  /** Set a purchase order's status (draft/ordered/cancelled). */
  setPurchaseOrderStatus: PurchaseOrder;
  /** Set an order's workflow status: scheduled | completed | cancelled. */
  setRadiologyOrderStatus: RadiologyOrder;
  /** Set or clear a referral's commission terms. Not yet settled. */
  setReferralCommission: Referral;
  setReferralStatus: Referral;
  setSurgeryStatus: SurgerySchedule;
  /**
   * Replace a user's additional workspace grants (admin only). The user's primary
   * role is implicit and is ignored if passed. Returns the resulting full list.
   */
  setUserWorkspaceRoles: Array<Workspace>;
  /** Mark an approved claim settled (final step after reimbursement). */
  settleInsuranceClaim: InsuranceClaim;
  /** Freeze the commission amount, mark the referral settled, and (when Phase 3 accounting is live) post the payable to the GL. */
  settleReferral: Referral;
  /** Suppress the update popup for this tenant for one hour (does not delay auto-apply). */
  snoozeSystemUpdate: SystemUpdateStatus;
  /** Self-service: create or replace the caller's own submission. */
  submitAssignment: AssignmentSubmission;
  /** Submit a quiz attempt — auto-graded; returns score and progress row. */
  submitQuiz: QuizSubmissionResult;
  /** Re-apply an allocation to pick up newly admitted students. Returns the number of records created. */
  syncFeeAllocation: Scalars['Int']['output'];
  /** Send a test email using the tenant's effective email settings. */
  testEmailSettings: Scalars['Boolean']['output'];
  transferAdmission: Admission;
  /** Update an existing academic year. */
  updateAcademicYear: AcademicYear;
  updateAccount: Account;
  updateAmbulance: Ambulance;
  /** Update an existing announcement. */
  updateAnnouncement: AnnouncementItem;
  /** Update or reschedule an appointment (including status changes). */
  updateAppointment: Appointment;
  /** Update per-tenant attendance configuration. */
  updateAttendanceSettings: AttendanceSettings;
  updateBed: Bed;
  /** Update a billable service. */
  updateBillableService: BillableService;
  updateBloodUnitStatus: BloodUnit;
  /** Save the brochure content (JSON string) for the current tenant. Admin only. */
  updateBrochureContent: Scalars['String']['output'];
  /** Update calendar generation settings. */
  updateCalendarSettings: CalendarSettings;
  /** Update an availability window. */
  updateClinicianSchedule: ClinicianSchedule;
  /** Update an existing course. */
  updateCourse: Course;
  /** Update a custom role. */
  updateCustomRole: CustomRole;
  /** Update an existing department. */
  updateDepartment: Department;
  updateDietPlan: DietPlan;
  /** Update a drug's details (stock changes go through adjustDrugStock). */
  updateDrug: Drug;
  updateDutyRoster: DutyRoster;
  /** Update the calling tenant's own email (SMTP) settings. */
  updateEmailSettings: EmailSettings;
  /** Update an existing employee's profile and (optionally) banking/PF details. */
  updateEmployee: Employee;
  /** Update an encounter's findings, vitals, prescription, or status. */
  updateEncounter: Encounter;
  /** Update a calendar event. */
  updateEvent: EventItem;
  /** Update a tenant event category. */
  updateEventCategory: EventCategory;
  /** Update an existing exam schedule. */
  updateExamSchedule: ExamSchedule;
  /** Update an existing exam type. */
  updateExamType: ExamType;
  /** Update a fee add-on. Amount changes only affect future attachments. */
  updateFeeAddOn: FeeAddOn;
  /** Update an allocation. Passing installments replaces the schedule and re-syncs unpaid student fees (blocked once payments exist). */
  updateFeeAllocation: FeeAllocation;
  /** Update a fee category. */
  updateFeeCategory: FeeCategory;
  /** Update a fee structure. Passing items replaces all line items (blocked once allocations exist). */
  updateFeeStructure: FeeStructure;
  /** Update a hostel room. */
  updateHostelRoom: HostelRoom;
  updateInsuranceClaim: InsuranceClaim;
  updateInsurancePayer: InsurancePayer;
  updateInventoryItem: InventoryItem;
  /** Update a single item's progress (employee marks units; admin records scores). */
  updateItemProgress: ItemProgress;
  updateLabTest: LabTest;
  /** Update an assignment (admin). */
  updateLearningAssignment: LearningItem;
  /** Update a learning goal's metadata (admin). */
  updateLearningGoal: LearningGoal;
  /** Update a quiz question (admin). */
  updateLearningQuestion: LearningQuestion;
  /** Update a section (admin). */
  updateLearningSection: LearningSection;
  /** Update a unit (admin). */
  updateLearningUnit: LearningItem;
  /** Update an existing leave type. */
  updateLeaveType: LeaveTypeConfig;
  /** Update a library book. */
  updateLibraryBook: LibraryBook;
  /** Update marks obtained and max marks for an existing entry. */
  updateMark: Mark;
  updateMessExpense: MessExpense;
  /** Save the tenant's OPD slip design (JSON string). Admin only. */
  updateOpdSlipConfig: Scalars['String']['output'];
  updateOperationTheatre: OperationTheatre;
  /** Create or update the tenant org profile. */
  updateOrgProfile: OrgProfile;
  /** Update a patient's demographics, clinical flags, or status. */
  updatePatient: Patient;
  /** Advance payroll status (draft → approved → paid) and record payment details. */
  updatePayrollStatus: Payroll;
  /** Update a purchase order header/lines while still editable. */
  updatePurchaseOrder: PurchaseOrder;
  /** Update a question-bank item. */
  updateQuestionBankItem: QuestionBankItem;
  updateRadiologyStudy: RadiologyStudy;
  /** Upsert one role's access across modules (admin only). */
  updateRoleAccess: RoleAccess;
  /** Update a room class. */
  updateRoomClass: RoomClass;
  /** Update a salary assignment's overrides. */
  updateSalaryAssignment: SalaryAssignment;
  /** Update an existing salary structure. */
  updateSalaryStructure: SalaryStructure;
  /** Update a salary template. */
  updateSalaryTemplate: SalaryTemplate;
  /** Update an existing student's enrollment details and personal info. */
  updateStudent: Student;
  updateStudentAssignment: StudentAssignment;
  /** Update an existing subject. */
  updateSubject: Subject;
  updateTeleConsult: TeleConsult;
  /** Update an existing timetable slot. */
  updateTimetableSlot: TimetableSlot;
  /** Update a transport route. */
  updateTransportRoute: TransportRoute;
  /** Update a transport vehicle. */
  updateTransportVehicle: TransportVehicle;
  updateTriageCase: TriageCase;
  /** Update name/email/role and (optionally) reset the password of a user. */
  updateUser: User;
  /** Update a supplier. */
  updateVendor: Vendor;
  updateWard: Ward;
  /** Request a pre-signed URL to upload a unit video (admin). */
  uploadUnitVideo: ModuleVideoUpload;
  /** Create or update a single calendar day entry. */
  upsertCalendarDay: Maybe<Holiday>;
  /** Vacate a hostel allocation. */
  vacateHostelRoom: HostelAllocation;
};


/** Root mutation type — all write operations. */
export type MutationAddBloodUnitArgs = {
  input: CreateBloodUnitInput;
};


/** Root mutation type — all write operations. */
export type MutationAddStudentFeeAddOnArgs = {
  input: AddStudentFeeAddOnInput;
};


/** Root mutation type — all write operations. */
export type MutationAddStudentFeeDiscountArgs = {
  input: AddStudentFeeDiscountInput;
};


/** Root mutation type — all write operations. */
export type MutationAdjustDrugStockArgs = {
  delta: Scalars['Float']['input'];
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationAdjustInventoryStockArgs = {
  delta: Scalars['Float']['input'];
  itemId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationAllocateHostelRoomArgs = {
  input: AllocateHostelRoomInput;
};


/** Root mutation type — all write operations. */
export type MutationAllocateTransportVehicleArgs = {
  input: AllocateTransportInput;
};


/** Root mutation type — all write operations. */
export type MutationApplyLeaveArgs = {
  input: ApplyLeaveInput;
};


/** Root mutation type — all write operations. */
export type MutationApproveRequestArgs = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationAssignGoalToDepartmentArgs = {
  departmentId: Scalars['ID']['input'];
  goalId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationAssignSalaryTemplateArgs = {
  input: AssignSalaryTemplateInput;
};


/** Root mutation type — all write operations. */
export type MutationAssignUserCustomRoleArgs = {
  customRoleId?: InputMaybe<Scalars['ID']['input']>;
  userId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationAssignUserManagerArgs = {
  departmentId?: InputMaybe<Scalars['ID']['input']>;
  managerId?: InputMaybe<Scalars['ID']['input']>;
  userId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationBulkAssignSalaryTemplateArgs = {
  input: BulkAssignSalaryTemplateInput;
};


/** Root mutation type — all write operations. */
export type MutationBulkCreateTimetableSlotsArgs = {
  input: BulkCreateTimetableSlotsInput;
};


/** Root mutation type — all write operations. */
export type MutationBulkDeleteHolidaysArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationBulkDeleteHostelAllocationsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationBulkDeleteHostelBlocksArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationBulkDeleteHostelRoomsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationBulkDeleteRoomClassesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationBulkDeleteTransportAllocationsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationBulkDeleteTransportRoutesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationBulkDeleteTransportVehiclesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationBulkMarkAttendanceArgs = {
  inputs: Array<MarkAttendanceInput>;
};


/** Root mutation type — all write operations. */
export type MutationBulkSetDutyRosterArgs = {
  input: BulkSetDutyRosterInput;
};


/** Root mutation type — all write operations. */
export type MutationCancelAmbulanceTripArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCancelBloodRequestArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCancelFeePaymentArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCancelInvoiceArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCancelLabOrderArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCancelSurgeryArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCancelTeleConsultArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCloneFeeStructureArgs = {
  code: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCloseStudentAssignmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCompleteAmbulanceTripArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCopyHolidaysToAcademicYearArgs = {
  ids: Array<Scalars['ID']['input']>;
  targetAcademicYearId: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCreateAcademicYearArgs = {
  input: CreateAcademicYearInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateAccountArgs = {
  input: CreateAccountInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateAdmissionArgs = {
  input: CreateAdmissionInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateAmbulanceArgs = {
  input: CreateAmbulanceInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateAnnouncementArgs = {
  input: CreateAnnouncementInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateAppointmentArgs = {
  input: CreateAppointmentInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateBedArgs = {
  input: CreateBedInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateBillableServiceArgs = {
  input: CreateBillableServiceInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateBloodRequestArgs = {
  input: CreateBloodRequestInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateClinicianScheduleArgs = {
  input: CreateClinicianScheduleInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateCourseArgs = {
  input: CreateCourseInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateCourseBatchArgs = {
  courseId: Scalars['ID']['input'];
  startYear: Scalars['Int']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCreateCustomRoleArgs = {
  input: CreateCustomRoleInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateDepartmentArgs = {
  input: CreateDepartmentInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateDietPlanArgs = {
  input: CreateDietPlanInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateDispenseArgs = {
  input: CreateDispenseInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateDrugArgs = {
  input: CreateDrugInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateDrugBatchArgs = {
  input: CreateDrugBatchInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateDutyRosterArgs = {
  input: CreateDutyRosterInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateEmployeeArgs = {
  input: CreateEmployeeInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateEncounterArgs = {
  input: CreateEncounterInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateEventArgs = {
  input: CreateEventInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateEventCategoryArgs = {
  input: CreateEventCategoryInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateExamScheduleArgs = {
  input: CreateExamScheduleInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateExamTypeArgs = {
  input: CreateExamTypeInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateFeeAddOnArgs = {
  input: CreateFeeAddOnInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateFeeAllocationArgs = {
  input: CreateFeeAllocationInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateFeeCategoryArgs = {
  input: CreateFeeCategoryInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateFeeStructureArgs = {
  input: CreateFeeStructureInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateHolidayArgs = {
  input: CreateHolidayInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateHostelBlockArgs = {
  input: CreateHostelBlockInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateHostelRoomArgs = {
  input: CreateHostelRoomInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateInsuranceClaimArgs = {
  input: CreateInsuranceClaimInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateInsurancePayerArgs = {
  input: CreateInsurancePayerInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateInventoryItemArgs = {
  input: CreateInventoryItemInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateInvoiceArgs = {
  input: CreateInvoiceInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateLabOrderArgs = {
  input: CreateLabOrderInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateLabTestArgs = {
  input: CreateLabTestInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateLearningAssignmentArgs = {
  input: CreateLearningAssignmentInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateLearningGoalArgs = {
  input: CreateLearningGoalInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateLearningQuestionArgs = {
  input: CreateLearningQuestionInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateLearningSectionArgs = {
  input: CreateLearningSectionInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateLearningUnitArgs = {
  input: CreateLearningUnitInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateLeaveTypeArgs = {
  input: CreateLeaveTypeInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateLibraryBookArgs = {
  input: CreateLibraryBookInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateManualJournalArgs = {
  input: CreateManualJournalInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateMarkArgs = {
  input: CreateMarkInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateMedicationOrderArgs = {
  input: CreateMedicationOrderInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateMessExpenseArgs = {
  input: MessExpenseInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateOperationTheatreArgs = {
  input: CreateOperationTheatreInput;
};


/** Root mutation type — all write operations. */
export type MutationCreatePatientArgs = {
  input: CreatePatientInput;
};


/** Root mutation type — all write operations. */
export type MutationCreatePatientLoginArgs = {
  email: Scalars['String']['input'];
  password?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationCreatePurchaseInvoiceArgs = {
  input: CreatePurchaseInvoiceInput;
};


/** Root mutation type — all write operations. */
export type MutationCreatePurchaseOrderArgs = {
  input: CreatePurchaseOrderInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateQuestionBankItemArgs = {
  input: CreateQuestionBankItemInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateRadiologyOrderArgs = {
  input: CreateRadiologyOrderInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateRadiologyStudyArgs = {
  input: CreateRadiologyStudyInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateReferralArgs = {
  input: CreateReferralInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateRoomClassArgs = {
  input: CreateRoomClassInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateSalaryStructureArgs = {
  input: CreateSalaryStructureInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateSalaryTemplateArgs = {
  input: CreateSalaryTemplateInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateSemesterArgs = {
  input: CreateSemesterInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateStudentArgs = {
  input: CreateStudentInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateStudentAssignmentArgs = {
  input: CreateStudentAssignmentInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateSubjectArgs = {
  input: CreateSubjectInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateTimetableSlotArgs = {
  input: CreateTimetableSlotInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateTransportRouteArgs = {
  input: CreateTransportRouteInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateTransportVehicleArgs = {
  input: CreateTransportVehicleInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateTriageCaseArgs = {
  input: CreateTriageCaseInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateVendorArgs = {
  input: CreateVendorInput;
};


/** Root mutation type — all write operations. */
export type MutationCreateWardArgs = {
  input: CreateWardInput;
};


/** Root mutation type — all write operations. */
export type MutationDeactivateUserArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteAcademicYearArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteAccountArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteAmbulanceArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteAnnouncementArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteAppointmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteBedArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteBillableServiceArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteBloodUnitArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteClinicianScheduleArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteCourseArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteCourseBatchArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteCustomRoleArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteDepartmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteDriverAttendanceArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteDrugArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteDutyRosterArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteEmployeeArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteEncounterArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteEventArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteEventCategoryArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteExamScheduleArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteExamTypeArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteFeeAddOnArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteFeeAllocationArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteFeeCategoryArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteFeeStructureArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteHolidayArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteInsuranceClaimArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteInsurancePayerArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteInventoryItemArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteLabTestArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteLearningAssignmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteLearningGoalArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteLearningQuestionArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteLearningSectionArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteLearningUnitArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteLeaveTypeArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteLibraryBookArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteMarkArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteMarksArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationDeleteMarksByFilterArgs = {
  examType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  studentId?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationDeleteMessExpenseArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteMessMenuArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteNotificationArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteOperationTheatreArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeletePatientArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeletePayrollArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeletePurchaseInvoiceArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeletePurchaseOrderArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteQuestionBankItemArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteQuestionPaperArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteRadiologyStudyArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteReferralArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteRoomClassArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteSalaryAssignmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteSalaryStructureArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteSalaryTemplateArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteSemesterArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteStudentArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteStudentAssignmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteSubjectArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteTimetableSlotArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteTransportRouteArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteTransportVehicleArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteVendorArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDeleteWardArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDischargeAdmissionArgs = {
  input: DischargeAdmissionInput;
};


/** Root mutation type — all write operations. */
export type MutationDiscontinueDietPlanArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDiscontinueMedicationOrderArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationDispatchAmbulanceArgs = {
  input: DispatchAmbulanceInput;
};


/** Root mutation type — all write operations. */
export type MutationDriverCheckInArgs = {
  vehicleId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationEnterLabResultsArgs = {
  orderId: Scalars['ID']['input'];
  results: Array<LabResultInput>;
};


/** Root mutation type — all write operations. */
export type MutationFinalizeQuestionPaperArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationFulfillBloodRequestArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationGenerateCalendarArgs = {
  year: Scalars['Int']['input'];
};


/** Root mutation type — all write operations. */
export type MutationGeneratePayrollArgs = {
  input: GeneratePayrollInput;
};


/** Root mutation type — all write operations. */
export type MutationGenerateQuestionPaperArgs = {
  input: GenerateQuestionPaperInput;
};


/** Root mutation type — all write operations. */
export type MutationGradeAssignmentSubmissionArgs = {
  feedback?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  marksAwarded: Scalars['Float']['input'];
};


/** Root mutation type — all write operations. */
export type MutationIssueBloodUnitArgs = {
  id: Scalars['ID']['input'];
  patientId: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationIssueHallTicketsArgs = {
  input: IssueHallTicketsInput;
};


/** Root mutation type — all write operations. */
export type MutationIssueLibraryBookArgs = {
  input: IssueLibraryBookInput;
};


/** Root mutation type — all write operations. */
export type MutationIssueToPharmacyArgs = {
  itemId: Scalars['ID']['input'];
  qty: Scalars['Float']['input'];
};


/** Root mutation type — all write operations. */
export type MutationMarkAttendanceArgs = {
  input: MarkAttendanceInput;
};


/** Root mutation type — all write operations. */
export type MutationMarkDriverAttendanceArgs = {
  input: DriverAttendanceInput;
};


/** Root mutation type — all write operations. */
export type MutationMarkMessAttendanceArgs = {
  date: Scalars['String']['input'];
  meal: Scalars['String']['input'];
  studentIds: Array<Scalars['String']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationMarkNotificationReadArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationPingVehicleLocationArgs = {
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  vehicleId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationPublishExamScheduleArgs = {
  id: Scalars['ID']['input'];
  published: Scalars['Boolean']['input'];
};


/** Root mutation type — all write operations. */
export type MutationPublishResultsArgs = {
  input: PublishResultsInput;
};


/** Root mutation type — all write operations. */
export type MutationPublishStudentAssignmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationReceivePurchaseOrderArgs = {
  id: Scalars['ID']['input'];
  input: ReceivePurchaseOrderInput;
};


/** Root mutation type — all write operations. */
export type MutationReceiveStockArgs = {
  itemId: Scalars['ID']['input'];
  qty: Scalars['Float']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationRecordFeePaymentArgs = {
  input: RecordFeePaymentInput;
};


/** Root mutation type — all write operations. */
export type MutationRecordInvoicePaymentArgs = {
  input: RecordInvoicePaymentInput;
};


/** Root mutation type — all write operations. */
export type MutationRecordMealServingArgs = {
  input: RecordMealServingInput;
};


/** Root mutation type — all write operations. */
export type MutationRecordMedicationAdministrationArgs = {
  input: RecordAdministrationInput;
};


/** Root mutation type — all write operations. */
export type MutationRecordPurchasePaymentArgs = {
  input: RecordPurchasePaymentInput;
};


/** Root mutation type — all write operations. */
export type MutationRecordVitalsArgs = {
  input: RecordVitalsInput;
};


/** Root mutation type — all write operations. */
export type MutationRegisterDeviceTokenArgs = {
  input: RegisterDeviceTokenInput;
};


/** Root mutation type — all write operations. */
export type MutationRejectRequestArgs = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationReleaseHallTicketHoldArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationRemoveGoalAssignmentArgs = {
  assignmentId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationRemoveStudentFeeAddOnArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationRemoveStudentFeeDiscountArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationRemoveTransportAllocationArgs = {
  id: Scalars['ID']['input'];
  input: RemoveTransportAllocationInput;
};


/** Root mutation type — all write operations. */
export type MutationReportRadiologyOrderArgs = {
  id: Scalars['ID']['input'];
  input: RadiologyReportInput;
};


/** Root mutation type — all write operations. */
export type MutationResendInviteArgs = {
  userId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationResetRoleAccessArgs = {
  subjectKey: Scalars['String']['input'];
  subjectType: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationReturnLibraryBookArgs = {
  id: Scalars['ID']['input'];
  input: ReturnLibraryBookInput;
};


/** Root mutation type — all write operations. */
export type MutationReviewLeaveArgs = {
  id: Scalars['ID']['input'];
  input: ReviewLeaveInput;
};


/** Root mutation type — all write operations. */
export type MutationRevokeDeviceTokenArgs = {
  token: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationRevokeHallTicketArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationRevokeMySessionArgs = {
  sessionId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationRevokeUserSessionsArgs = {
  userId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSaveGradingSchemeArgs = {
  input: SaveGradingSchemeInput;
};


/** Root mutation type — all write operations. */
export type MutationScheduleSurgeryArgs = {
  input: ScheduleSurgeryInput;
};


/** Root mutation type — all write operations. */
export type MutationScheduleTeleConsultArgs = {
  input: ScheduleTeleConsultInput;
};


/** Root mutation type — all write operations. */
export type MutationSendNotificationArgs = {
  input: SendNotificationInput;
};


/** Root mutation type — all write operations. */
export type MutationSetCurrentAcademicYearArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSetCurriculumSubjectsArgs = {
  input: SetCurriculumSubjectsInput;
};


/** Root mutation type — all write operations. */
export type MutationSetMessMenuArgs = {
  input: MessMenuInput;
};


/** Root mutation type — all write operations. */
export type MutationSetPurchaseOrderStatusArgs = {
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSetRadiologyOrderStatusArgs = {
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSetReferralCommissionArgs = {
  id: Scalars['ID']['input'];
  input: SetReferralCommissionInput;
};


/** Root mutation type — all write operations. */
export type MutationSetReferralStatusArgs = {
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSetSurgeryStatusArgs = {
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSetUserWorkspaceRolesArgs = {
  roles: Array<WorkspaceRoleInput>;
  userId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSettleInsuranceClaimArgs = {
  approvedAmount?: InputMaybe<Scalars['Float']['input']>;
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSettleReferralArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSubmitAssignmentArgs = {
  assignmentId: Scalars['ID']['input'];
  input: SubmitAssignmentInput;
};


/** Root mutation type — all write operations. */
export type MutationSubmitQuizArgs = {
  answers: Array<QuizAnswerInput>;
  assignmentId: Scalars['ID']['input'];
  employeeGoalProgressId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationSyncFeeAllocationArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationTestEmailSettingsArgs = {
  to?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type — all write operations. */
export type MutationTransferAdmissionArgs = {
  input: TransferAdmissionInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateAcademicYearArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAcademicYearInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateAccountArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAccountInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateAmbulanceArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAmbulanceInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateAnnouncementArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAnnouncementInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateAppointmentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAppointmentInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateAttendanceSettingsArgs = {
  input: UpdateAttendanceSettingsInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateBedArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBedInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateBillableServiceArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBillableServiceInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateBloodUnitStatusArgs = {
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationUpdateBrochureContentArgs = {
  content: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationUpdateCalendarSettingsArgs = {
  input: UpdateCalendarSettingsInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateClinicianScheduleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateClinicianScheduleInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateCourseArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCourseInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateCustomRoleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCustomRoleInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateDepartmentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDepartmentInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateDietPlanArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDietPlanInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateDrugArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDrugInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateDutyRosterArgs = {
  id: Scalars['ID']['input'];
  input: UpdateDutyRosterInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateEmailSettingsArgs = {
  input: UpdateEmailSettingsInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateEmployeeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEmployeeInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateEncounterArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEncounterInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateEventArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEventInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateEventCategoryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEventCategoryInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateExamScheduleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateExamScheduleInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateExamTypeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateExamTypeInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateFeeAddOnArgs = {
  id: Scalars['ID']['input'];
  input: UpdateFeeAddOnInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateFeeAllocationArgs = {
  id: Scalars['ID']['input'];
  input: UpdateFeeAllocationInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateFeeCategoryArgs = {
  id: Scalars['ID']['input'];
  input: UpdateFeeCategoryInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateFeeStructureArgs = {
  id: Scalars['ID']['input'];
  input: UpdateFeeStructureInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateHostelRoomArgs = {
  id: Scalars['ID']['input'];
  input: UpdateHostelRoomInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateInsuranceClaimArgs = {
  id: Scalars['ID']['input'];
  input: UpdateInsuranceClaimInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateInsurancePayerArgs = {
  id: Scalars['ID']['input'];
  input: UpdateInsurancePayerInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateInventoryItemArgs = {
  id: Scalars['ID']['input'];
  input: UpdateInventoryItemInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateItemProgressArgs = {
  input: UpdateItemProgressInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateLabTestArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLabTestInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateLearningAssignmentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLearningAssignmentInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateLearningGoalArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLearningGoalInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateLearningQuestionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLearningQuestionInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateLearningSectionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLearningSectionInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateLearningUnitArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLearningUnitInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateLeaveTypeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLeaveTypeInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateLibraryBookArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLibraryBookInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateMarkArgs = {
  id: Scalars['ID']['input'];
  input: UpdateMarkInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateMessExpenseArgs = {
  id: Scalars['ID']['input'];
  input: MessExpenseInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateOpdSlipConfigArgs = {
  content: Scalars['String']['input'];
};


/** Root mutation type — all write operations. */
export type MutationUpdateOperationTheatreArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOperationTheatreInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateOrgProfileArgs = {
  input: UpdateOrgProfileInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdatePatientArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePatientInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdatePayrollStatusArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePayrollStatusInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdatePurchaseOrderArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePurchaseOrderInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateQuestionBankItemArgs = {
  id: Scalars['ID']['input'];
  input: UpdateQuestionBankItemInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateRadiologyStudyArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRadiologyStudyInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateRoleAccessArgs = {
  input: UpdateRoleAccessInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateRoomClassArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRoomClassInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateSalaryAssignmentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSalaryAssignmentInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateSalaryStructureArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSalaryStructureInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateSalaryTemplateArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSalaryTemplateInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateStudentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateStudentInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateStudentAssignmentArgs = {
  id: Scalars['ID']['input'];
  input: UpdateStudentAssignmentInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateSubjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSubjectInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateTeleConsultArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTeleConsultInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateTimetableSlotArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTimetableSlotInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateTransportRouteArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTransportRouteInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateTransportVehicleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTransportVehicleInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateTriageCaseArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTriageCaseInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateVendorArgs = {
  id: Scalars['ID']['input'];
  input: UpdateVendorInput;
};


/** Root mutation type — all write operations. */
export type MutationUpdateWardArgs = {
  id: Scalars['ID']['input'];
  input: UpdateWardInput;
};


/** Root mutation type — all write operations. */
export type MutationUploadUnitVideoArgs = {
  contentType: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  unitId: Scalars['ID']['input'];
};


/** Root mutation type — all write operations. */
export type MutationUpsertCalendarDayArgs = {
  input: UpsertCalendarDayInput;
};


/** Root mutation type — all write operations. */
export type MutationVacateHostelRoomArgs = {
  id: Scalars['ID']['input'];
  input: VacateHostelRoomInput;
};

/**
 * A published assignment as a student sees it, with their own submission
 * attached (null when they have not submitted yet).
 */
export type MyAssignment = {
  __typename?: 'MyAssignment';
  assignment: StudentAssignment;
  /** False once the assignment is closed, so the UI can hide the submit form. */
  canSubmit: Scalars['Boolean']['output'];
  /** True when submitted after the due date. */
  late: Scalars['Boolean']['output'];
  submission: Maybe<AssignmentSubmission>;
};

/**
 * A clinician's own calendar for a date range: the weekly consulting windows they
 * keep, plus every appointment booked into them. Scoped to the caller, so a doctor
 * sees this without needing access to the admin Schedules or Appointments pages.
 */
export type MyClinicianCalendar = {
  __typename?: 'MyClinicianCalendar';
  /** Appointments falling inside the requested range, earliest first. */
  appointments: Array<Appointment>;
  /** Employee UUID of the calling clinician. */
  clinicianId: Scalars['ID']['output'];
  /** Clinician display name. */
  clinicianName: Scalars['String']['output'];
  /** Weekly consulting windows (all days, both active and inactive). */
  windows: Array<ClinicianSchedule>;
};

/** An in-app notification for a specific user. */
export type NotificationItem = {
  __typename?: 'NotificationItem';
  /** Notification body text. */
  body: Maybe<Scalars['String']['output']>;
  /** Category for grouping: fee | leave | payroll | attendance | general. */
  category: Scalars['String']['output'];
  /** ISO 8601 timestamp when the notification was created. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether the user has read this notification. */
  isRead: Scalars['Boolean']['output'];
  /** UUID of the related entity (e.g. leave application ID). */
  refId: Maybe<Scalars['String']['output']>;
  /** Type of the related entity (e.g. leave, fee_payment). */
  refType: Maybe<Scalars['String']['output']>;
  /** Short notification title. */
  title: Scalars['String']['output'];
  /** Notification type (informational, alert, reminder, etc.). */
  type: Scalars['String']['output'];
  /** Recipient user UUID. */
  userId: Scalars['String']['output'];
};

export type OperationTheatre = {
  __typename?: 'OperationTheatre';
  active: Scalars['Boolean']['output'];
  code: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  location: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

/** A node in the org hierarchy tree. */
export type OrgNode = {
  __typename?: 'OrgNode';
  children: Array<OrgNode>;
  departmentId: Maybe<Scalars['ID']['output']>;
  designation: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  managerId: Maybe<Scalars['ID']['output']>;
  name: Scalars['String']['output'];
  photoUrl: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

/** Organisation branding and profile settings. */
export type OrgProfile = {
  __typename?: 'OrgProfile';
  accentColor: Scalars['String']['output'];
  accreditation: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  logoUrl: Scalars['String']['output'];
  name: Scalars['String']['output'];
  primaryColor: Scalars['String']['output'];
  /** Whether staff (teachers/staff) must have an email. When false they sign in by Employee ID. */
  staffEmailRequired: Scalars['Boolean']['output'];
  /** Whether students must have an email. When false they sign in by Roll Number. */
  studentEmailRequired: Scalars['Boolean']['output'];
  tagline: Scalars['String']['output'];
};

/** Boolean flags indicating which setup steps are complete. */
export type OrgSetupStatus = {
  __typename?: 'OrgSetupStatus';
  academicYear: Scalars['Boolean']['output'];
  departments: Scalars['Boolean']['output'];
  firstUser: Scalars['Boolean']['output'];
  orgProfile: Scalars['Boolean']['output'];
};

/** Full org structure response — roots forest + flat list. */
export type OrgStructure = {
  __typename?: 'OrgStructure';
  roots: Array<OrgNode>;
  users: Array<OrgUser>;
};

/** Slim user representation for org structure / manager trees. */
export type OrgUser = {
  __typename?: 'OrgUser';
  departmentId: Maybe<Scalars['ID']['output']>;
  designation: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  managerId: Maybe<Scalars['ID']['output']>;
  name: Scalars['String']['output'];
  photoUrl: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

/** A person treated by the facility — the healthcare-industry counterpart of Student. Managed by staff; no login account. */
export type Patient = {
  __typename?: 'Patient';
  /** Street address. */
  address: Maybe<Scalars['String']['output']>;
  /** Known allergies (free text, surfaced on every encounter). */
  allergies: Maybe<Scalars['String']['output']>;
  /** Blood group. */
  bloodGroup: Maybe<Scalars['String']['output']>;
  /** Chronic conditions (free text). */
  chronicConditions: Maybe<Scalars['String']['output']>;
  /** City. */
  city: Maybe<Scalars['String']['output']>;
  /** Creation timestamp (RFC3339). */
  createdAt: Maybe<Scalars['String']['output']>;
  /** Date of birth (YYYY-MM-DD). */
  dateOfBirth: Maybe<Scalars['String']['output']>;
  /** Contact email. */
  email: Maybe<Scalars['String']['output']>;
  /** Emergency contact name. */
  emergencyName: Maybe<Scalars['String']['output']>;
  /** Emergency contact phone. */
  emergencyPhone: Maybe<Scalars['String']['output']>;
  /** First name. */
  firstName: Scalars['String']['output'];
  /** Gender. */
  gender: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Last name. */
  lastName: Maybe<Scalars['String']['output']>;
  /** Medical Record Number, unique within the tenant. */
  mrn: Scalars['String']['output'];
  /** Contact phone. */
  phone: Maybe<Scalars['String']['output']>;
  /** Postal code. */
  pincode: Maybe<Scalars['String']['output']>;
  /** First registration timestamp (RFC3339). */
  registeredAt: Maybe<Scalars['String']['output']>;
  /** State. */
  state: Maybe<Scalars['String']['output']>;
  /** Status: active | inactive | deceased. */
  status: Scalars['String']['output'];
  /** Lifetime Unique Health ID. Server-assigned on registration. */
  uhid: Maybe<Scalars['String']['output']>;
};

/** A patient's own dashboard summary counts. */
export type PatientPortalSummary = {
  __typename?: 'PatientPortalSummary';
  activeReferrals: Scalars['Int']['output'];
  labOrders: Scalars['Int']['output'];
  upcomingAppointments: Scalars['Int']['output'];
  visits: Scalars['Int']['output'];
};

/** Input for creating or updating banking/PF details on an employee. */
export type PaymentDetailsInput = {
  /** Bank account number. */
  accountNumber?: InputMaybe<Scalars['String']['input']>;
  /** Account type: savings | current. */
  accountType?: InputMaybe<Scalars['String']['input']>;
  /** Bank name. */
  bankName?: InputMaybe<Scalars['String']['input']>;
  /** Branch name. */
  branchName?: InputMaybe<Scalars['String']['input']>;
  /** ESI dispensary. */
  esiDispensary?: InputMaybe<Scalars['String']['input']>;
  /** ESI number. */
  esiNumber?: InputMaybe<Scalars['String']['input']>;
  /** Form 16 reference. */
  form16Ref?: InputMaybe<Scalars['String']['input']>;
  /** Gratuity eligibility flag. */
  gratuityEligible?: InputMaybe<Scalars['Boolean']['input']>;
  /** IFSC code. */
  ifscCode?: InputMaybe<Scalars['String']['input']>;
  /** NPS account number. */
  npsAccountNumber?: InputMaybe<Scalars['String']['input']>;
  /** NPS tier. */
  npsTier?: InputMaybe<Scalars['String']['input']>;
  /** PAN number. */
  panNumber?: InputMaybe<Scalars['String']['input']>;
  /** Employee PF contribution %. */
  pfEmployeePercent?: InputMaybe<Scalars['Float']['input']>;
  /** Employer PF contribution %. */
  pfEmployerPercent?: InputMaybe<Scalars['Float']['input']>;
  /** PF member number. */
  pfNumber?: InputMaybe<Scalars['String']['input']>;
  /** Tax regime: old | new. */
  taxRegime?: InputMaybe<Scalars['String']['input']>;
  /** UAN number. */
  uanNumber?: InputMaybe<Scalars['String']['input']>;
};

/** A single monthly payroll record for an employee. */
export type Payroll = {
  __typename?: 'Payroll';
  /** Basic salary component. */
  basicSalary: Scalars['Float']['output'];
  /** Dearness Allowance. */
  da: Scalars['Float']['output'];
  /** The employee this payroll record belongs to. */
  employee: Maybe<Employee>;
  /** Employee UUID. */
  employeeId: Scalars['String']['output'];
  /** ESI deduction. */
  esi: Scalars['Float']['output'];
  /** Per-assignment extra allowance on top of template. */
  extraAllowance: Scalars['Float']['output'];
  /** Per-assignment extra deduction on top of template. */
  extraDeduction: Scalars['Float']['output'];
  /** Gross salary (sum of all allowances + basic). */
  grossSalary: Scalars['Float']['output'];
  /** House Rent Allowance. */
  hra: Scalars['Float']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Days taken as leave. */
  leaveDays: Scalars['Int']['output'];
  /** Medical allowance. */
  medicalAllowance: Scalars['Float']['output'];
  /** Payroll month (1–12). */
  month: Scalars['Int']['output'];
  /** Net salary after deductions. */
  netSalary: Scalars['Float']['output'];
  /** Internal notes. */
  notes: Maybe<Scalars['String']['output']>;
  /** Other allowances. */
  otherAllowances: Scalars['Float']['output'];
  /** Other deductions. */
  otherDeductions: Scalars['Float']['output'];
  /** Date on which salary was disbursed (YYYY-MM-DD). */
  paymentDate: Maybe<Scalars['String']['output']>;
  /** Payment mode: bank_transfer | cheque | cash. */
  paymentMode: Maybe<Scalars['String']['output']>;
  /** PF deduction. */
  pf: Scalars['Float']['output'];
  /** Days the employee was present. */
  presentDays: Scalars['Int']['output'];
  /** UUID of the user who processed this payroll. */
  processedBy: Maybe<Scalars['String']['output']>;
  /** Status: draft | approved | paid. */
  status: Scalars['String']['output'];
  /** Travel Allowance. */
  ta: Scalars['Float']['output'];
  /** TDS deduction. */
  tds: Scalars['Float']['output'];
  /** Salary template name snapshotted at generation time. */
  templateName: Maybe<Scalars['String']['output']>;
  /** Total deductions. */
  totalDeductions: Scalars['Float']['output'];
  /** Total working days in the month. */
  workingDays: Scalars['Int']['output'];
  /** Payroll year. */
  year: Scalars['Int']['output'];
};

/** Monthly payroll aggregation row. */
export type PayrollMonthRow = {
  __typename?: 'PayrollMonthRow';
  /** Number of employees paid. */
  employeeCount: Scalars['Int']['output'];
  /** Total gross salary disbursed. */
  grossSalary: Scalars['Float']['output'];
  /** Month label (e.g. January). */
  month: Scalars['String']['output'];
  /** Total net salary disbursed. */
  netSalary: Scalars['Float']['output'];
  /** Total deductions. */
  totalDeductions: Scalars['Float']['output'];
};

/** Annual payroll report with monthly trend. */
export type PayrollReportResult = {
  __typename?: 'PayrollReportResult';
  /** Month-by-month payroll trend. */
  monthlyTrend: Array<PayrollMonthRow>;
  /** Number of distinct employees paid during the year. */
  totalEmployees: Scalars['Int']['output'];
  /** Total gross salary for the year. */
  totalGross: Scalars['Float']['output'];
  /** Total net salary for the year. */
  totalNet: Scalars['Float']['output'];
  /** Year covered by the report. */
  year: Scalars['String']['output'];
};

/** Aggregate payroll statistics for a given month. */
export type PayrollSummary = {
  __typename?: 'PayrollSummary';
  /** Number of records in approved status. */
  approvedCount: Scalars['Int']['output'];
  /** Number of records in draft status. */
  draftCount: Scalars['Int']['output'];
  /** Number of records in paid status. */
  paidCount: Scalars['Int']['output'];
  /** Sum of all deductions. */
  totalDeductions: Scalars['Float']['output'];
  /** Total number of employees with a payroll entry. */
  totalEmployees: Scalars['Int']['output'];
  /** Sum of all gross salaries. */
  totalGross: Scalars['Float']['output'];
  /** Sum of all net salaries. */
  totalNet: Scalars['Float']['output'];
};

export type PeepalAiAnswer = {
  __typename?: 'PeepalAIAnswer';
  answer: Scalars['String']['output'];
  columns: Array<Scalars['String']['output']>;
  denied: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  rows: Array<Array<Scalars['String']['output']>>;
  sql: Scalars['String']['output'];
};

/** Tenant count on a single plan. */
export type PlanCount = {
  __typename?: 'PlanCount';
  planId: Scalars['String']['output'];
  planName: Scalars['String']['output'];
  priceMonthly: Scalars['Float']['output'];
  tenants: Scalars['Int']['output'];
};

/** Top-level platform analytics payload for the super-admin dashboard. */
export type PlatformAnalytics = {
  __typename?: 'PlatformAnalytics';
  /** When this snapshot was computed (RFC3339). */
  generatedAt: Scalars['String']['output'];
  /** People totals across all tenants. */
  people: PlatformPeopleStats;
  /** Quota utilisation and breaches across tenants. */
  quota: PlatformQuotaStats;
  /** Subscription mix, billing status and estimated revenue. */
  subscriptions: PlatformSubscriptionStats;
  /** Tenant counts, growth and type mix. */
  tenants: PlatformTenantStats;
};

/** People totals across all customer tenants. */
export type PlatformPeopleStats = {
  __typename?: 'PlatformPeopleStats';
  employees: Scalars['Int']['output'];
  students: Scalars['Int']['output'];
  /** Largest tenants by combined student + employee headcount (top 8). */
  topTenants: Array<TenantPeopleCount>;
  /** All user accounts (excluding the platform tenant). */
  users: Scalars['Int']['output'];
};

/** Quota utilisation and breaches across tenants. */
export type PlatformQuotaStats = {
  __typename?: 'PlatformQuotaStats';
  /** Tenants over quota with breach detail (top 8 by overage). */
  breaches: Array<TenantQuotaBreach>;
  /** Aggregate employee limit across tenants that have an employee limit. */
  employeeLimit: Scalars['Int']['output'];
  /** Aggregate employee usage across tenants that have an employee limit. */
  employeeUsage: Scalars['Int']['output'];
  /** Tenants currently over at least one quota. */
  overQuota: Scalars['Int']['output'];
  /** Aggregate student limit across tenants that have a student limit. */
  studentLimit: Scalars['Int']['output'];
  /** Aggregate student usage across tenants that have a student limit. */
  studentUsage: Scalars['Int']['output'];
};

/** Subscription mix, billing status and estimated revenue. */
export type PlatformSubscriptionStats = {
  __typename?: 'PlatformSubscriptionStats';
  /** Tenants with an active or trial subscription. */
  active: Scalars['Int']['output'];
  /** Tenant count per plan. */
  byPlan: Array<PlanCount>;
  /** Subscription count per status (active/trial/suspended/expired). */
  byStatus: Array<SubStatusCount>;
  /** Estimated monthly recurring revenue (annual plans normalised to /12). */
  estimatedMrr: Scalars['Float']['output'];
  /** Active/trial subscriptions whose end date is within the next 30 days. */
  expiringSoon: Scalars['Int']['output'];
  /** Customer tenants with no subscription assigned. */
  unsubscribed: Scalars['Int']['output'];
};

/** Tenant counts and growth over time. */
export type PlatformTenantStats = {
  __typename?: 'PlatformTenantStats';
  active: Scalars['Int']['output'];
  /** Tenant count grouped by canonical type (education/corporate/...). */
  byType: Array<TenantTypeCount>;
  /** Signups per month for the trailing 12 months, oldest first. */
  growth: Array<TenantGrowthPoint>;
  /** Tenants created in the current calendar month. */
  newThisMonth: Scalars['Int']['output'];
  suspended: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** Filter criteria for bulk-publishing results. */
export type PublishResultsInput = {
  /** Course UUID filter. */
  courseId?: InputMaybe<Scalars['String']['input']>;
  /** Exam type filter. */
  examType?: InputMaybe<Scalars['String']['input']>;
  /** Semester filter. */
  semester?: InputMaybe<Scalars['Int']['input']>;
  /** Subject name filter. */
  subject?: InputMaybe<Scalars['String']['input']>;
};

/** A supplier bill, optionally against a purchase order. */
export type PurchaseInvoice = {
  __typename?: 'PurchaseInvoice';
  createdAt: Maybe<Scalars['String']['output']>;
  dueDate: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  invoiceDate: Maybe<Scalars['String']['output']>;
  invoiceNumber: Scalars['String']['output'];
  paidAmount: Scalars['Float']['output'];
  purchaseOrderId: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  subtotal: Scalars['Float']['output'];
  taxTotal: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
  vendor: Maybe<Vendor>;
  vendorId: Scalars['String']['output'];
};

/** A purchase order sent to a vendor. */
export type PurchaseOrder = {
  __typename?: 'PurchaseOrder';
  createdAt: Maybe<Scalars['String']['output']>;
  expectedDate: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  items: Array<PurchaseOrderItem>;
  notes: Maybe<Scalars['String']['output']>;
  orderDate: Maybe<Scalars['String']['output']>;
  poNumber: Scalars['String']['output'];
  status: Scalars['String']['output'];
  subtotal: Scalars['Float']['output'];
  taxTotal: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
  vendor: Maybe<Vendor>;
  vendorId: Scalars['String']['output'];
};

/** One ordered line on a purchase order. */
export type PurchaseOrderItem = {
  __typename?: 'PurchaseOrderItem';
  id: Scalars['ID']['output'];
  itemId: Maybe<Scalars['String']['output']>;
  itemName: Scalars['String']['output'];
  lineTotal: Scalars['Float']['output'];
  qty: Scalars['Float']['output'];
  receivedQty: Scalars['Float']['output'];
  taxPct: Scalars['Float']['output'];
  unitCost: Scalars['Float']['output'];
};

export type PurchaseOrderItemInput = {
  itemId?: InputMaybe<Scalars['String']['input']>;
  itemName: Scalars['String']['input'];
  qty: Scalars['Float']['input'];
  taxPct?: InputMaybe<Scalars['Float']['input']>;
  unitCost: Scalars['Float']['input'];
};

/** Root query type — all read operations. */
export type Query = {
  __typename?: 'Query';
  /** List all academic years defined for the tenant. */
  academicYears: Array<AcademicYear>;
  /** Full role access matrix for the tenant (admin only). */
  accessMatrix: AccessMatrix;
  account: Maybe<Account>;
  accountLedger: AccountLedger;
  accounts: Array<Account>;
  accountsPayableAging: Array<AgingRow>;
  accountsReceivableAging: Array<AgingRow>;
  admission: Maybe<Admission>;
  /** List admissions. Defaults to currently-admitted; pass status for history. */
  admissions: Array<Admission>;
  /** Admin: all announcements regardless of target role or publish status. */
  allAnnouncements: Array<AnnouncementItem>;
  ambulanceTrips: Array<AmbulanceTrip>;
  ambulances: Array<Ambulance>;
  /** Announcements visible to the current user based on their role. */
  announcements: Array<AnnouncementItem>;
  /** One appointment by id, for the printable OPD slip. Same visibility scoping as the appointments list. */
  appointment: Maybe<Appointment>;
  /** List appointments. All filters optional and combinable. */
  appointments: Array<Appointment>;
  askPeepalAI: PeepalAiAnswer;
  /** List quiz questions for an assignment. */
  assignmentQuestions: Array<LearningQuestion>;
  /** Every submission against one assignment (teacher/admin grading view). */
  assignmentSubmissions: Array<AssignmentSubmission>;
  /** Query attendance records. All filters are optional. */
  attendance: Array<AttendanceRecord>;
  /** Attendance report with daily breakdown for a date range. */
  attendanceReport: AttendanceReportResult;
  /** Fetch per-tenant attendance configuration. */
  attendanceSettings: AttendanceSettings;
  /** Students whose attendance percentage falls below the configured threshold. */
  attendanceShortage: ShortageList;
  /** Per-entity attendance summary (total, present, absent, late, percentage). */
  attendanceSummary: Array<AttendanceSummaryRow>;
  auditLogs: Array<AuditLog>;
  balanceSheet: FinancialStatement;
  /** List beds, optionally filtered to one ward or one status. */
  beds: Array<Bed>;
  /** List billable services. Active only unless includeInactive is true. */
  billableServices: Array<BillableService>;
  bloodRequests: Array<BloodRequest>;
  bloodUnits: Array<BloodUnit>;
  /** The saved brochure content as a JSON string for the current tenant, or null when nothing has been saved yet. */
  brochureContent: Maybe<Scalars['String']['output']>;
  /** Month view — all days with type/name and working-day count. */
  calendarMonth: CalendarMonth;
  /** Fetch the tenant's calendar generation settings. */
  calendarSettings: CalendarSettings;
  /** List clinician availability windows, optionally for one clinician. */
  clinicianSchedules: Array<ClinicianSchedule>;
  /** List batches for a given course. */
  courseBatches: Array<CourseBatch>;
  /** List all courses offered by the institution. */
  courses: Array<Course>;
  /** List the curriculum (assigned subjects per semester) for a course. */
  curriculum: Array<CurriculumSubject>;
  /** List custom roles for the tenant. */
  customRoles: Array<CustomRole>;
  /** Key counts for the dashboard summary cards. */
  dashboardStats: DashboardStats;
  /** List employee progress rows for a department (admin). */
  departmentLearningProgress: Array<EmployeeGoalProgress>;
  /** List all departments in the tenant. */
  departments: Array<Department>;
  dietPlans: Array<DietPlan>;
  /** List dispenses. All filters optional. */
  dispenses: Array<Dispense>;
  /** Driver day sheets. Pass date for one day, or from/to for a range. */
  driverAttendance: Array<DriverAttendance>;
  /** Batches for a drug, ordered earliest-expiry-first (FEFO). */
  drugBatches: Array<DrugBatch>;
  /** List pharmacy drugs. Active only unless includeInactive is true; search matches name/generic. */
  drugs: Array<Drug>;
  /**
   * List duty-roster shifts. All filters optional; non-admins are always
   * scoped to their own shifts regardless of employeeId.
   */
  dutyRoster: Array<DutyRoster>;
  /** Whether the calling tenant can currently send email, and why. */
  emailSendStatus: EmailSendStatus;
  /** The calling tenant's own email (SMTP) settings. */
  emailSettings: EmailSettings;
  /** Fetch a single employee by ID. */
  employee: Maybe<Employee>;
  /** Learning goals assigned to a specific employee (admin or self). */
  employeeLearningGoals: Array<EmployeeGoalProgress>;
  /** List all employees in the tenant, with user, department, and payment detail associations. */
  employees: Array<Employee>;
  /** Fetch a single encounter by ID. */
  encounter: Maybe<Encounter>;
  /** List encounters (clinical visits). All filters optional and combinable. */
  encounters: Array<Encounter>;
  /** List tenant-defined event categories. */
  eventCategories: Array<EventCategory>;
  /** List college calendar events, optionally filtered by category. */
  events: Array<EventItem>;
  /** List exam schedules, optionally filtered by semester and/or exam type. */
  examSchedules: Array<ExamSchedule>;
  /** List exam types (assessment definitions), optionally filtered by department. Org-wide types are always included. Returns active types only unless includeInactive is true. */
  examTypes: Array<ExamType>;
  /** Drug batches expiring within the given number of days (pharmacy dashboard). */
  expiringDrugs: Array<DrugBatch>;
  /** List all fee add-ons (optional facility charges like Transport, Hostel, Mess). */
  feeAddOns: Array<FeeAddOn>;
  /** Fetch a single allocation with its installment schedule. */
  feeAllocation: Maybe<FeeAllocation>;
  /** List fee allocations (installment payment plans), optionally filtered by structure or course. */
  feeAllocations: Array<FeeAllocation>;
  /** List all fee categories (master fee codes like TUITION, TRANSPORT, FOOD). */
  feeCategories: Array<FeeCategory>;
  /** Aggregate fee collection summary across all student fees. */
  feeCollectionSummary: FeeCollectionSummary;
  /** Collection analytics for the fees overview: totals plus course, mode, and monthly breakdowns. */
  feeOverview: FeeOverview;
  /** List fee payments. All filters are optional. */
  feePayments: Array<FeePayment>;
  /** Fee collection report grouped by month, payment mode, and category. */
  feeReport: FeeReportResult;
  /** Fetch a single fee structure with its items. */
  feeStructure: Maybe<FeeStructure>;
  /** List course fee structures (variations) with per-year items, optionally filtered by course. */
  feeStructures: Array<FeeStructure>;
  /** List department assignments for a given goal (admin). */
  goalAssignments: Array<GoalAssignmentItem>;
  /** The tenant's grading configuration (created with defaults on first read). */
  gradingScheme: GradingScheme;
  /** List hall tickets issued for an exam schedule. */
  hallTickets: Array<HallTicket>;
  /** Health check. Returns true when the API is up. */
  health: Scalars['Boolean']['output'];
  /** List holidays, optionally filtered by year or academic year. */
  holidays: Array<Holiday>;
  /** List hostel allocations, optionally filtered by status. */
  hostelAllocations: Array<HostelAllocation>;
  /** List hostel blocks. */
  hostelBlocks: Array<HostelBlock>;
  /** List hostel rooms, optionally filtered by block. */
  hostelRooms: Array<HostelRoom>;
  insuranceClaim: Maybe<InsuranceClaim>;
  insuranceClaims: Array<InsuranceClaim>;
  insurancePayers: Array<InsurancePayer>;
  inventoryItems: Array<InventoryItem>;
  /** Fetch a single invoice with items and payments. */
  invoice: Maybe<Invoice>;
  /** List invoices. All filters optional and combinable. */
  invoices: Array<Invoice>;
  /** Fetch a single lab order by ID. */
  labOrder: Maybe<LabOrder>;
  /** List lab orders. All filters optional and combinable. */
  labOrders: Array<LabOrder>;
  /** List lab tests in the catalog. search matches code/name; includeInactive shows disabled tests. */
  labTests: Array<LabTest>;
  /** Fetch a single learning goal by ID (admin). */
  learningGoal: Maybe<LearningGoal>;
  /** List all learning goals in the tenant (admin). */
  learningGoals: Array<LearningGoal>;
  /** Admin: list all leave balances, optionally filtered by year or user. */
  leaveBalances: Array<LeaveBalance>;
  /** Leave report with status breakdown, monthly trend, and department breakdown. */
  leaveReport: LeaveReportResult;
  /** List all leave type configurations active in the tenant. */
  leaveTypes: Array<LeaveTypeConfig>;
  /** List leave applications visible to the caller, optionally filtered by status. */
  leaves: Array<LeaveRecord>;
  ledgerBatches: Array<LedgerBatch>;
  /** List library books with optional search and category filter. */
  libraryBooks: Array<LibraryBook>;
  /** List library issue records. */
  libraryIssues: Array<LibraryIssue>;
  /** List overdue library issues. */
  libraryOverdue: Array<LibraryIssue>;
  /** Every vehicle with its last known position (live map feed). */
  liveVehicles: Array<LiveVehicle>;
  /** Query mark entries. All filters are optional. Supports offset pagination via limit/offset. */
  marks: Array<Mark>;
  /** Total count of marks matching the same filters (for display). */
  marksCount: Scalars['Int']['output'];
  /** Marks report with grade distribution and per-subject averages. */
  marksReport: MarksReportResult;
  medicationOrders: Array<MedicationOrder>;
  /** Meal roster for a date + meal: every eligible student with their mark. */
  messAttendance: Array<MessAttendanceRow>;
  /** Totals for the same window as messExpenses. */
  messExpenseSummary: MessExpenseSummary;
  /** Provisioning expenses in a date range. */
  messExpenses: Array<MessExpense>;
  /** Weekly menu, optionally for one hostel block. */
  messMenu: Array<MessMenu>;
  /** The effective module access for the currently authenticated user. */
  myAccess: Array<ModuleAccess>;
  /** Approval requests the caller has raised. */
  myApprovals: Array<ApprovalRequest>;
  /**
   * Self-service: published assignments for the caller's own
   * course/semester/section, each with their own submission.
   */
  myAssignments: Array<MyAssignment>;
  /**
   * The calling clinician's calendar between two YYYY-MM-DD dates (inclusive).
   * Errors when the caller has no employee record.
   */
  myClinicianCalendar: MyClinicianCalendar;
  /**
   * The calling user's registered devices, newest first. Backs the "signed-in
   * devices" screen so a user can see and drop an install they no longer have.
   */
  myDeviceTokens: Array<DeviceToken>;
  /** Payment history of the currently authenticated student. */
  myFeePayments: Array<FeePayment>;
  /** The signed-in student's own hall tickets (self-service, portal). */
  myHallTickets: Array<HallTicket>;
  /** Learning goals assigned to the currently authenticated employee. */
  myLearningGoals: Array<EmployeeGoalProgress>;
  /** Leave balance for the currently authenticated user. */
  myLeaveBalance: Array<LeaveBalance>;
  /**
   * Self-service: this week's menu for the caller's own hostel block
   * (falls back to the campus-wide menu).
   */
  myMessMenu: Array<MessMenu>;
  /** Notifications sent to the currently authenticated user. */
  myNotifications: Array<NotificationItem>;
  myPatientAppointments: Array<Appointment>;
  myPatientLabOrders: Array<LabOrder>;
  myPatientProfile: Maybe<Patient>;
  myPatientRadiologyOrders: Array<RadiologyOrder>;
  myPatientReferrals: Array<Referral>;
  myPatientSummary: PatientPortalSummary;
  myPatientTeleConsults: Array<TeleConsult>;
  myPatientVisits: Array<Encounter>;
  /** Payroll records for the currently authenticated employee. */
  myPayrolls: Array<Payroll>;
  /**
   * The calling user's live sessions, most recently used first. Backs the
   * "where you're signed in" screen.
   */
  mySessions: Array<UserSession>;
  /** Fee records of the currently authenticated student. */
  myStudentFees: Array<StudentFee>;
  /** Workspaces the calling user may switch into, in display order. */
  myWorkspaces: Array<Workspace>;
  /** The tenant's saved OPD slip design as a JSON string, or null when the admin has not customised it yet. */
  opdSlipConfig: Maybe<Scalars['String']['output']>;
  operationTheatres: Array<OperationTheatre>;
  /** Fetch the tenant's org profile (branding + settings). */
  orgProfile: OrgProfile;
  /** Completion flags for the org setup wizard. */
  orgSetupStatus: OrgSetupStatus;
  /** Full org structure as a manager hierarchy forest. */
  orgStructure: OrgStructure;
  /** List all users with manager/dept for the org tree. */
  orgUsers: Array<OrgUser>;
  /** Fetch a single patient by ID. */
  patient: Maybe<Patient>;
  /** List patients. All filters optional; search matches name, MRN, and phone. Supports offset pagination. */
  patients: Array<Patient>;
  /** Total count of patients matching the same filters. */
  patientsCount: Scalars['Int']['output'];
  /** Payroll report with monthly salary trend for a year. */
  payrollReport: PayrollReportResult;
  /** Aggregate payroll summary for a given month/year. */
  payrollSummary: PayrollSummary;
  /** List payroll records. All filters are optional and combinable. */
  payrolls: Array<Payroll>;
  /** Approval requests pending the caller's action. */
  pendingApprovals: Array<ApprovalRequest>;
  /**
   * Platform-wide analytics for the super-admin dashboard: tenant growth, people
   * totals, subscription mix and revenue, and quota utilisation. Aggregates
   * across every customer tenant (the internal platform tenant is excluded).
   * Super-admin only.
   */
  platformAnalytics: PlatformAnalytics;
  profitAndLoss: FinancialStatement;
  /** Fetch marks that have been published to students. */
  publishedResults: Array<Mark>;
  /** List supplier invoices, optionally filtered by payment status. */
  purchaseInvoices: Array<PurchaseInvoice>;
  /** One purchase order with its line items. */
  purchaseOrder: Maybe<PurchaseOrder>;
  /** List purchase orders, optionally filtered by status and/or vendor. */
  purchaseOrders: Array<PurchaseOrder>;
  /** List question-bank items for one curriculum subject. Filters are optional and stack. */
  questionBank: Array<QuestionBankItem>;
  /** Fetch one question paper with its frozen items. */
  questionPaper: Maybe<QuestionPaper>;
  /** List generated question papers, newest first. */
  questionPapers: Array<QuestionPaper>;
  radiologyOrder: Maybe<RadiologyOrder>;
  radiologyOrders: Array<RadiologyOrder>;
  radiologyStudies: Array<RadiologyStudy>;
  referrals: Array<Referral>;
  /** Aggregate pass/fail summary for a course semester. */
  resultSummary: ResultSummary;
  /** List room classes (reusable pricing templates for hostel rooms). */
  roomClasses: Array<RoomClass>;
  /** List salary assignments, optionally filtered by employee. */
  salaryAssignments: Array<SalaryAssignment>;
  /** List salary structures, optionally filtered by employee. */
  salaryStructures: Array<SalaryStructure>;
  /** List salary templates. */
  salaryTemplates: Array<SalaryTemplate>;
  /** List semesters, optionally filtered by academic year. */
  semesters: Array<Semester>;
  stockTransactions: Array<StockTransaction>;
  /** Fetch a single student by ID. */
  student: Maybe<Student>;
  /**
   * Compute a student's semester-wise and cumulative results from published marks
   * using the tenant's grading scheme. Students get their own result; admins and
   * teachers may pass a studentId.
   */
  studentAcademicResult: AcademicResult;
  /** One assignment by id (teacher/admin). */
  studentAssignment: Maybe<StudentAssignment>;
  /** Assignments set by teachers. Teachers see their own; admins see all. */
  studentAssignments: Array<StudentAssignment>;
  /** List materialized student fee records. All filters are optional. */
  studentFees: Array<StudentFee>;
  /** List students, optionally filtered by course and/or semester. */
  students: Array<Student>;
  /** Fetch a single subject by ID. */
  subject: Maybe<Subject>;
  /** List subjects, optionally filtered by department or a search term. */
  subjects: Array<Subject>;
  surgeries: Array<SurgerySchedule>;
  /** List the tenant's built-in system roles, industry-labelled and ordered. */
  systemRoles: Array<SystemRole>;
  /** Tenant-admin view of whether a newer release is available for this install. */
  systemUpdateStatus: SystemUpdateStatus;
  teleConsults: Array<TeleConsult>;
  /** Fetch the label map for the current tenant's vertical. */
  terminology: TerminologyPayload;
  /** Query timetable slots. All filters are optional and combinable. */
  timetable: Array<TimetableSlot>;
  /** List all transport allocations. */
  transportAllocations: Array<TransportAllocation>;
  /** List all transport routes. */
  transportRoutes: Array<TransportRoute>;
  /** List transport vehicles, optionally filtered by route. */
  transportVehicles: Array<TransportVehicle>;
  triageCases: Array<TriageCase>;
  trialBalance: Array<TrialBalanceRow>;
  /** Count of unread notifications for the currently authenticated user. */
  unreadNotificationCount: UnreadCount;
  /**
   * One user's live sessions. Admin-only, and scoped to the caller's tenant, so
   * an admin can see what they are about to sign out.
   */
  userSessions: Array<UserSession>;
  /**
   * Workspaces held by any user in the tenant (admin only). Includes their
   * primary role as the first, non-revocable entry.
   */
  userWorkspaces: Array<Workspace>;
  /** List all user accounts in the tenant. */
  users: Array<User>;
  /** List suppliers. Pass active to filter by active flag. */
  vendors: Array<Vendor>;
  vitalsRecords: Array<VitalsRecord>;
  ward: Maybe<Ward>;
  wards: Array<Ward>;
};


/** Root query type — all read operations. */
export type QueryAccountArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryAccountLedgerArgs = {
  accountId: Scalars['ID']['input'];
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAccountsArgs = {
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAccountsPayableAgingArgs = {
  asOf?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAccountsReceivableAgingArgs = {
  asOf?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAdmissionArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryAdmissionsArgs = {
  patientId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  wardId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAmbulanceTripsArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAmbulancesArgs = {
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type — all read operations. */
export type QueryAppointmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryAppointmentsArgs = {
  clinicianId?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  patientId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAskPeepalAiArgs = {
  question: Scalars['String']['input'];
};


/** Root query type — all read operations. */
export type QueryAssignmentQuestionsArgs = {
  assignmentId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryAssignmentSubmissionsArgs = {
  assignmentId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryAttendanceArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  entityId?: InputMaybe<Scalars['String']['input']>;
  entityType?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAttendanceReportArgs = {
  entityType?: InputMaybe<Scalars['String']['input']>;
  fromDate?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
  toDate?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAttendanceSummaryArgs = {
  entityType?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryAuditLogsArgs = {
  action?: InputMaybe<Scalars['String']['input']>;
  actorId?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  module?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryBalanceSheetArgs = {
  asOf: Scalars['String']['input'];
};


/** Root query type — all read operations. */
export type QueryBedsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
  wardId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryBillableServicesArgs = {
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type — all read operations. */
export type QueryBloodRequestsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryBloodUnitsArgs = {
  bloodGroup?: InputMaybe<Scalars['String']['input']>;
  component?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryCalendarMonthArgs = {
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
};


/** Root query type — all read operations. */
export type QueryClinicianSchedulesArgs = {
  clinicianId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryCourseBatchesArgs = {
  courseId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryCurriculumArgs = {
  courseId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryDepartmentLearningProgressArgs = {
  deptId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryDietPlansArgs = {
  admissionId: Scalars['String']['input'];
  includeDiscontinued?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type — all read operations. */
export type QueryDispensesArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  patientId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryDriverAttendanceArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  employeeId?: InputMaybe<Scalars['String']['input']>;
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  vehicleId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryDrugBatchesArgs = {
  drugId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryDrugsArgs = {
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryDutyRosterArgs = {
  departmentId?: InputMaybe<Scalars['String']['input']>;
  employeeId?: InputMaybe<Scalars['String']['input']>;
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryEmployeeArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryEmployeeLearningGoalsArgs = {
  employeeId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryEncounterArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryEncountersArgs = {
  clinicianId?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  patientId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryEventsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryExamSchedulesArgs = {
  examType?: InputMaybe<Scalars['String']['input']>;
  semesterNumber?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type — all read operations. */
export type QueryExamTypesArgs = {
  departmentId?: InputMaybe<Scalars['String']['input']>;
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type — all read operations. */
export type QueryExpiringDrugsArgs = {
  days: Scalars['Int']['input'];
};


/** Root query type — all read operations. */
export type QueryFeeAllocationArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryFeeAllocationsArgs = {
  courseId?: InputMaybe<Scalars['String']['input']>;
  feeStructureId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryFeePaymentsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
  studentFeeId?: InputMaybe<Scalars['String']['input']>;
  studentId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryFeeReportArgs = {
  academicYearId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryFeeStructureArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryFeeStructuresArgs = {
  courseId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryGoalAssignmentsArgs = {
  goalId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryHallTicketsArgs = {
  examScheduleId: Scalars['ID']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryHolidaysArgs = {
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  year?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryHostelAllocationsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryHostelRoomsArgs = {
  blockId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryInsuranceClaimArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryInsuranceClaimsArgs = {
  patientId?: InputMaybe<Scalars['String']['input']>;
  payerId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryInsurancePayersArgs = {
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type — all read operations. */
export type QueryInventoryItemsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryInvoiceArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryInvoicesArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  patientId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryLabOrderArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryLabOrdersArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  encounterId?: InputMaybe<Scalars['String']['input']>;
  patientId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryLabTestsArgs = {
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryLearningGoalArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryLeaveBalancesArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
  year?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type — all read operations. */
export type QueryLeaveReportArgs = {
  department?: InputMaybe<Scalars['String']['input']>;
  year?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryLeavesArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryLedgerBatchesArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  sourceType?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryLibraryBooksArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryMarksArgs = {
  examType?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  studentId?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryMarksCountArgs = {
  examType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  studentId?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryMarksReportArgs = {
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  assessmentType?: InputMaybe<Scalars['String']['input']>;
  courseId?: InputMaybe<Scalars['String']['input']>;
  semesterNumber?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryMedicationOrdersArgs = {
  admissionId: Scalars['String']['input'];
  includeDiscontinued?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type — all read operations. */
export type QueryMessAttendanceArgs = {
  date: Scalars['String']['input'];
  hostelBlockId?: InputMaybe<Scalars['String']['input']>;
  meal: Scalars['String']['input'];
};


/** Root query type — all read operations. */
export type QueryMessExpenseSummaryArgs = {
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryMessExpensesArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryMessMenuArgs = {
  hostelBlockId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryMyAssignmentsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryMyClinicianCalendarArgs = {
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
};


/** Root query type — all read operations. */
export type QueryOperationTheatresArgs = {
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type — all read operations. */
export type QueryOrgStructureArgs = {
  department?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryPatientArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryPatientsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryPatientsCountArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryPayrollReportArgs = {
  year?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryPayrollSummaryArgs = {
  month?: InputMaybe<Scalars['Int']['input']>;
  year?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type — all read operations. */
export type QueryPayrollsArgs = {
  employeeId?: InputMaybe<Scalars['ID']['input']>;
  month?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  year?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type — all read operations. */
export type QueryProfitAndLossArgs = {
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
};


/** Root query type — all read operations. */
export type QueryPublishedResultsArgs = {
  courseId?: InputMaybe<Scalars['String']['input']>;
  examType?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
  subject?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryPurchaseInvoicesArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryPurchaseOrderArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryPurchaseOrdersArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
  vendorId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryQuestionBankArgs = {
  curriculumSubjectId: Scalars['ID']['input'];
  difficulty?: InputMaybe<Scalars['String']['input']>;
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
  questionType?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryQuestionPaperArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryQuestionPapersArgs = {
  curriculumSubjectId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryRadiologyOrderArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryRadiologyOrdersArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  encounterId?: InputMaybe<Scalars['String']['input']>;
  patientId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryRadiologyStudiesArgs = {
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryReferralsArgs = {
  settlementStatus?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryResultSummaryArgs = {
  courseId: Scalars['String']['input'];
  semester: Scalars['Int']['input'];
};


/** Root query type — all read operations. */
export type QuerySalaryAssignmentsArgs = {
  employeeId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QuerySalaryStructuresArgs = {
  employeeId?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query type — all read operations. */
export type QuerySemestersArgs = {
  academicYearId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryStockTransactionsArgs = {
  itemId: Scalars['String']['input'];
};


/** Root query type — all read operations. */
export type QueryStudentArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryStudentAcademicResultArgs = {
  studentId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryStudentAssignmentArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryStudentAssignmentsArgs = {
  courseId?: InputMaybe<Scalars['String']['input']>;
  section?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryStudentFeesArgs = {
  courseId?: InputMaybe<Scalars['String']['input']>;
  feeAllocationId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  studentId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryStudentsArgs = {
  courseId?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type — all read operations. */
export type QuerySubjectArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QuerySubjectsArgs = {
  departmentId?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QuerySurgeriesArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  theatreId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryTeleConsultsArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryTimetableArgs = {
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  courseId?: InputMaybe<Scalars['String']['input']>;
  dayOfWeek?: InputMaybe<Scalars['String']['input']>;
  employeeId?: InputMaybe<Scalars['String']['input']>;
  section?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type — all read operations. */
export type QueryTransportVehiclesArgs = {
  routeId?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryTriageCasesArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryTrialBalanceArgs = {
  asOf?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type — all read operations. */
export type QueryUserSessionsArgs = {
  userId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryUserWorkspacesArgs = {
  userId: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryVendorsArgs = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type — all read operations. */
export type QueryVitalsRecordsArgs = {
  admissionId: Scalars['String']['input'];
};


/** Root query type — all read operations. */
export type QueryWardArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type — all read operations. */
export type QueryWardsArgs = {
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A reusable question in the bank, scoped to one curriculum subject. */
export type QuestionBankItem = {
  __typename?: 'QuestionBankItem';
  /** Whether the question is in the active pool for generation. */
  active: Scalars['Boolean']['output'];
  /** Model answer or the correct option. */
  answer: Maybe<Scalars['String']['output']>;
  /** Course-outcome tag (CO1, CO2, …) for outcome mapping. */
  courseOutcome: Maybe<Scalars['String']['output']>;
  /** Creation timestamp (RFC3339). */
  createdAt: Maybe<Scalars['String']['output']>;
  /** Authoring employee UUID. Blank once that employee is removed. */
  createdById: Maybe<Scalars['String']['output']>;
  /** Curriculum subject (course + semester + subject) this question belongs to. */
  curriculumSubjectId: Scalars['ID']['output'];
  /** Difficulty bucket: easy | medium | hard. */
  difficulty: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Marks this question carries. */
  marks: Scalars['Float']['output'];
  /** Answer choices. Populated for mcq, empty otherwise. */
  options: Array<Scalars['String']['output']>;
  /** The question as it should be printed. */
  questionText: Scalars['String']['output'];
  /** Shape: mcq | short | long | numeric. */
  questionType: Scalars['String']['output'];
  /** The subject itself, when loaded. */
  subject: Maybe<Subject>;
  /** Subject UUID, denormalized from the curriculum row. */
  subjectId: Maybe<Scalars['String']['output']>;
  /** Syllabus unit / topic label this question covers. */
  unit: Maybe<Scalars['String']['output']>;
};

/** A generated question paper. Items are frozen at generation time. */
export type QuestionPaper = {
  __typename?: 'QuestionPaper';
  /** Creation timestamp (RFC3339). */
  createdAt: Maybe<Scalars['String']['output']>;
  /** Authoring user UUID. */
  createdById: Maybe<Scalars['String']['output']>;
  /** Curriculum subject the paper was generated for. */
  curriculumSubjectId: Scalars['ID']['output'];
  /** Exam duration in minutes. */
  durationMinutes: Maybe<Scalars['Int']['output']>;
  /** The exam type itself, when loaded. */
  examType: Maybe<ExamType>;
  /** Linked exam type (assessment definition), when set. */
  examTypeId: Maybe<Scalars['String']['output']>;
  /** The JSON rule blueprint used, kept for audit and regeneration. */
  generationRule: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Instructions printed above the questions. */
  instructions: Maybe<Scalars['String']['output']>;
  /** The questions on the paper, in print order. */
  items: Array<QuestionPaperItem>;
  /** draft | finalized. Drafts print with a DRAFT watermark. */
  status: Scalars['String']['output'];
  /** The subject itself, when loaded. */
  subject: Maybe<Subject>;
  /** Subject UUID. */
  subjectId: Maybe<Scalars['String']['output']>;
  /** Paper title, e.g. "Mid Sem - Data Structures". */
  title: Scalars['String']['output'];
  /** Total marks on the paper. */
  totalMarks: Scalars['Float']['output'];
};

/** One frozen question on a generated paper. */
export type QuestionPaperItem = {
  __typename?: 'QuestionPaperItem';
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Marks carried. */
  marks: Scalars['Float']['output'];
  /** Answer choices for mcq items. */
  options: Array<Scalars['String']['output']>;
  /** The question text as printed. */
  questionText: Scalars['String']['output'];
  /** Shape: mcq | short | long | numeric. */
  questionType: Scalars['String']['output'];
  /** Section grouping (A/B/C) derived from the question shape. */
  section: Maybe<Scalars['String']['output']>;
  /** Print order, 1-based. */
  seqNo: Scalars['Int']['output'];
  /** Bank question this was copied from, for set-frequency analytics. */
  sourceQuestionId: Maybe<Scalars['String']['output']>;
};

/** A single answer submitted by the learner for one question. */
export type QuizAnswerInput = {
  questionId: Scalars['ID']['input'];
  /** Selected option indices (as strings) or ['true']/['false'] for true_false. */
  selected: Array<Scalars['String']['input']>;
};

/** Result of an auto-graded quiz submission. */
export type QuizSubmissionResult = {
  __typename?: 'QuizSubmissionResult';
  /** Maximum achievable points. */
  maxScore: Scalars['Float']['output'];
  /** True if percentage >= the assignment's passScore. */
  passed: Scalars['Boolean']['output'];
  /** Percentage (0-100). */
  percentage: Scalars['Float']['output'];
  /** Resulting AssignmentProgress row. */
  progress: ItemProgress;
  /** Raw score in points. */
  score: Scalars['Float']['output'];
};

/** An imaging order with its (later) report. */
export type RadiologyOrder = {
  __typename?: 'RadiologyOrder';
  bodyPart: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  encounterId: Maybe<Scalars['String']['output']>;
  findings: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  impression: Maybe<Scalars['String']['output']>;
  modality: Scalars['String']['output'];
  notes: Maybe<Scalars['String']['output']>;
  orderDate: Scalars['String']['output'];
  orderedById: Maybe<Scalars['String']['output']>;
  orderedByName: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  patientMrn: Scalars['String']['output'];
  patientName: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  reportedAt: Maybe<Scalars['String']['output']>;
  reportedById: Maybe<Scalars['String']['output']>;
  reportedByName: Maybe<Scalars['String']['output']>;
  /** Status: ordered | scheduled | completed | reported | cancelled. */
  status: Scalars['String']['output'];
  studyCode: Scalars['String']['output'];
  studyId: Scalars['String']['output'];
  studyName: Scalars['String']['output'];
};

export type RadiologyReportInput = {
  findings: Scalars['String']['input'];
  impression: Scalars['String']['input'];
  reportedById?: InputMaybe<Scalars['String']['input']>;
};

/** A catalog imaging study. */
export type RadiologyStudy = {
  __typename?: 'RadiologyStudy';
  active: Scalars['Boolean']['output'];
  bodyPart: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Modality: xray | ct | mri | ultrasound | mammography | other. */
  modality: Scalars['String']['output'];
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
};

export type ReceiveLineInput = {
  /** Batch number, required when the line replenishes a pharmacy drug. */
  batchNo?: InputMaybe<Scalars['String']['input']>;
  /** Expiry date YYYY-MM-DD for the received drug batch. */
  expiryDate?: InputMaybe<Scalars['String']['input']>;
  /** The PurchaseOrderItem id being received against. */
  lineId: Scalars['String']['input'];
  receivedQty: Scalars['Float']['input'];
};

export type ReceivePurchaseOrderInput = {
  lines: Array<ReceiveLineInput>;
};

export type RecordAdministrationInput = {
  administeredAt?: InputMaybe<Scalars['String']['input']>;
  administeredById?: InputMaybe<Scalars['String']['input']>;
  medicationOrderId: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Status: given | held | refused. */
  status?: InputMaybe<Scalars['String']['input']>;
};

/** Input for recording a fee payment. */
export type RecordFeePaymentInput = {
  /** Amount paid. */
  amount: Scalars['Float']['input'];
  /** Pay a specific installment (omit to apply oldest-first). */
  installmentId?: InputMaybe<Scalars['String']['input']>;
  /** Payment date (YYYY-MM-DD). Defaults to today. */
  paymentDate?: InputMaybe<Scalars['String']['input']>;
  /** Payment mode: cash | online | cheque | dd. */
  paymentMode?: InputMaybe<Scalars['String']['input']>;
  /** Remarks. */
  remarks?: InputMaybe<Scalars['String']['input']>;
  /** Student fee UUID being paid. */
  studentFeeId: Scalars['String']['input'];
  /** Transaction reference. */
  transactionRef?: InputMaybe<Scalars['String']['input']>;
};

export type RecordInvoicePaymentInput = {
  amount: Scalars['Float']['input'];
  invoiceId: Scalars['String']['input'];
  /** Mode: cash | card | upi | online | cheque (default cash). */
  mode?: InputMaybe<Scalars['String']['input']>;
  reference?: InputMaybe<Scalars['String']['input']>;
};

export type RecordMealServingInput = {
  dietPlanId: Scalars['ID']['input'];
  mealType: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type RecordPurchasePaymentInput = {
  amount: Scalars['Float']['input'];
  invoiceId: Scalars['String']['input'];
};

export type RecordVitalsInput = {
  admissionId: Scalars['String']['input'];
  bpDiastolic?: InputMaybe<Scalars['Int']['input']>;
  bpSystolic?: InputMaybe<Scalars['Int']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  painScore?: InputMaybe<Scalars['Int']['input']>;
  pulse?: InputMaybe<Scalars['Int']['input']>;
  recordedAt?: InputMaybe<Scalars['String']['input']>;
  recordedById?: InputMaybe<Scalars['String']['input']>;
  respRate?: InputMaybe<Scalars['Int']['input']>;
  spo2?: InputMaybe<Scalars['Int']['input']>;
  tempC?: InputMaybe<Scalars['Float']['input']>;
};

export type Referral = {
  __typename?: 'Referral';
  /** Computed commission, frozen at settlement. */
  commissionAmount: Scalars['Float']['output'];
  /** Billable amount the percent applies to (percent commissions only). */
  commissionBase: Scalars['Float']['output'];
  /** Commission type: none | flat | percent. */
  commissionType: Scalars['String']['output'];
  /** Amount (flat) or percent 0-100 (percent). */
  commissionValue: Scalars['Float']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  fromClinicianId: Maybe<Scalars['String']['output']>;
  fromClinicianName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  patientMrn: Scalars['String']['output'];
  patientName: Scalars['String']['output'];
  /** Optional internal doctor (Employee) UUID. */
  payeeEmployeeId: Maybe<Scalars['String']['output']>;
  payeeEmployeeName: Maybe<Scalars['String']['output']>;
  /** Free-text external payee name. */
  payeeName: Maybe<Scalars['String']['output']>;
  /** Payee type: doctor | centre. */
  payeeType: Maybe<Scalars['String']['output']>;
  reason: Maybe<Scalars['String']['output']>;
  referralDate: Maybe<Scalars['String']['output']>;
  referredTo: Scalars['String']['output'];
  /** Settlement date (YYYY-MM-DD), once settled. */
  settledOn: Maybe<Scalars['String']['output']>;
  /** Settlement status: pending | settled. */
  settlementStatus: Scalars['String']['output'];
  specialty: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  urgency: Scalars['String']['output'];
};

export type RegisterDeviceTokenInput = {
  /** App version. Optional; useful when diagnosing delivery problems. */
  appVersion?: InputMaybe<Scalars['String']['input']>;
  /** The app's own install id. Optional; used only for the device list. */
  deviceId?: InputMaybe<Scalars['String']['input']>;
  /** Human label for the device. Optional. */
  deviceName?: InputMaybe<Scalars['String']['input']>;
  /** Device platform: ios | android | web. */
  platform: Scalars['String']['input'];
  /** The Expo push token issued to this install. */
  token: Scalars['String']['input'];
};

export type RemoveTransportAllocationInput = {
  endDate: Scalars['String']['input'];
};

/** Pass/fail summary for a course's semester results. */
export type ResultSummary = {
  __typename?: 'ResultSummary';
  /** Number who failed. */
  failCount: Scalars['Int']['output'];
  /** Number who passed. */
  passCount: Scalars['Int']['output'];
  /** Total number of students. */
  totalStudents: Scalars['Int']['output'];
};

export type ReturnLibraryBookInput = {
  fineAmount?: InputMaybe<Scalars['Float']['input']>;
  returnDate: Scalars['String']['input'];
};

/** Input for approving or rejecting a leave application. */
export type ReviewLeaveInput = {
  /** Optional comments for the applicant. */
  reviewNote?: InputMaybe<Scalars['String']['input']>;
  /** New status: approved | rejected. */
  status: Scalars['String']['input'];
};

/** One role column in the matrix with its effective per-module access. */
export type RoleAccess = {
  __typename?: 'RoleAccess';
  /** True when this column is a tenant CustomRole. */
  isCustom: Scalars['Boolean']['output'];
  /** Human-friendly role label. */
  label: Scalars['String']['output'];
  modules: Array<ModuleAccess>;
  /** Role name (system) or CustomRole id (custom). */
  subjectKey: Scalars['String']['output'];
  /** "system" for built-in roles, "custom" for tenant CustomRoles. */
  subjectType: Scalars['String']['output'];
};

/** A reusable pricing/category template for hostel rooms (e.g. "3-Sharing AC"). */
export type RoomClass = {
  __typename?: 'RoomClass';
  annualRate: Scalars['Float']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  monthlyRate: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  /** The rate amount as entered, in the unit named by rateType. */
  rateAmount: Scalars['Float']['output'];
  /** How the rate is expressed: monthly, semester, or annual. */
  rateType: Scalars['String']['output'];
  /** Per-semester rate. Annual amounts are divided by the current academic year's semester count (or equal the annual amount when there are no semesters). */
  semesterRate: Scalars['Float']['output'];
};

/** An employee↔template salary assignment. */
export type SalaryAssignment = {
  __typename?: 'SalaryAssignment';
  effectiveFrom: Scalars['String']['output'];
  effectiveTo: Maybe<Scalars['String']['output']>;
  employee: Maybe<Employee>;
  employeeId: Scalars['String']['output'];
  extraAllowance: Scalars['Float']['output'];
  extraDeduction: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  notes: Scalars['String']['output'];
  template: Maybe<SalaryTemplate>;
  templateId: Scalars['String']['output'];
};

/** Defines the salary components and deduction percentages for an employee. */
export type SalaryStructure = {
  __typename?: 'SalaryStructure';
  /** Monthly basic salary in INR. */
  basicSalary: Scalars['Float']['output'];
  /** Dearness Allowance. */
  da: Scalars['Float']['output'];
  /** Date from which this structure is effective (YYYY-MM-DD). */
  effectiveFrom: Scalars['String']['output'];
  /** The employee this structure belongs to. */
  employee: Maybe<Employee>;
  /** Employee UUID this structure applies to. */
  employeeId: Scalars['String']['output'];
  /** ESI deduction amount. */
  esi: Scalars['Float']['output'];
  /** House Rent Allowance. */
  hra: Scalars['Float']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether this is the currently active structure for the employee. */
  isActive: Scalars['Boolean']['output'];
  /** Medical allowance. */
  medicalAllowance: Scalars['Float']['output'];
  /** Optional notes or remarks. */
  notes: Maybe<Scalars['String']['output']>;
  /** Other allowances (conveyance, etc.). */
  otherAllowances: Scalars['Float']['output'];
  /** Other deductions. */
  otherDeductions: Scalars['Float']['output'];
  /** Provident Fund deduction amount. */
  pf: Scalars['Float']['output'];
  /** Travel Allowance. */
  ta: Scalars['Float']['output'];
  /** TDS (income tax) deduction amount. */
  tds: Scalars['Float']['output'];
};

/** A named, reusable salary template. */
export type SalaryTemplate = {
  __typename?: 'SalaryTemplate';
  basicSalary: Scalars['Float']['output'];
  da: Scalars['Float']['output'];
  description: Scalars['String']['output'];
  esi: Scalars['Float']['output'];
  hra: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  medicalAllowance: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  otherAllowances: Scalars['Float']['output'];
  otherDeductions: Scalars['Float']['output'];
  pf: Scalars['Float']['output'];
  ta: Scalars['Float']['output'];
  tds: Scalars['Float']['output'];
};

/** Full grading configuration to persist for the tenant. */
export type SaveGradingSchemeInput = {
  bands: Array<GradeBandInput>;
  creditWeighted: Scalars['Boolean']['input'];
  decimals: Scalars['Int']['input'];
  gpaMax: Scalars['Float']['input'];
  mode: Scalars['String']['input'];
  passThreshold: Scalars['Float']['input'];
  weightedByExamType: Scalars['Boolean']['input'];
};

export type ScheduleSurgeryInput = {
  anesthesiaType?: InputMaybe<Scalars['String']['input']>;
  endTime: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  procedureName: Scalars['String']['input'];
  scheduledDate: Scalars['String']['input'];
  startTime: Scalars['String']['input'];
  surgeonId?: InputMaybe<Scalars['String']['input']>;
  theatreId: Scalars['String']['input'];
};

export type ScheduleTeleConsultInput = {
  clinicianId?: InputMaybe<Scalars['String']['input']>;
  meetingLink?: InputMaybe<Scalars['String']['input']>;
  patientId: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  scheduledAt: Scalars['String']['input'];
};

/** A semester within an academic year. */
export type Semester = {
  __typename?: 'Semester';
  academicYearId: Scalars['String']['output'];
  endDate: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  number: Scalars['Int']['output'];
  startDate: Scalars['String']['output'];
};

/** A semester's computed result: its subjects plus SGPA / percentage / pass. */
export type SemesterResult = {
  __typename?: 'SemesterResult';
  isPass: Scalars['Boolean']['output'];
  letter: Scalars['String']['output'];
  marksObtained: Scalars['Float']['output'];
  maxMarks: Scalars['Float']['output'];
  percentage: Scalars['Float']['output'];
  semester: Scalars['Int']['output'];
  sgpa: Scalars['Float']['output'];
  subjects: Array<SubjectResult>;
  totalCredits: Scalars['Int']['output'];
};

/** Input for sending a notification to a user. */
export type SendNotificationInput = {
  /** Notification body. */
  body?: InputMaybe<Scalars['String']['input']>;
  /** Category: fee | leave | payroll | attendance | general. */
  category?: InputMaybe<Scalars['String']['input']>;
  /** Related entity UUID. */
  refId?: InputMaybe<Scalars['String']['input']>;
  /** Related entity type. */
  refType?: InputMaybe<Scalars['String']['input']>;
  /** Notification title. */
  title: Scalars['String']['input'];
  /** Type label. */
  type?: InputMaybe<Scalars['String']['input']>;
  /** Recipient user UUID. */
  userId: Scalars['String']['input'];
};

/** Replace the set of subjects assigned to one semester of a course. */
export type SetCurriculumSubjectsInput = {
  /** Course (programme) UUID. */
  courseId: Scalars['ID']['input'];
  /** Semester number (1-based). */
  semesterNumber: Scalars['Int']['input'];
  /** The full set of subject UUIDs for this semester (replaces any existing). */
  subjectIds: Array<Scalars['ID']['input']>;
};

export type SetReferralCommissionInput = {
  /** Billable amount the percent applies to. Required when type is percent. */
  commissionBase?: InputMaybe<Scalars['Float']['input']>;
  /** Commission type: none | flat | percent. */
  commissionType: Scalars['String']['input'];
  /** Amount (flat) or percent 0-100 (percent). Ignored when type is none. */
  commissionValue?: InputMaybe<Scalars['Float']['input']>;
  /** Optional internal doctor (Employee) UUID. */
  payeeEmployeeId?: InputMaybe<Scalars['String']['input']>;
  /** Free-text external payee name (when not an internal doctor). */
  payeeName?: InputMaybe<Scalars['String']['input']>;
  /** Payee type: doctor | centre. */
  payeeType?: InputMaybe<Scalars['String']['input']>;
};

/** List of students below the minimum attendance threshold. */
export type ShortageList = {
  __typename?: 'ShortageList';
  /** Total count of shortage students. */
  count: Scalars['Int']['output'];
  /** Students below the threshold. */
  students: Array<ShortageStudent>;
  /** Minimum attendance percentage configured for the tenant. */
  threshold: Scalars['Float']['output'];
};

/** A student below the attendance threshold. */
export type ShortageStudent = {
  __typename?: 'ShortageStudent';
  /** Attendance percentage. */
  attendancePct: Scalars['Float']['output'];
  /** Days present. */
  present: Scalars['Int']['output'];
  /** Student details. */
  student: Student;
  /** Total days recorded. */
  total: Scalars['Int']['output'];
};

export type StatementLine = {
  __typename?: 'StatementLine';
  amount: Scalars['Float']['output'];
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type StatementSection = {
  __typename?: 'StatementSection';
  lines: Array<StatementLine>;
  title: Scalars['String']['output'];
  total: Scalars['Float']['output'];
};

/** One movement of an inventory item (signed qty). */
export type StockTransaction = {
  __typename?: 'StockTransaction';
  byName: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  date: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  itemId: Scalars['String']['output'];
  itemName: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  qty: Scalars['Float']['output'];
  reason: Maybe<Scalars['String']['output']>;
  reference: Maybe<Scalars['String']['output']>;
};

/** A student enrolled in the institution. */
export type Student = {
  __typename?: 'Student';
  /** Street address. */
  address: Maybe<Scalars['String']['output']>;
  /** Admission status: active | deactivated | graduated. */
  admissionStatus: Maybe<Scalars['String']['output']>;
  /** Academic batch/cohort (e.g. 2022–2026). */
  batch: Maybe<Scalars['String']['output']>;
  /** Blood group. */
  bloodGroup: Maybe<Scalars['String']['output']>;
  /** City. */
  city: Maybe<Scalars['String']['output']>;
  /** Course the student is enrolled in. */
  course: Maybe<Course>;
  /** Date of birth (YYYY-MM-DD). */
  dateOfBirth: Maybe<Scalars['String']['output']>;
  /** Emergency contact name. */
  emergencyName: Maybe<Scalars['String']['output']>;
  /** Emergency contact phone. */
  emergencyPhone: Maybe<Scalars['String']['output']>;
  /** Enrollment date (YYYY-MM-DD). */
  enrollDate: Maybe<Scalars['String']['output']>;
  /** Father's name. */
  fatherName: Maybe<Scalars['String']['output']>;
  /** Father's phone. */
  fatherPhone: Maybe<Scalars['String']['output']>;
  /** Gender: Male | Female | Other. */
  gender: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Mother's name. */
  motherName: Maybe<Scalars['String']['output']>;
  /** Mother's phone. */
  motherPhone: Maybe<Scalars['String']['output']>;
  /** Nationality. */
  nationality: Maybe<Scalars['String']['output']>;
  /** Contact phone. */
  phone: Maybe<Scalars['String']['output']>;
  /** Profile photo URL. */
  photoUrl: Maybe<Scalars['String']['output']>;
  /** PIN code. */
  pincode: Maybe<Scalars['String']['output']>;
  /** College roll number. */
  rollNumber: Scalars['String']['output'];
  /** Class section (e.g. A, B). */
  section: Maybe<Scalars['String']['output']>;
  /** Current semester number. */
  semester: Maybe<Scalars['Int']['output']>;
  /** State. */
  state: Maybe<Scalars['String']['output']>;
  /** Linked user account. */
  user: Maybe<User>;
};

/**
 * Coursework a teacher sets for one course-semester-section-subject.
 * Distinct from the employee L&D LearningAssignment.
 */
export type StudentAssignment = {
  __typename?: 'StudentAssignment';
  /** Optional teacher handout URL, uploaded via the existing upload route. */
  attachmentUrl: Maybe<Scalars['String']['output']>;
  /** Course (Course) UUID this is set for. */
  courseId: Maybe<Scalars['String']['output']>;
  courseName: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  /** Due date (YYYY-MM-DD). */
  dueDate: Maybe<Scalars['String']['output']>;
  /** How many of those submissions are graded. */
  gradedCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** Marks the assignment is out of; 0 means ungraded. */
  maxMarks: Scalars['Float']['output'];
  section: Maybe<Scalars['String']['output']>;
  semester: Maybe<Scalars['Int']['output']>;
  /** draft | published | closed. */
  status: Scalars['String']['output'];
  /** Subject (Subject) UUID. */
  subjectId: Maybe<Scalars['String']['output']>;
  subjectName: Maybe<Scalars['String']['output']>;
  /** How many students have submitted so far. */
  submissionCount: Scalars['Int']['output'];
  /** Teacher (Employee) UUID who set it. */
  teacherId: Scalars['String']['output'];
  teacherName: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

/** The materialized fee record of one student under one allocation. */
export type StudentFee = {
  __typename?: 'StudentFee';
  /** Attached add-ons (per course year). */
  addOns: Array<StudentFeeAddOn>;
  /** Total discount applied. */
  discountAmount: Scalars['Float']['output'];
  /** Discount lines. */
  discounts: Array<StudentFeeDiscount>;
  /** Fee allocation object. */
  feeAllocation: Maybe<FeeAllocation>;
  /** Fee allocation UUID. */
  feeAllocationId: Scalars['String']['output'];
  /** Total before discounts. */
  grossAmount: Scalars['Float']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Installment schedule. */
  installments: Array<StudentFeeInstallment>;
  /** Net payable (gross - discounts). */
  netAmount: Scalars['Float']['output'];
  /** Amount paid so far. */
  paidAmount: Scalars['Float']['output'];
  /** pending | partial | paid. */
  status: Scalars['String']['output'];
  /** Student object. */
  student: Maybe<Student>;
  /** Student UUID. */
  studentId: Scalars['String']['output'];
};

/** One add-on attached to one student fee for one course year. */
export type StudentFeeAddOn = {
  __typename?: 'StudentFeeAddOn';
  /** Charged amount (copied from the add-on at attach time). */
  amount: Scalars['Float']['output'];
  /** Add-on object. */
  feeAddOn: Maybe<FeeAddOn>;
  /** Fee add-on UUID. */
  feeAddOnId: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Course year the charge applies to. */
  yearNumber: Scalars['Int']['output'];
};

/** A discount/waiver line on a student fee. */
export type StudentFeeDiscount = {
  __typename?: 'StudentFeeDiscount';
  /** Resolved discount amount in currency. */
  amount: Scalars['Float']['output'];
  /** fixed | percent. */
  discountType: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Label (e.g. Merit Scholarship). */
  label: Scalars['String']['output'];
  /** Optional remarks. */
  remarks: Maybe<Scalars['String']['output']>;
  /** Configured value (amount or percentage). */
  value: Scalars['Float']['output'];
};

/** One due slot of a student fee. */
export type StudentFeeInstallment = {
  __typename?: 'StudentFeeInstallment';
  /** Amount due in this installment. */
  amount: Scalars['Float']['output'];
  /** Due date (YYYY-MM-DD). */
  dueDate: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether the due date has passed without full payment. */
  isOverdue: Scalars['Boolean']['output'];
  /** Label (e.g. Year 1, Semester 3). */
  label: Scalars['String']['output'];
  /** Amount paid so far. */
  paidAmount: Scalars['Float']['output'];
  /** Order of the installment (1-based). */
  sequence: Scalars['Int']['output'];
  /** pending | partial | paid. */
  status: Scalars['String']['output'];
};

/** Subscription count for a single status. */
export type SubStatusCount = {
  __typename?: 'SubStatusCount';
  count: Scalars['Int']['output'];
  status: Scalars['String']['output'];
};

/** A subject or paper taught within a department. */
export type Subject = {
  __typename?: 'Subject';
  /** Subject code (e.g. CS301). */
  code: Scalars['String']['output'];
  /** Course outcome statements (CO1, CO2, …). */
  courseOutcomes: Array<Scalars['String']['output']>;
  /** Credit units. */
  credits: Maybe<Scalars['Int']['output']>;
  /** Department object. */
  department: Maybe<Department>;
  /** Department UUID this subject belongs to. */
  departmentId: Maybe<Scalars['String']['output']>;
  /** Brief description of the subject. */
  description: Maybe<Scalars['String']['output']>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Weekly lab hours. */
  labHours: Maybe<Scalars['Int']['output']>;
  /** Subject name. */
  name: Scalars['String']['output'];
  /** Semester in which this subject is taught. */
  semesterNumber: Maybe<Scalars['Int']['output']>;
  /** URL to the syllabus document. */
  syllabusUrl: Maybe<Scalars['String']['output']>;
  /** Weekly teaching hours. */
  teachingHours: Maybe<Scalars['Int']['output']>;
  /** Course plan, broken into units. */
  units: Array<SubjectUnit>;
};

/** Per-subject performance statistics for the marks report. */
export type SubjectAvgRow = {
  __typename?: 'SubjectAvgRow';
  /** Average marks obtained across all students. */
  avgMarks: Scalars['Float']['output'];
  /** Number of students who failed. */
  failCount: Scalars['Int']['output'];
  /** Maximum marks for this subject. */
  maxMarks: Scalars['Float']['output'];
  /** Number of students who passed. */
  passCount: Scalars['Int']['output'];
  /** Subject UUID. */
  subjectId: Scalars['String']['output'];
  /** Subject name. */
  subjectName: Scalars['String']['output'];
  /** Total number of students evaluated. */
  totalCount: Scalars['Int']['output'];
};

/** A single subject's computed result within a semester. */
export type SubjectResult = {
  __typename?: 'SubjectResult';
  credits: Scalars['Int']['output'];
  gradePoint: Scalars['Float']['output'];
  isPass: Scalars['Boolean']['output'];
  letter: Scalars['String']['output'];
  marksObtained: Scalars['Float']['output'];
  maxMarks: Scalars['Float']['output'];
  percentage: Scalars['Float']['output'];
  subject: Scalars['String']['output'];
  subjectId: Maybe<Scalars['String']['output']>;
};

/** One unit of a subject's course plan. */
export type SubjectUnit = {
  __typename?: 'SubjectUnit';
  /** Unit content / topics covered (free text). */
  content: Scalars['String']['output'];
  /** Optional field visits for this unit. */
  fieldVisits: Maybe<Scalars['String']['output']>;
  /** Optional lab activities for this unit. */
  labActivities: Maybe<Scalars['String']['output']>;
  /** Optional other notes (seminars, assignments, …). */
  others: Maybe<Scalars['String']['output']>;
  /** Unit title (e.g. Unit 1). */
  title: Scalars['String']['output'];
};

/** One unit of a subject's course plan. */
export type SubjectUnitInput = {
  /** Unit content / topics covered (free text). */
  content: Scalars['String']['input'];
  /** Optional field visits. */
  fieldVisits?: InputMaybe<Scalars['String']['input']>;
  /** Optional lab activities. */
  labActivities?: InputMaybe<Scalars['String']['input']>;
  /** Optional other notes. */
  others?: InputMaybe<Scalars['String']['input']>;
  /** Unit title (e.g. Unit 1). */
  title: Scalars['String']['input'];
};

export type SubmitAssignmentInput = {
  attachmentUrl?: InputMaybe<Scalars['String']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
};

/** A theatre booking for a patient's procedure. */
export type SurgerySchedule = {
  __typename?: 'SurgerySchedule';
  anesthesiaType: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  endTime: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  patientMrn: Scalars['String']['output'];
  patientName: Scalars['String']['output'];
  procedureName: Scalars['String']['output'];
  scheduledDate: Scalars['String']['output'];
  startTime: Scalars['String']['output'];
  status: Scalars['String']['output'];
  surgeonId: Maybe<Scalars['String']['output']>;
  surgeonName: Maybe<Scalars['String']['output']>;
  theatreId: Scalars['String']['output'];
  theatreName: Scalars['String']['output'];
};

/** A built-in role as presented for one tenant (industry-aware label). */
export type SystemRole = {
  __typename?: 'SystemRole';
  color: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  /** The enforced enum id: admin / teacher / student / staff. */
  roleId: Scalars['String']['output'];
  sortOrder: Scalars['Int']['output'];
};

/** Installed vs available release versions and tenant snooze / presence state. */
export type SystemUpdateStatus = {
  __typename?: 'SystemUpdateStatus';
  activeUsersInTenant: Scalars['Int']['output'];
  agentReachable: Scalars['Boolean']['output'];
  availableBackend: Scalars['String']['output'];
  availableFrontend: Scalars['String']['output'];
  installedBackend: Scalars['String']['output'];
  installedFrontend: Scalars['String']['output'];
  snoozed: Scalars['Boolean']['output'];
  snoozedUntil: Maybe<Scalars['String']['output']>;
  updateAvailable: Scalars['Boolean']['output'];
};

export type TeleConsult = {
  __typename?: 'TeleConsult';
  clinicianId: Maybe<Scalars['String']['output']>;
  clinicianName: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  meetingLink: Maybe<Scalars['String']['output']>;
  notes: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  patientMrn: Scalars['String']['output'];
  patientName: Scalars['String']['output'];
  reason: Maybe<Scalars['String']['output']>;
  scheduledAt: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

/** One month bucket of tenant growth. */
export type TenantGrowthPoint = {
  __typename?: 'TenantGrowthPoint';
  /** Tenants created during the month. */
  created: Scalars['Int']['output'];
  /** Cumulative tenant count through the end of the month. */
  cumulative: Scalars['Int']['output'];
  /** Month bucket, formatted YYYY-MM. */
  month: Scalars['String']['output'];
};

/** Per-tenant people headcount. */
export type TenantPeopleCount = {
  __typename?: 'TenantPeopleCount';
  employees: Scalars['Int']['output'];
  students: Scalars['Int']['output'];
  tenantId: Scalars['String']['output'];
  tenantName: Scalars['String']['output'];
};

/** A single quota breach for a tenant. */
export type TenantQuotaBreach = {
  __typename?: 'TenantQuotaBreach';
  current: Scalars['Int']['output'];
  limit: Scalars['Int']['output'];
  overBy: Scalars['Int']['output'];
  /** Resource breached: students | employees. */
  resource: Scalars['String']['output'];
  tenantId: Scalars['String']['output'];
  tenantName: Scalars['String']['output'];
};

/** Tenant count for a single canonical type. */
export type TenantTypeCount = {
  __typename?: 'TenantTypeCount';
  count: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

/** Label map that tailors UI copy to a tenant's vertical. */
export type TerminologyLabels = {
  __typename?: 'TerminologyLabels';
  attendance: Scalars['String']['output'];
  course: Scalars['String']['output'];
  coursePlural: Scalars['String']['output'];
  department: Scalars['String']['output'];
  departmentPlural: Scalars['String']['output'];
  leave: Scalars['String']['output'];
  marks: Scalars['String']['output'];
  member: Scalars['String']['output'];
  memberPlural: Scalars['String']['output'];
  organization: Scalars['String']['output'];
  organizationPlural: Scalars['String']['output'];
  staff: Scalars['String']['output'];
  staffPlural: Scalars['String']['output'];
};

/** Terminology payload — label map plus tenant type. */
export type TerminologyPayload = {
  __typename?: 'TerminologyPayload';
  labels: TerminologyLabels;
  type: Scalars['String']['output'];
};

/** A single timetable slot defining when a subject is taught. */
export type TimetableSlot = {
  __typename?: 'TimetableSlot';
  /** Academic year UUID. */
  academicYearId: Maybe<Scalars['String']['output']>;
  /** Course object. */
  course: Maybe<Course>;
  /** Course UUID. */
  courseId: Scalars['String']['output'];
  /** Day of the week: Monday | Tuesday | Wednesday | Thursday | Friday | Saturday. */
  dayOfWeek: Scalars['String']['output'];
  /** Assigned teacher/employee UUID. */
  employeeId: Maybe<Scalars['String']['output']>;
  /** Period end time (HH:MM). */
  endTime: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Period number within the day (1-based). */
  periodNumber: Scalars['Int']['output'];
  /** Room or lab number. */
  room: Maybe<Scalars['String']['output']>;
  /** Section label (e.g. A). */
  section: Maybe<Scalars['String']['output']>;
  /** Semester this slot belongs to. */
  semester: Scalars['Int']['output'];
  /** Period start time (HH:MM). */
  startTime: Scalars['String']['output'];
  /** Subject object. */
  subject: Maybe<Subject>;
  /** Subject UUID. */
  subjectId: Scalars['String']['output'];
};

export type TransferAdmissionInput = {
  admissionId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  toBedId: Scalars['String']['input'];
  transferDate?: InputMaybe<Scalars['String']['input']>;
};

/** Transport allocation — a student assigned to a vehicle. */
export type TransportAllocation = {
  __typename?: 'TransportAllocation';
  /** Who this allocation is for: student | staff. */
  allocType: Scalars['String']['output'];
  employee: Maybe<Employee>;
  employeeId: Scalars['String']['output'];
  endDate: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  pickupStop: Scalars['String']['output'];
  startDate: Scalars['String']['output'];
  status: Scalars['String']['output'];
  student: Maybe<Student>;
  studentId: Scalars['String']['output'];
  vehicle: Maybe<TransportVehicle>;
  vehicleId: Scalars['String']['output'];
};

/** A transport route. */
export type TransportRoute = {
  __typename?: 'TransportRoute';
  distance: Scalars['Float']['output'];
  endPoint: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  routeName: Scalars['String']['output'];
  startPoint: Scalars['String']['output'];
  stops: Scalars['String']['output'];
};

/** A vehicle assigned to a route. */
export type TransportVehicle = {
  __typename?: 'TransportVehicle';
  capacity: Scalars['Int']['output'];
  /** Canonical driver link (Employee UUID); driverName stays for legacy rows. */
  driverEmployeeId: Maybe<Scalars['String']['output']>;
  driverName: Scalars['String']['output'];
  driverPhone: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** When the position was last reported (RFC3339); null = never tracked. */
  lastPingAt: Maybe<Scalars['String']['output']>;
  /** Last reported latitude (Phase 6 live tracking). 0 when never pinged. */
  latitude: Scalars['Float']['output'];
  /** Last reported longitude. 0 when never pinged. */
  longitude: Scalars['Float']['output'];
  route: Maybe<TransportRoute>;
  routeId: Scalars['String']['output'];
  status: Scalars['String']['output'];
  vehicleNumber: Scalars['String']['output'];
  vehicleType: Scalars['String']['output'];
};

/** An emergency-department presentation, scored by acuity. */
export type TriageCase = {
  __typename?: 'TriageCase';
  arrivalTime: Scalars['String']['output'];
  assignedClinicianId: Maybe<Scalars['String']['output']>;
  assignedClinicianName: Maybe<Scalars['String']['output']>;
  chiefComplaint: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  disposition: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  patientId: Scalars['String']['output'];
  patientMrn: Scalars['String']['output'];
  patientName: Scalars['String']['output'];
  status: Scalars['String']['output'];
  triageLevel: Scalars['Int']['output'];
  vitals: Maybe<Scalars['String']['output']>;
};

export type TrialBalanceRow = {
  __typename?: 'TrialBalanceRow';
  accountId: Scalars['String']['output'];
  code: Scalars['String']['output'];
  credit: Scalars['Float']['output'];
  debit: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

/** A desired question count for one shape. */
export type TypeCountInput = {
  /** How many questions of this shape to include. */
  count: Scalars['Int']['input'];
  /** mcq | short | long | numeric. */
  questionType: Scalars['String']['input'];
};

/** Unread notification count for the current user. */
export type UnreadCount = {
  __typename?: 'UnreadCount';
  /** Number of unread notifications. */
  count: Scalars['Int']['output'];
};

export type UpdateAcademicYearInput = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAccountInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAmbulanceInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  driverName?: InputMaybe<Scalars['String']['input']>;
  driverPhone?: InputMaybe<Scalars['String']['input']>;
  registration?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  vehicleType?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an announcement. */
export type UpdateAnnouncementInput = {
  /** Updated body. */
  body?: InputMaybe<Scalars['String']['input']>;
  /** Updated expiry datetime. */
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  /** Toggle published state. */
  isPublished?: InputMaybe<Scalars['Boolean']['input']>;
  /** Updated priority. */
  priority?: InputMaybe<Scalars['String']['input']>;
  /** Updated target roles. */
  targetRoles?: InputMaybe<Scalars['String']['input']>;
  /** Updated title. */
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAppointmentInput = {
  clinicianId?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  departmentId?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  patientId?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  /** Who referred the patient (doctor, camp, or SELF). */
  referredBy?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
  /** Status: scheduled | completed | cancelled | no_show. */
  status?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAttendanceSettingsInput = {
  gracePeriodMinutes?: InputMaybe<Scalars['Int']['input']>;
  lockAfterHours?: InputMaybe<Scalars['Int']['input']>;
  minAttendancePct?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateBedInput = {
  bay?: InputMaybe<Scalars['String']['input']>;
  bedNumber?: InputMaybe<Scalars['String']['input']>;
  dailyCharge?: InputMaybe<Scalars['Float']['input']>;
  /** Status: available | maintenance (occupied is set by admissions). */
  status?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBillableServiceInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  unitPrice?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateCalendarSettingsInput = {
  defaultWorking?: InputMaybe<Scalars['Int']['input']>;
  saturdayRule?: InputMaybe<Scalars['String']['input']>;
  saturdayWeeks?: InputMaybe<Scalars['String']['input']>;
  sundayOff?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateClinicianScheduleInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  dayOfWeek?: InputMaybe<Scalars['Int']['input']>;
  endTime?: InputMaybe<Scalars['String']['input']>;
  slotMinutes?: InputMaybe<Scalars['Int']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a course (all fields optional). */
export type UpdateCourseInput = {
  /** Updated code. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** Updated department UUID. */
  departmentId?: InputMaybe<Scalars['String']['input']>;
  /** Updated description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Duration in years. */
  durationYears?: InputMaybe<Scalars['Int']['input']>;
  /** Updated name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Total semesters. */
  totalSemesters?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateCustomRoleInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  permissions?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateDepartmentInput = {
  /** Set to true to explicitly clear the current HOD. */
  clearHead?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  /** Employee UUID to designate as Head of Department. Pass null to clear. */
  headEmployeeId?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateDietPlanInput = {
  calories?: InputMaybe<Scalars['Int']['input']>;
  dietType?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  restrictions?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateDrugInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  form?: InputMaybe<Scalars['String']['input']>;
  genericName?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  reorderLevel?: InputMaybe<Scalars['Float']['input']>;
  strength?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
  unitPrice?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateDutyRosterInput = {
  date?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  shiftName?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Partial update of a tenant's email settings. Null fields are left unchanged;
 * an empty smtpPassword keeps the stored one.
 */
export type UpdateEmailSettingsInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  fromEmail?: InputMaybe<Scalars['String']['input']>;
  fromName?: InputMaybe<Scalars['String']['input']>;
  smtpHost?: InputMaybe<Scalars['String']['input']>;
  smtpPassword?: InputMaybe<Scalars['String']['input']>;
  smtpPort?: InputMaybe<Scalars['Int']['input']>;
  smtpUsername?: InputMaybe<Scalars['String']['input']>;
  useTls?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for updating an employee profile. All fields optional. */
export type UpdateEmployeeInput = {
  /** Street address. */
  address?: InputMaybe<Scalars['String']['input']>;
  /** Blood group. */
  bloodGroup?: InputMaybe<Scalars['String']['input']>;
  /** City. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** Date of birth (YYYY-MM-DD). */
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  /** Department UUID. */
  departmentId?: InputMaybe<Scalars['ID']['input']>;
  /** Job title. */
  designation?: InputMaybe<Scalars['String']['input']>;
  /** Update the linked account's login email. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Emergency contact name. */
  emergencyName?: InputMaybe<Scalars['String']['input']>;
  /** Emergency contact phone. */
  emergencyPhone?: InputMaybe<Scalars['String']['input']>;
  /** Internal employee ID / badge number. */
  employeeId?: InputMaybe<Scalars['String']['input']>;
  /** Employment type. */
  employmentType?: InputMaybe<Scalars['String']['input']>;
  /** Gender. */
  gender?: InputMaybe<Scalars['String']['input']>;
  /** Grade/level. */
  gradeLevel?: InputMaybe<Scalars['String']['input']>;
  /** Join date (YYYY-MM-DD). */
  joinDate?: InputMaybe<Scalars['String']['input']>;
  /** Update the linked account's display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Nationality. */
  nationality?: InputMaybe<Scalars['String']['input']>;
  /** Set a new account password. Leave blank/omit to keep the current one. */
  password?: InputMaybe<Scalars['String']['input']>;
  /** Banking and PF details — replaces the existing record if provided. */
  paymentDetails?: InputMaybe<PaymentDetailsInput>;
  /** Personal email. */
  personalEmail?: InputMaybe<Scalars['String']['input']>;
  /** Contact phone. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** Profile photo URL. */
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  /** PIN code. */
  pincode?: InputMaybe<Scalars['String']['input']>;
  /** Probation end date (YYYY-MM-DD). */
  probationEndDate?: InputMaybe<Scalars['String']['input']>;
  /** Change the account's base role: teacher | staff. */
  role?: InputMaybe<Scalars['String']['input']>;
  /** State. */
  state?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEncounterInput = {
  chiefComplaint?: InputMaybe<Scalars['String']['input']>;
  clinicianId?: InputMaybe<Scalars['String']['input']>;
  diagnosis?: InputMaybe<Scalars['String']['input']>;
  followUpDate?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  prescription?: InputMaybe<Scalars['String']['input']>;
  /** Status: open | closed. */
  status?: InputMaybe<Scalars['String']['input']>;
  visitDate?: InputMaybe<Scalars['String']['input']>;
  vitals?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a tenant event category. */
export type UpdateEventCategoryInput = {
  /** Hex color. */
  color?: InputMaybe<Scalars['String']['input']>;
  /** Optional notes. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a calendar event. */
export type UpdateEventInput = {
  /** Updated category. */
  category?: InputMaybe<Scalars['String']['input']>;
  /** Updated color. */
  color?: InputMaybe<Scalars['String']['input']>;
  /** Updated description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Updated end date. */
  endDate?: InputMaybe<Scalars['String']['input']>;
  /** Updated start date. */
  eventDate?: InputMaybe<Scalars['String']['input']>;
  /** Updated visibility. */
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  /** Updated location. */
  location?: InputMaybe<Scalars['String']['input']>;
  /** Updated title. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an exam schedule. */
export type UpdateExamScheduleInput = {
  /** Updated academic year UUID. */
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  /** Updated end date. */
  endDate?: InputMaybe<Scalars['String']['input']>;
  /** Updated exam type. */
  examType?: InputMaybe<Scalars['String']['input']>;
  /** Updated instructions. */
  instructions?: InputMaybe<Scalars['String']['input']>;
  /** Updated name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Updated semester. */
  semesterNumber?: InputMaybe<Scalars['Int']['input']>;
  /** Updated start date. */
  startDate?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an exam type. All fields optional. */
export type UpdateExamTypeInput = {
  /** Updated active flag. */
  active?: InputMaybe<Scalars['Boolean']['input']>;
  /** Updated owning department UUID. Pass an empty string to make it org-wide. */
  departmentId?: InputMaybe<Scalars['String']['input']>;
  /** Updated default max marks. */
  maxMarks?: InputMaybe<Scalars['Float']['input']>;
  /** Updated name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Updated weightage percent. */
  weightage?: InputMaybe<Scalars['Float']['input']>;
};

/** Input for updating a fee add-on. */
export type UpdateFeeAddOnInput = {
  /** Updated per-year charge (affects future attachments only). */
  amountPerYear?: InputMaybe<Scalars['Float']['input']>;
  /** Updated description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Toggle active status. */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Updated kind: other | transport | hostel. */
  kind?: InputMaybe<Scalars['String']['input']>;
  /** Updated name. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a fee allocation. */
export type UpdateFeeAllocationInput = {
  /** Replacement installment schedule (blocked once payments exist). */
  installments?: InputMaybe<Array<FeeAllocationInstallmentInput>>;
  /** Toggle active status. */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Updated name. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a fee category. */
export type UpdateFeeCategoryInput = {
  /** Updated description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Toggle active status. */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Updated name. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a fee structure. */
export type UpdateFeeStructureInput = {
  /** Updated intake batch UUID (empty string clears it). */
  batchId?: InputMaybe<Scalars['String']['input']>;
  /** Updated description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Toggle active status. */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Replacement line items (omit to keep current items). */
  items?: InputMaybe<Array<FeeStructureItemInput>>;
  /** Updated variation name. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateHostelRoomInput = {
  capacity?: InputMaybe<Scalars['Int']['input']>;
  floor?: InputMaybe<Scalars['Int']['input']>;
  monthlyFee?: InputMaybe<Scalars['Float']['input']>;
  rateAmount?: InputMaybe<Scalars['Float']['input']>;
  rateType?: InputMaybe<Scalars['String']['input']>;
  roomClassId?: InputMaybe<Scalars['String']['input']>;
  roomNumber?: InputMaybe<Scalars['String']['input']>;
  roomType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateInsuranceClaimInput = {
  approvedAmount?: InputMaybe<Scalars['Float']['input']>;
  claimAmount?: InputMaybe<Scalars['Float']['input']>;
  diagnosis?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  payerId?: InputMaybe<Scalars['String']['input']>;
  policyNumber?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateInsurancePayerInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  contactName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  payerType?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateInventoryItemInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  linkedDrugId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  reorderLevel?: InputMaybe<Scalars['Float']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
  unitCost?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateItemProgressInput = {
  /** Parent EmployeeGoalProgress UUID. */
  employeeGoalProgressId: Scalars['ID']['input'];
  /** Unit or assignment UUID. */
  itemId: Scalars['ID']['input'];
  /** unit | assignment. */
  itemType: Scalars['String']['input'];
  /** Required when the assignment's assessmentType = score. */
  score?: InputMaybe<Scalars['Float']['input']>;
  /** completed (unit) | passed | failed (assignment). */
  status: Scalars['String']['input'];
};

export type UpdateLabTestInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  method?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  panel?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
  refHigh?: InputMaybe<Scalars['Float']['input']>;
  refLow?: InputMaybe<Scalars['Float']['input']>;
  refText?: InputMaybe<Scalars['String']['input']>;
  sampleType?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLearningAssignmentInput = {
  assessmentType?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  orderIndex?: InputMaybe<Scalars['Int']['input']>;
  passScore?: InputMaybe<Scalars['Float']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLearningGoalInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['String']['input']>;
  isMandatory?: InputMaybe<Scalars['Boolean']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLearningQuestionInput = {
  correctAnswers?: InputMaybe<Array<Scalars['String']['input']>>;
  kind?: InputMaybe<Scalars['String']['input']>;
  options?: InputMaybe<Array<Scalars['String']['input']>>;
  orderIndex?: InputMaybe<Scalars['Int']['input']>;
  points?: InputMaybe<Scalars['Float']['input']>;
  prompt?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLearningSectionInput = {
  orderIndex?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLearningUnitInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  orderIndex?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  videoType?: InputMaybe<Scalars['String']['input']>;
  videoUrl?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a leave type (all fields optional). */
export type UpdateLeaveTypeInput = {
  /** Updated applicable-to value. */
  applicableTo?: InputMaybe<Scalars['String']['input']>;
  /** Updated carry-forward flag. */
  carryForward?: InputMaybe<Scalars['Boolean']['input']>;
  /** Updated days per year. */
  daysPerYear?: InputMaybe<Scalars['Int']['input']>;
  /** Updated max carry-forward days. */
  maxCarryForward?: InputMaybe<Scalars['Int']['input']>;
  /** Updated name. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLibraryBookInput = {
  author?: InputMaybe<Scalars['String']['input']>;
  availableCopies?: InputMaybe<Scalars['Int']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  isbn?: InputMaybe<Scalars['String']['input']>;
  publishYear?: InputMaybe<Scalars['Int']['input']>;
  publisher?: InputMaybe<Scalars['String']['input']>;
  rack?: InputMaybe<Scalars['String']['input']>;
  shelf?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  totalCopies?: InputMaybe<Scalars['Int']['input']>;
};

/** Input for updating a mark entry. */
export type UpdateMarkInput = {
  /** Marks obtained. */
  marksObtained: Scalars['Float']['input'];
  /** Maximum marks. */
  maxMarks: Scalars['Float']['input'];
};

export type UpdateOperationTheatreInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrgProfileInput = {
  accentColor?: InputMaybe<Scalars['String']['input']>;
  accreditation?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryColor?: InputMaybe<Scalars['String']['input']>;
  /** Set whether staff must have an email (false = sign in by Employee ID). */
  staffEmailRequired?: InputMaybe<Scalars['Boolean']['input']>;
  /** Set whether students must have an email (false = sign in by Roll Number). */
  studentEmailRequired?: InputMaybe<Scalars['Boolean']['input']>;
  tagline?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePatientInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  allergies?: InputMaybe<Scalars['String']['input']>;
  bloodGroup?: InputMaybe<Scalars['String']['input']>;
  chronicConditions?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emergencyName?: InputMaybe<Scalars['String']['input']>;
  emergencyPhone?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  mrn?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  pincode?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<Scalars['String']['input']>;
  /** Status: active | inactive | deceased. */
  status?: InputMaybe<Scalars['String']['input']>;
};

/** Input for advancing payroll status and recording payment information. */
export type UpdatePayrollStatusInput = {
  /** Payment date (YYYY-MM-DD). Required when status is paid. */
  paymentDate?: InputMaybe<Scalars['String']['input']>;
  /** Payment mode: bank_transfer | cheque | cash. */
  paymentMode?: InputMaybe<Scalars['String']['input']>;
  /** New status: approved | paid. */
  status: Scalars['String']['input'];
};

export type UpdatePurchaseOrderInput = {
  expectedDate?: InputMaybe<Scalars['String']['input']>;
  items?: InputMaybe<Array<PurchaseOrderItemInput>>;
  notes?: InputMaybe<Scalars['String']['input']>;
  orderDate?: InputMaybe<Scalars['String']['input']>;
  vendorId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateQuestionBankItemInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  answer?: InputMaybe<Scalars['String']['input']>;
  courseOutcome?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  marks?: InputMaybe<Scalars['Float']['input']>;
  options?: InputMaybe<Array<Scalars['String']['input']>>;
  questionText?: InputMaybe<Scalars['String']['input']>;
  questionType?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRadiologyStudyInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  bodyPart?: InputMaybe<Scalars['String']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  modality?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<Scalars['Float']['input']>;
};

/** Replace one role's access across the given modules. */
export type UpdateRoleAccessInput = {
  modules: Array<ModuleAccessInput>;
  subjectKey: Scalars['String']['input'];
  subjectType: Scalars['String']['input'];
};

export type UpdateRoomClassInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  rateAmount?: InputMaybe<Scalars['Float']['input']>;
  rateType?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSalaryAssignmentInput = {
  extraAllowance?: InputMaybe<Scalars['Float']['input']>;
  extraDeduction?: InputMaybe<Scalars['Float']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  templateId?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating salary components on an existing structure. */
export type UpdateSalaryStructureInput = {
  /** Updated basic salary. */
  basicSalary?: InputMaybe<Scalars['Float']['input']>;
  /** Updated DA. */
  da?: InputMaybe<Scalars['Float']['input']>;
  /** Updated ESI deduction. */
  esi?: InputMaybe<Scalars['Float']['input']>;
  /** Updated HRA. */
  hra?: InputMaybe<Scalars['Float']['input']>;
  /** Updated medical allowance. */
  medicalAllowance?: InputMaybe<Scalars['Float']['input']>;
  /** Updated notes. */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Updated other allowances. */
  otherAllowances?: InputMaybe<Scalars['Float']['input']>;
  /** Updated other deductions. */
  otherDeductions?: InputMaybe<Scalars['Float']['input']>;
  /** Updated PF deduction. */
  pf?: InputMaybe<Scalars['Float']['input']>;
  /** Updated TA. */
  ta?: InputMaybe<Scalars['Float']['input']>;
  /** Updated TDS deduction. */
  tds?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateSalaryTemplateInput = {
  basicSalary?: InputMaybe<Scalars['Float']['input']>;
  da?: InputMaybe<Scalars['Float']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  esi?: InputMaybe<Scalars['Float']['input']>;
  hra?: InputMaybe<Scalars['Float']['input']>;
  medicalAllowance?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  otherAllowances?: InputMaybe<Scalars['Float']['input']>;
  otherDeductions?: InputMaybe<Scalars['Float']['input']>;
  pf?: InputMaybe<Scalars['Float']['input']>;
  ta?: InputMaybe<Scalars['Float']['input']>;
  tds?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateStudentAssignmentInput = {
  attachmentUrl?: InputMaybe<Scalars['String']['input']>;
  courseId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['String']['input']>;
  maxMarks?: InputMaybe<Scalars['Float']['input']>;
  section?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a student. All fields optional. */
export type UpdateStudentInput = {
  /** Address. */
  address?: InputMaybe<Scalars['String']['input']>;
  /** Admission status. */
  admissionStatus?: InputMaybe<Scalars['String']['input']>;
  /** Batch/cohort label. */
  batch?: InputMaybe<Scalars['String']['input']>;
  /** Blood group. */
  bloodGroup?: InputMaybe<Scalars['String']['input']>;
  /** City. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** Course UUID. */
  courseId?: InputMaybe<Scalars['String']['input']>;
  /** Date of birth (YYYY-MM-DD). */
  dateOfBirth?: InputMaybe<Scalars['String']['input']>;
  /** Update the linked account's login email. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Emergency contact name. */
  emergencyName?: InputMaybe<Scalars['String']['input']>;
  /** Emergency contact phone. */
  emergencyPhone?: InputMaybe<Scalars['String']['input']>;
  /** Enrollment date (YYYY-MM-DD). */
  enrollDate?: InputMaybe<Scalars['String']['input']>;
  /** Father's name. */
  fatherName?: InputMaybe<Scalars['String']['input']>;
  /** Father's phone. */
  fatherPhone?: InputMaybe<Scalars['String']['input']>;
  /** Gender. */
  gender?: InputMaybe<Scalars['String']['input']>;
  /** Mother's name. */
  motherName?: InputMaybe<Scalars['String']['input']>;
  /** Mother's phone. */
  motherPhone?: InputMaybe<Scalars['String']['input']>;
  /** Update the linked account's display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Nationality. */
  nationality?: InputMaybe<Scalars['String']['input']>;
  /** Set a new account password. Leave blank/omit to keep the current one. */
  password?: InputMaybe<Scalars['String']['input']>;
  /** Phone number. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** Photo URL. */
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  /** PIN code. */
  pincode?: InputMaybe<Scalars['String']['input']>;
  /** Roll number. */
  rollNumber?: InputMaybe<Scalars['String']['input']>;
  /** Section. */
  section?: InputMaybe<Scalars['String']['input']>;
  /** Current semester. */
  semester?: InputMaybe<Scalars['Int']['input']>;
  /** State. */
  state?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a subject (all fields optional). */
export type UpdateSubjectInput = {
  /** Updated code. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** Updated course outcome statements (replaces the list). */
  courseOutcomes?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Updated credits. */
  credits?: InputMaybe<Scalars['Int']['input']>;
  /** Updated department UUID. */
  departmentId?: InputMaybe<Scalars['String']['input']>;
  /** Updated description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Updated lab hours. */
  labHours?: InputMaybe<Scalars['Int']['input']>;
  /** Updated name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Updated semester number. */
  semesterNumber?: InputMaybe<Scalars['Int']['input']>;
  /** Updated syllabus URL. */
  syllabusUrl?: InputMaybe<Scalars['String']['input']>;
  /** Updated teaching hours. */
  teachingHours?: InputMaybe<Scalars['Int']['input']>;
  /** Updated course plan units (replaces the list). */
  units?: InputMaybe<Array<SubjectUnitInput>>;
};

export type UpdateTeleConsultInput = {
  meetingLink?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  scheduledAt?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a timetable slot (all fields optional). */
export type UpdateTimetableSlotInput = {
  /** Updated day of week. */
  dayOfWeek?: InputMaybe<Scalars['String']['input']>;
  /** Updated teacher UUID. */
  employeeId?: InputMaybe<Scalars['String']['input']>;
  /** Updated end time. */
  endTime?: InputMaybe<Scalars['String']['input']>;
  /** Updated period number. */
  periodNumber?: InputMaybe<Scalars['Int']['input']>;
  /** Updated room. */
  room?: InputMaybe<Scalars['String']['input']>;
  /** Updated section. */
  section?: InputMaybe<Scalars['String']['input']>;
  /** Updated semester. */
  semester?: InputMaybe<Scalars['Int']['input']>;
  /** Updated start time. */
  startTime?: InputMaybe<Scalars['String']['input']>;
  /** Updated subject UUID. */
  subjectId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTransportRouteInput = {
  distance?: InputMaybe<Scalars['Float']['input']>;
  endPoint?: InputMaybe<Scalars['String']['input']>;
  routeName?: InputMaybe<Scalars['String']['input']>;
  startPoint?: InputMaybe<Scalars['String']['input']>;
  stops?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTransportVehicleInput = {
  capacity?: InputMaybe<Scalars['Int']['input']>;
  /** Employee UUID of the driver; pass "" to unlink. */
  driverEmployeeId?: InputMaybe<Scalars['String']['input']>;
  driverName?: InputMaybe<Scalars['String']['input']>;
  driverPhone?: InputMaybe<Scalars['String']['input']>;
  routeId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  vehicleNumber?: InputMaybe<Scalars['String']['input']>;
  vehicleType?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTriageCaseInput = {
  assignedClinicianId?: InputMaybe<Scalars['String']['input']>;
  /** Disposition (set when disposed): admitted | discharged | referred | lwbs | deceased. */
  disposition?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Status: waiting | in_treatment | disposed. */
  status?: InputMaybe<Scalars['String']['input']>;
  triageLevel?: InputMaybe<Scalars['Int']['input']>;
  vitals?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating a user account. All fields are optional — omit to keep current value. */
export type UpdateUserInput = {
  /** New email address. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Toggle active status. */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** New display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Reset password (will be hashed). Omit to keep the existing one. */
  password?: InputMaybe<Scalars['String']['input']>;
  /** New role. */
  role?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateVendorInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  address?: InputMaybe<Scalars['String']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  contactName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  gstin?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  paymentTerms?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWardInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  floor?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  wardType?: InputMaybe<Scalars['String']['input']>;
};

export type UpsertCalendarDayInput = {
  date: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
};

/** A user account that can log in to the system. */
export type User = {
  __typename?: 'User';
  /** Email address — used as the login credential. */
  email: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether the account is active and can authenticate. */
  isActive: Scalars['Boolean']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** Role: super_admin | admin | teacher | staff | student. */
  role: Scalars['String']['output'];
};

/** One signed-in session, summarised from its refresh-token rotation chain. */
export type UserSession = {
  __typename?: 'UserSession';
  /** The workspace this session is currently in, e.g. admin | teacher. */
  activeRole: Scalars['String']['output'];
  /** ISO 8601 timestamp of the login that began this session. */
  createdAt: Scalars['String']['output'];
  /** True for the session making this request, so the UI can say "this device". */
  current: Scalars['Boolean']['output'];
  /** A readable device/browser guess derived from the User-Agent. */
  deviceLabel: Scalars['String']['output'];
  /** ISO 8601 timestamp of the session's absolute deadline. */
  expiresAt: Scalars['String']['output'];
  /** The session family's id. Stable across refreshes; used to revoke it. */
  id: Scalars['ID']['output'];
  /** IP recorded at the last refresh. May be empty. */
  ip: Maybe<Scalars['String']['output']>;
  /** ISO 8601 timestamp of the session's most recent refresh. */
  lastUsedAt: Scalars['String']['output'];
  /** Raw User-Agent recorded at the last refresh. May be empty. */
  userAgent: Maybe<Scalars['String']['output']>;
};

export type VacateHostelRoomInput = {
  vacateDate: Scalars['String']['input'];
};

/** A supplier of goods or services. */
export type Vendor = {
  __typename?: 'Vendor';
  active: Scalars['Boolean']['output'];
  address: Maybe<Scalars['String']['output']>;
  code: Maybe<Scalars['String']['output']>;
  contactName: Maybe<Scalars['String']['output']>;
  createdAt: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  gstin: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  paymentTerms: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
};

/** A set of vitals charted for an admitted patient. */
export type VitalsRecord = {
  __typename?: 'VitalsRecord';
  admissionId: Scalars['String']['output'];
  bpDiastolic: Scalars['Int']['output'];
  bpSystolic: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  notes: Maybe<Scalars['String']['output']>;
  painScore: Scalars['Int']['output'];
  patientId: Scalars['String']['output'];
  pulse: Scalars['Int']['output'];
  recordedAt: Scalars['String']['output'];
  recordedById: Maybe<Scalars['String']['output']>;
  recordedByName: Maybe<Scalars['String']['output']>;
  respRate: Scalars['Int']['output'];
  spo2: Scalars['Int']['output'];
  tempC: Scalars['Float']['output'];
};

/** A nursing unit that holds beds (blocks→wards). */
export type Ward = {
  __typename?: 'Ward';
  active: Scalars['Boolean']['output'];
  bedCount: Scalars['Int']['output'];
  beds: Array<Bed>;
  code: Scalars['String']['output'];
  createdAt: Maybe<Scalars['String']['output']>;
  floor: Maybe<Scalars['String']['output']>;
  /** Occupant policy: any | male | female. */
  gender: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  occupiedCount: Scalars['Int']['output'];
  /** Type: general | icu | hdu | maternity | pediatric | private | isolation. */
  wardType: Scalars['String']['output'];
};

/**
 * One switchable role context for a user.
 *
 * A workspace is simply "this person, acting as one of their roles". Switching
 * re-mints the auth cookie with a different active role, so every permission check
 * in the app resolves against the workspace the user is currently in.
 */
export type Workspace = {
  __typename?: 'Workspace';
  /** Optional per-workspace custom-role permission overlay. */
  customRoleId: Maybe<Scalars['ID']['output']>;
  /** True for the workspace backed by the user's primary role. Never revocable. */
  isPrimary: Scalars['Boolean']['output'];
  /** Tenant's label for that role (e.g. "Clinician" in a hospital). */
  label: Scalars['String']['output'];
  /** Base role id this workspace activates (admin/teacher/staff/student/patient). */
  role: Scalars['String']['output'];
};

/** One additional workspace grant, as edited on the admin forms. */
export type WorkspaceRoleInput = {
  /** Optional custom-role overlay to apply inside that workspace. */
  customRoleId?: InputMaybe<Scalars['ID']['input']>;
  /** Base role id to grant. super_admin may not be granted. */
  role: Scalars['String']['input'];
};

export type ListEmployeesMinimalQueryVariables = Exact<{ [key: string]: never; }>;


export type ListEmployeesMinimalQuery = { __typename?: 'Query', employees: Array<{ __typename?: 'Employee', id: string, employeeId: string, user: { __typename?: 'User', name: string } }> };

export type ListStudentsMinimalQueryVariables = Exact<{ [key: string]: never; }>;


export type ListStudentsMinimalQuery = { __typename?: 'Query', students: Array<{ __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', name: string } | null }> };

export type AttendanceEntityNamesQueryVariables = Exact<{ [key: string]: never; }>;


export type AttendanceEntityNamesQuery = { __typename?: 'Query', employees: Array<{ __typename?: 'Employee', id: string, employeeId: string, user: { __typename?: 'User', name: string } }>, students: Array<{ __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', name: string } | null }> };

export type CreateCourseMutationVariables = Exact<{
  input: CreateCourseInput;
}>;


export type CreateCourseMutation = { __typename?: 'Mutation', createCourse: { __typename?: 'Course', id: string, name: string, code: string, description: string | null, durationYears: number | null, totalSemesters: number | null, departmentId: string | null, department: { __typename?: 'Department', id: string, name: string } | null } };

export type UpdateCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateCourseInput;
}>;


export type UpdateCourseMutation = { __typename?: 'Mutation', updateCourse: { __typename?: 'Course', id: string, name: string, code: string, description: string | null, durationYears: number | null, totalSemesters: number | null, departmentId: string | null, department: { __typename?: 'Department', id: string, name: string } | null } };

export type DeleteCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCourseMutation = { __typename?: 'Mutation', deleteCourse: boolean };

export type CreateSubjectMutationVariables = Exact<{
  input: CreateSubjectInput;
}>;


export type CreateSubjectMutation = { __typename?: 'Mutation', createSubject: { __typename?: 'Subject', id: string, name: string, code: string, credits: number | null, departmentId: string | null, courseOutcomes: Array<string>, department: { __typename?: 'Department', id: string, name: string } | null, units: Array<{ __typename?: 'SubjectUnit', title: string, content: string, labActivities: string | null, fieldVisits: string | null, others: string | null }> } };

export type UpdateSubjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateSubjectInput;
}>;


export type UpdateSubjectMutation = { __typename?: 'Mutation', updateSubject: { __typename?: 'Subject', id: string, name: string, code: string, credits: number | null, teachingHours: number | null, labHours: number | null, semesterNumber: number | null, description: string | null, syllabusUrl: string | null, departmentId: string | null, courseOutcomes: Array<string>, department: { __typename?: 'Department', id: string, name: string } | null, units: Array<{ __typename?: 'SubjectUnit', title: string, content: string, labActivities: string | null, fieldVisits: string | null, others: string | null }> } };

export type DeleteSubjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSubjectMutation = { __typename?: 'Mutation', deleteSubject: boolean };

export type SetCurriculumSubjectsMutationVariables = Exact<{
  input: SetCurriculumSubjectsInput;
}>;


export type SetCurriculumSubjectsMutation = { __typename?: 'Mutation', setCurriculumSubjects: Array<{ __typename?: 'CurriculumSubject', id: string, courseId: string, semesterNumber: number, sortOrder: number | null, subject: { __typename?: 'Subject', id: string, name: string, code: string } }> };

export type CreateExamScheduleMutationVariables = Exact<{
  input: CreateExamScheduleInput;
}>;


export type CreateExamScheduleMutation = { __typename?: 'Mutation', createExamSchedule: { __typename?: 'ExamSchedule', id: string, name: string, examType: string, semesterNumber: number | null, startDate: string | null, endDate: string | null, published: boolean, instructions: string | null, academicYearId: string | null } };

export type UpdateExamScheduleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateExamScheduleInput;
}>;


export type UpdateExamScheduleMutation = { __typename?: 'Mutation', updateExamSchedule: { __typename?: 'ExamSchedule', id: string, name: string, examType: string, semesterNumber: number | null, startDate: string | null, endDate: string | null, published: boolean, instructions: string | null, academicYearId: string | null } };

export type PublishExamScheduleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  published: Scalars['Boolean']['input'];
}>;


export type PublishExamScheduleMutation = { __typename?: 'Mutation', publishExamSchedule: { __typename?: 'ExamSchedule', id: string, published: boolean } };

export type DeleteExamScheduleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteExamScheduleMutation = { __typename?: 'Mutation', deleteExamSchedule: boolean };

export type CreateExamTypeMutationVariables = Exact<{
  input: CreateExamTypeInput;
}>;


export type CreateExamTypeMutation = { __typename?: 'Mutation', createExamType: { __typename?: 'ExamType', id: string, name: string, departmentId: string | null, maxMarks: number, weightage: number | null, active: boolean, createdAt: string | null, department: { __typename?: 'Department', id: string, name: string } | null } };

export type UpdateExamTypeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateExamTypeInput;
}>;


export type UpdateExamTypeMutation = { __typename?: 'Mutation', updateExamType: { __typename?: 'ExamType', id: string, name: string, departmentId: string | null, maxMarks: number, weightage: number | null, active: boolean, createdAt: string | null, department: { __typename?: 'Department', id: string, name: string } | null } };

export type DeleteExamTypeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteExamTypeMutation = { __typename?: 'Mutation', deleteExamType: boolean };

export type DeleteSemesterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSemesterMutation = { __typename?: 'Mutation', deleteSemester: boolean };

export type DeleteAcademicYearMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAcademicYearMutation = { __typename?: 'Mutation', deleteAcademicYear: boolean };

export type CreateCourseBatchMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
  startYear: Scalars['Int']['input'];
}>;


export type CreateCourseBatchMutation = { __typename?: 'Mutation', createCourseBatch: { __typename?: 'CourseBatch', id: string, name: string, startYear: number, endYear: number } };

export type DeleteCourseBatchMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCourseBatchMutation = { __typename?: 'Mutation', deleteCourseBatch: boolean };

export type CreateAnnouncementMutationVariables = Exact<{
  input: CreateAnnouncementInput;
}>;


export type CreateAnnouncementMutation = { __typename?: 'Mutation', createAnnouncement: { __typename?: 'AnnouncementItem', id: string, title: string, body: string, targetRoles: string, priority: string, isPublished: boolean, expiresAt: string | null } };

export type UpdateAnnouncementMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateAnnouncementInput;
}>;


export type UpdateAnnouncementMutation = { __typename?: 'Mutation', updateAnnouncement: { __typename?: 'AnnouncementItem', id: string, title: string, body: string, targetRoles: string, priority: string, isPublished: boolean, expiresAt: string | null } };

export type DeleteAnnouncementMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAnnouncementMutation = { __typename?: 'Mutation', deleteAnnouncement: boolean };

export type ApproveRequestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  comment?: InputMaybe<Scalars['String']['input']>;
}>;


export type ApproveRequestMutation = { __typename?: 'Mutation', approveRequest: { __typename?: 'ApprovalRequest', id: string, flowId: string, process: string, referenceId: string, requesterId: string, title: string, currentStep: number, status: string, createdAt: string } };

export type RejectRequestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  comment?: InputMaybe<Scalars['String']['input']>;
}>;


export type RejectRequestMutation = { __typename?: 'Mutation', rejectRequest: { __typename?: 'ApprovalRequest', id: string, flowId: string, process: string, referenceId: string, requesterId: string, title: string, currentStep: number, status: string, createdAt: string } };

export type MarkAttendanceMutationVariables = Exact<{
  input: MarkAttendanceInput;
}>;


export type MarkAttendanceMutation = { __typename?: 'Mutation', markAttendance: { __typename?: 'AttendanceRecord', id: string, entityId: string, entityType: string, date: string, status: string, remarks: string | null } };

export type BulkMarkAttendanceMutationVariables = Exact<{
  inputs: Array<MarkAttendanceInput> | MarkAttendanceInput;
}>;


export type BulkMarkAttendanceMutation = { __typename?: 'Mutation', bulkMarkAttendance: Array<{ __typename?: 'AttendanceRecord', id: string, entityId: string, entityType: string, date: string, status: string }> };

export type UpdateBrochureContentMutationVariables = Exact<{
  content: Scalars['String']['input'];
}>;


export type UpdateBrochureContentMutation = { __typename?: 'Mutation', updateBrochureContent: string };

export type UpdateCalendarSettingsMutationVariables = Exact<{
  input: UpdateCalendarSettingsInput;
}>;


export type UpdateCalendarSettingsMutation = { __typename?: 'Mutation', updateCalendarSettings: { __typename?: 'CalendarSettings', id: string, sundayOff: boolean, saturdayRule: string, saturdayWeeks: string, defaultWorking: number } };

export type GenerateCalendarMutationVariables = Exact<{
  year: Scalars['Int']['input'];
}>;


export type GenerateCalendarMutation = { __typename?: 'Mutation', generateCalendar: { __typename?: 'GenerateCalendarResult', year: number, created: number } };

export type UpsertCalendarDayMutationVariables = Exact<{
  input: UpsertCalendarDayInput;
}>;


export type UpsertCalendarDayMutation = { __typename?: 'Mutation', upsertCalendarDay: { __typename?: 'Holiday', id: string, date: string, type: string, name: string, autoGen: boolean } | null };

export type UpdateAttendanceSettingsMutationVariables = Exact<{
  input: UpdateAttendanceSettingsInput;
}>;


export type UpdateAttendanceSettingsMutation = { __typename?: 'Mutation', updateAttendanceSettings: { __typename?: 'AttendanceSettings', id: string, minAttendancePct: number, gracePeriodMinutes: number, lockAfterHours: number } };

export type CreateStudentAssignmentMutationVariables = Exact<{
  input: CreateStudentAssignmentInput;
}>;


export type CreateStudentAssignmentMutation = { __typename?: 'Mutation', createStudentAssignment: { __typename?: 'StudentAssignment', id: string } };

export type UpdateStudentAssignmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateStudentAssignmentInput;
}>;


export type UpdateStudentAssignmentMutation = { __typename?: 'Mutation', updateStudentAssignment: { __typename?: 'StudentAssignment', id: string } };

export type PublishStudentAssignmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublishStudentAssignmentMutation = { __typename?: 'Mutation', publishStudentAssignment: { __typename?: 'StudentAssignment', id: string, status: string } };

export type CloseStudentAssignmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CloseStudentAssignmentMutation = { __typename?: 'Mutation', closeStudentAssignment: { __typename?: 'StudentAssignment', id: string, status: string } };

export type DeleteStudentAssignmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteStudentAssignmentMutation = { __typename?: 'Mutation', deleteStudentAssignment: boolean };

export type GradeAssignmentSubmissionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  marksAwarded: Scalars['Float']['input'];
  feedback?: InputMaybe<Scalars['String']['input']>;
}>;


export type GradeAssignmentSubmissionMutation = { __typename?: 'Mutation', gradeAssignmentSubmission: { __typename?: 'AssignmentSubmission', id: string } };

export type SubmitAssignmentMutationVariables = Exact<{
  assignmentId: Scalars['ID']['input'];
  input: SubmitAssignmentInput;
}>;


export type SubmitAssignmentMutation = { __typename?: 'Mutation', submitAssignment: { __typename?: 'AssignmentSubmission', id: string } };

export type SetMessMenuMutationVariables = Exact<{
  input: MessMenuInput;
}>;


export type SetMessMenuMutation = { __typename?: 'Mutation', setMessMenu: { __typename?: 'MessMenu', id: string } };

export type DeleteMessMenuMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMessMenuMutation = { __typename?: 'Mutation', deleteMessMenu: boolean };

export type MarkMessAttendanceMutationVariables = Exact<{
  date: Scalars['String']['input'];
  meal: Scalars['String']['input'];
  studentIds: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type MarkMessAttendanceMutation = { __typename?: 'Mutation', markMessAttendance: { __typename?: 'MessAttendanceResult', marked: number, cleared: number } };

export type CreateMessExpenseMutationVariables = Exact<{
  input: MessExpenseInput;
}>;


export type CreateMessExpenseMutation = { __typename?: 'Mutation', createMessExpense: { __typename?: 'MessExpense', id: string } };

export type UpdateMessExpenseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: MessExpenseInput;
}>;


export type UpdateMessExpenseMutation = { __typename?: 'Mutation', updateMessExpense: { __typename?: 'MessExpense', id: string } };

export type DeleteMessExpenseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMessExpenseMutation = { __typename?: 'Mutation', deleteMessExpense: boolean };

export type PingVehicleLocationMutationVariables = Exact<{
  vehicleId: Scalars['ID']['input'];
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
}>;


export type PingVehicleLocationMutation = { __typename?: 'Mutation', pingVehicleLocation: { __typename?: 'LiveVehicle', id: string, latitude: number, longitude: number, lastPingAt: string | null } };

export type MarkDriverAttendanceMutationVariables = Exact<{
  input: DriverAttendanceInput;
}>;


export type MarkDriverAttendanceMutation = { __typename?: 'Mutation', markDriverAttendance: { __typename?: 'DriverAttendance', id: string } };

export type DeleteDriverAttendanceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDriverAttendanceMutation = { __typename?: 'Mutation', deleteDriverAttendance: boolean };

export type CreatePatientMutationVariables = Exact<{
  input: CreatePatientInput;
}>;


export type CreatePatientMutation = { __typename?: 'Mutation', createPatient: { __typename?: 'Patient', id: string, mrn: string } };

export type UpdatePatientMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdatePatientInput;
}>;


export type UpdatePatientMutation = { __typename?: 'Mutation', updatePatient: { __typename?: 'Patient', id: string, mrn: string, status: string } };

export type DeletePatientMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePatientMutation = { __typename?: 'Mutation', deletePatient: boolean };

export type CreateAppointmentMutationVariables = Exact<{
  input: CreateAppointmentInput;
}>;


export type CreateAppointmentMutation = { __typename?: 'Mutation', createAppointment: { __typename?: 'Appointment', id: string, status: string } };

export type UpdateAppointmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateAppointmentInput;
}>;


export type UpdateAppointmentMutation = { __typename?: 'Mutation', updateAppointment: { __typename?: 'Appointment', id: string, status: string } };

export type DeleteAppointmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAppointmentMutation = { __typename?: 'Mutation', deleteAppointment: boolean };

export type CreateEncounterMutationVariables = Exact<{
  input: CreateEncounterInput;
}>;


export type CreateEncounterMutation = { __typename?: 'Mutation', createEncounter: { __typename?: 'Encounter', id: string, status: string } };

export type UpdateEncounterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateEncounterInput;
}>;


export type UpdateEncounterMutation = { __typename?: 'Mutation', updateEncounter: { __typename?: 'Encounter', id: string, status: string } };

export type DeleteEncounterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteEncounterMutation = { __typename?: 'Mutation', deleteEncounter: boolean };

export type CreateBillableServiceMutationVariables = Exact<{
  input: CreateBillableServiceInput;
}>;


export type CreateBillableServiceMutation = { __typename?: 'Mutation', createBillableService: { __typename?: 'BillableService', id: string } };

export type UpdateBillableServiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateBillableServiceInput;
}>;


export type UpdateBillableServiceMutation = { __typename?: 'Mutation', updateBillableService: { __typename?: 'BillableService', id: string } };

export type DeleteBillableServiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBillableServiceMutation = { __typename?: 'Mutation', deleteBillableService: boolean };

export type CreateInvoiceMutationVariables = Exact<{
  input: CreateInvoiceInput;
}>;


export type CreateInvoiceMutation = { __typename?: 'Mutation', createInvoice: { __typename?: 'Invoice', id: string, invoiceNo: string } };

export type CancelInvoiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelInvoiceMutation = { __typename?: 'Mutation', cancelInvoice: { __typename?: 'Invoice', id: string, status: string } };

export type RecordInvoicePaymentMutationVariables = Exact<{
  input: RecordInvoicePaymentInput;
}>;


export type RecordInvoicePaymentMutation = { __typename?: 'Mutation', recordInvoicePayment: { __typename?: 'Invoice', id: string, amountPaid: number, status: string } };

export type CreateDrugMutationVariables = Exact<{
  input: CreateDrugInput;
}>;


export type CreateDrugMutation = { __typename?: 'Mutation', createDrug: { __typename?: 'Drug', id: string } };

export type UpdateDrugMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDrugInput;
}>;


export type UpdateDrugMutation = { __typename?: 'Mutation', updateDrug: { __typename?: 'Drug', id: string } };

export type DeleteDrugMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDrugMutation = { __typename?: 'Mutation', deleteDrug: boolean };

export type AdjustDrugStockMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  delta: Scalars['Float']['input'];
}>;


export type AdjustDrugStockMutation = { __typename?: 'Mutation', adjustDrugStock: { __typename?: 'Drug', id: string, stockQty: number } };

export type CreateDrugBatchMutationVariables = Exact<{
  input: CreateDrugBatchInput;
}>;


export type CreateDrugBatchMutation = { __typename?: 'Mutation', createDrugBatch: { __typename?: 'DrugBatch', id: string } };

export type CreateDispenseMutationVariables = Exact<{
  input: CreateDispenseInput;
}>;


export type CreateDispenseMutation = { __typename?: 'Mutation', createDispense: { __typename?: 'Dispense', id: string } };

export type CreateClinicianScheduleMutationVariables = Exact<{
  input: CreateClinicianScheduleInput;
}>;


export type CreateClinicianScheduleMutation = { __typename?: 'Mutation', createClinicianSchedule: { __typename?: 'ClinicianSchedule', id: string } };

export type UpdateClinicianScheduleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateClinicianScheduleInput;
}>;


export type UpdateClinicianScheduleMutation = { __typename?: 'Mutation', updateClinicianSchedule: { __typename?: 'ClinicianSchedule', id: string } };

export type DeleteClinicianScheduleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteClinicianScheduleMutation = { __typename?: 'Mutation', deleteClinicianSchedule: boolean };

export type CreateLabTestMutationVariables = Exact<{
  input: CreateLabTestInput;
}>;


export type CreateLabTestMutation = { __typename?: 'Mutation', createLabTest: { __typename?: 'LabTest', id: string } };

export type UpdateLabTestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateLabTestInput;
}>;


export type UpdateLabTestMutation = { __typename?: 'Mutation', updateLabTest: { __typename?: 'LabTest', id: string } };

export type DeleteLabTestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLabTestMutation = { __typename?: 'Mutation', deleteLabTest: boolean };

export type CreateLabOrderMutationVariables = Exact<{
  input: CreateLabOrderInput;
}>;


export type CreateLabOrderMutation = { __typename?: 'Mutation', createLabOrder: { __typename?: 'LabOrder', id: string } };

export type EnterLabResultsMutationVariables = Exact<{
  orderId: Scalars['ID']['input'];
  results: Array<LabResultInput> | LabResultInput;
}>;


export type EnterLabResultsMutation = { __typename?: 'Mutation', enterLabResults: { __typename?: 'LabOrder', id: string, status: string } };

export type CancelLabOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelLabOrderMutation = { __typename?: 'Mutation', cancelLabOrder: { __typename?: 'LabOrder', id: string, status: string } };

export type CreateRadiologyStudyMutationVariables = Exact<{
  input: CreateRadiologyStudyInput;
}>;


export type CreateRadiologyStudyMutation = { __typename?: 'Mutation', createRadiologyStudy: { __typename?: 'RadiologyStudy', id: string } };

export type UpdateRadiologyStudyMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateRadiologyStudyInput;
}>;


export type UpdateRadiologyStudyMutation = { __typename?: 'Mutation', updateRadiologyStudy: { __typename?: 'RadiologyStudy', id: string } };

export type DeleteRadiologyStudyMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteRadiologyStudyMutation = { __typename?: 'Mutation', deleteRadiologyStudy: boolean };

export type CreateRadiologyOrderMutationVariables = Exact<{
  input: CreateRadiologyOrderInput;
}>;


export type CreateRadiologyOrderMutation = { __typename?: 'Mutation', createRadiologyOrder: { __typename?: 'RadiologyOrder', id: string } };

export type SetRadiologyOrderStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
}>;


export type SetRadiologyOrderStatusMutation = { __typename?: 'Mutation', setRadiologyOrderStatus: { __typename?: 'RadiologyOrder', id: string, status: string } };

export type ReportRadiologyOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: RadiologyReportInput;
}>;


export type ReportRadiologyOrderMutation = { __typename?: 'Mutation', reportRadiologyOrder: { __typename?: 'RadiologyOrder', id: string, status: string } };

export type CreateWardMutationVariables = Exact<{
  input: CreateWardInput;
}>;


export type CreateWardMutation = { __typename?: 'Mutation', createWard: { __typename?: 'Ward', id: string } };

export type UpdateWardMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateWardInput;
}>;


export type UpdateWardMutation = { __typename?: 'Mutation', updateWard: { __typename?: 'Ward', id: string } };

export type DeleteWardMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteWardMutation = { __typename?: 'Mutation', deleteWard: boolean };

export type CreateBedMutationVariables = Exact<{
  input: CreateBedInput;
}>;


export type CreateBedMutation = { __typename?: 'Mutation', createBed: { __typename?: 'Bed', id: string } };

export type UpdateBedMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateBedInput;
}>;


export type UpdateBedMutation = { __typename?: 'Mutation', updateBed: { __typename?: 'Bed', id: string } };

export type DeleteBedMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBedMutation = { __typename?: 'Mutation', deleteBed: boolean };

export type CreateAdmissionMutationVariables = Exact<{
  input: CreateAdmissionInput;
}>;


export type CreateAdmissionMutation = { __typename?: 'Mutation', createAdmission: { __typename?: 'Admission', id: string } };

export type TransferAdmissionMutationVariables = Exact<{
  input: TransferAdmissionInput;
}>;


export type TransferAdmissionMutation = { __typename?: 'Mutation', transferAdmission: { __typename?: 'Admission', id: string } };

export type DischargeAdmissionMutationVariables = Exact<{
  input: DischargeAdmissionInput;
}>;


export type DischargeAdmissionMutation = { __typename?: 'Mutation', dischargeAdmission: { __typename?: 'Admission', id: string, status: string } };

export type UpdateEmailSettingsMutationVariables = Exact<{
  input: UpdateEmailSettingsInput;
}>;


export type UpdateEmailSettingsMutation = { __typename?: 'Mutation', updateEmailSettings: { __typename?: 'EmailSettings', enabled: boolean, fromName: string, fromEmail: string, smtpHost: string, smtpPort: number, smtpUsername: string, useTls: boolean, hasPassword: boolean } };

export type TestEmailSettingsMutationVariables = Exact<{
  to?: InputMaybe<Scalars['String']['input']>;
}>;


export type TestEmailSettingsMutation = { __typename?: 'Mutation', testEmailSettings: boolean };

export type ResendInviteMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type ResendInviteMutation = { __typename?: 'Mutation', resendInvite: { __typename?: 'InviteResult', link: string, sent: boolean, expiresAt: string } };

export type CreateEmployeeMutationVariables = Exact<{
  input: CreateEmployeeInput;
}>;


export type CreateEmployeeMutation = { __typename?: 'Mutation', createEmployee: { __typename?: 'Employee', id: string, employeeId: string, designation: string | null, phone: string | null, joinDate: string | null, user: { __typename?: 'User', id: string, name: string, email: string }, department: { __typename?: 'Department', id: string, name: string } | null } };

export type UpdateEmployeeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateEmployeeInput;
}>;


export type UpdateEmployeeMutation = { __typename?: 'Mutation', updateEmployee: { __typename?: 'Employee', id: string, employeeId: string, designation: string | null, phone: string | null, joinDate: string | null, user: { __typename?: 'User', id: string, name: string, email: string }, department: { __typename?: 'Department', id: string, name: string } | null } };

export type DeleteEmployeeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteEmployeeMutation = { __typename?: 'Mutation', deleteEmployee: boolean };

export type CreateDepartmentMutationVariables = Exact<{
  input: CreateDepartmentInput;
}>;


export type CreateDepartmentMutation = { __typename?: 'Mutation', createDepartment: { __typename?: 'Department', id: string, name: string } };

export type CreateUserMutationVariables = Exact<{
  input: CreateUserInput;
}>;


export type CreateUserMutation = { __typename?: 'Mutation', createUser: { __typename?: 'User', id: string, name: string, email: string, role: string, isActive: boolean } };

export type UpdateUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
}>;


export type UpdateUserMutation = { __typename?: 'Mutation', updateUser: { __typename?: 'User', id: string, name: string, email: string, role: string, isActive: boolean } };

export type DeactivateUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeactivateUserMutation = { __typename?: 'Mutation', deactivateUser: boolean };

export type DeleteUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteUserMutation = { __typename?: 'Mutation', deleteUser: boolean };

export type CreateEventMutationVariables = Exact<{
  input: CreateEventInput;
}>;


export type CreateEventMutation = { __typename?: 'Mutation', createEvent: { __typename?: 'EventItem', id: string, title: string, description: string | null, eventDate: string, endDate: string, location: string | null, category: string, color: string | null, isPublic: boolean, createdBy: string | null } };

export type UpdateEventMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateEventInput;
}>;


export type UpdateEventMutation = { __typename?: 'Mutation', updateEvent: { __typename?: 'EventItem', id: string, title: string, description: string | null, eventDate: string, endDate: string, location: string | null, category: string, color: string | null, isPublic: boolean } };

export type DeleteEventMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteEventMutation = { __typename?: 'Mutation', deleteEvent: boolean };

export type CreateEventCategoryMutationVariables = Exact<{
  input: CreateEventCategoryInput;
}>;


export type CreateEventCategoryMutation = { __typename?: 'Mutation', createEventCategory: { __typename?: 'EventCategory', id: string, name: string, slug: string, color: string | null, description: string | null } };

export type UpdateEventCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateEventCategoryInput;
}>;


export type UpdateEventCategoryMutation = { __typename?: 'Mutation', updateEventCategory: { __typename?: 'EventCategory', id: string, name: string, slug: string, color: string | null, description: string | null } };

export type DeleteEventCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteEventCategoryMutation = { __typename?: 'Mutation', deleteEventCategory: boolean };

export type CreateQuestionBankItemMutationVariables = Exact<{
  input: CreateQuestionBankItemInput;
}>;


export type CreateQuestionBankItemMutation = { __typename?: 'Mutation', createQuestionBankItem: { __typename?: 'QuestionBankItem', id: string, questionText: string, questionType: string, difficulty: string, marks: number, unit: string | null, options: Array<string>, answer: string | null, courseOutcome: string | null, active: boolean } };

export type UpdateQuestionBankItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateQuestionBankItemInput;
}>;


export type UpdateQuestionBankItemMutation = { __typename?: 'Mutation', updateQuestionBankItem: { __typename?: 'QuestionBankItem', id: string, questionText: string, questionType: string, difficulty: string, marks: number, unit: string | null, options: Array<string>, answer: string | null, courseOutcome: string | null, active: boolean } };

export type DeleteQuestionBankItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteQuestionBankItemMutation = { __typename?: 'Mutation', deleteQuestionBankItem: boolean };

export type GenerateQuestionPaperMutationVariables = Exact<{
  input: GenerateQuestionPaperInput;
}>;


export type GenerateQuestionPaperMutation = { __typename?: 'Mutation', generateQuestionPaper: { __typename?: 'QuestionPaper', id: string, title: string, totalMarks: number, durationMinutes: number | null, status: string, items: Array<{ __typename?: 'QuestionPaperItem', id: string, seqNo: number, questionText: string, questionType: string, marks: number, options: Array<string>, section: string | null }> } };

export type FinalizeQuestionPaperMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type FinalizeQuestionPaperMutation = { __typename?: 'Mutation', finalizeQuestionPaper: { __typename?: 'QuestionPaper', id: string, status: string } };

export type DeleteQuestionPaperMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteQuestionPaperMutation = { __typename?: 'Mutation', deleteQuestionPaper: boolean };

export type IssueHallTicketsMutationVariables = Exact<{
  input: IssueHallTicketsInput;
}>;


export type IssueHallTicketsMutation = { __typename?: 'Mutation', issueHallTickets: { __typename?: 'HallTicketIssueResult', issued: number, held: number, skipped: number, tickets: Array<{ __typename?: 'HallTicket', id: string, ticketNumber: string, seatNumber: string | null, eligible: boolean, holdReason: string | null, status: string }> } };

export type RevokeHallTicketMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeHallTicketMutation = { __typename?: 'Mutation', revokeHallTicket: { __typename?: 'HallTicket', id: string, status: string, eligible: boolean, holdReason: string | null } };

export type ReleaseHallTicketHoldMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ReleaseHallTicketHoldMutation = { __typename?: 'Mutation', releaseHallTicketHold: { __typename?: 'HallTicket', id: string, status: string, eligible: boolean, holdReason: string | null } };

export type AddBloodUnitMutationVariables = Exact<{
  input: CreateBloodUnitInput;
}>;


export type AddBloodUnitMutation = { __typename?: 'Mutation', addBloodUnit: { __typename?: 'BloodUnit', id: string } };

export type UpdateBloodUnitStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
}>;


export type UpdateBloodUnitStatusMutation = { __typename?: 'Mutation', updateBloodUnitStatus: { __typename?: 'BloodUnit', id: string, status: string } };

export type IssueBloodUnitMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  patientId: Scalars['String']['input'];
}>;


export type IssueBloodUnitMutation = { __typename?: 'Mutation', issueBloodUnit: { __typename?: 'BloodUnit', id: string, status: string } };

export type DeleteBloodUnitMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBloodUnitMutation = { __typename?: 'Mutation', deleteBloodUnit: boolean };

export type CreateBloodRequestMutationVariables = Exact<{
  input: CreateBloodRequestInput;
}>;


export type CreateBloodRequestMutation = { __typename?: 'Mutation', createBloodRequest: { __typename?: 'BloodRequest', id: string } };

export type FulfillBloodRequestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type FulfillBloodRequestMutation = { __typename?: 'Mutation', fulfillBloodRequest: { __typename?: 'BloodRequest', id: string, status: string } };

export type CancelBloodRequestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelBloodRequestMutation = { __typename?: 'Mutation', cancelBloodRequest: { __typename?: 'BloodRequest', id: string, status: string } };

export type CreateAmbulanceMutationVariables = Exact<{
  input: CreateAmbulanceInput;
}>;


export type CreateAmbulanceMutation = { __typename?: 'Mutation', createAmbulance: { __typename?: 'Ambulance', id: string } };

export type UpdateAmbulanceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateAmbulanceInput;
}>;


export type UpdateAmbulanceMutation = { __typename?: 'Mutation', updateAmbulance: { __typename?: 'Ambulance', id: string } };

export type DeleteAmbulanceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAmbulanceMutation = { __typename?: 'Mutation', deleteAmbulance: boolean };

export type DispatchAmbulanceMutationVariables = Exact<{
  input: DispatchAmbulanceInput;
}>;


export type DispatchAmbulanceMutation = { __typename?: 'Mutation', dispatchAmbulance: { __typename?: 'AmbulanceTrip', id: string } };

export type CompleteAmbulanceTripMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CompleteAmbulanceTripMutation = { __typename?: 'Mutation', completeAmbulanceTrip: { __typename?: 'AmbulanceTrip', id: string, status: string } };

export type CancelAmbulanceTripMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelAmbulanceTripMutation = { __typename?: 'Mutation', cancelAmbulanceTrip: { __typename?: 'AmbulanceTrip', id: string, status: string } };

export type CreateDietPlanMutationVariables = Exact<{
  input: CreateDietPlanInput;
}>;


export type CreateDietPlanMutation = { __typename?: 'Mutation', createDietPlan: { __typename?: 'DietPlan', id: string } };

export type UpdateDietPlanMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDietPlanInput;
}>;


export type UpdateDietPlanMutation = { __typename?: 'Mutation', updateDietPlan: { __typename?: 'DietPlan', id: string } };

export type DiscontinueDietPlanMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DiscontinueDietPlanMutation = { __typename?: 'Mutation', discontinueDietPlan: { __typename?: 'DietPlan', id: string, status: string } };

export type RecordMealServingMutationVariables = Exact<{
  input: RecordMealServingInput;
}>;


export type RecordMealServingMutation = { __typename?: 'Mutation', recordMealServing: { __typename?: 'DietPlan', id: string } };

export type ScheduleTeleConsultMutationVariables = Exact<{
  input: ScheduleTeleConsultInput;
}>;


export type ScheduleTeleConsultMutation = { __typename?: 'Mutation', scheduleTeleConsult: { __typename?: 'TeleConsult', id: string } };

export type UpdateTeleConsultMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateTeleConsultInput;
}>;


export type UpdateTeleConsultMutation = { __typename?: 'Mutation', updateTeleConsult: { __typename?: 'TeleConsult', id: string, status: string } };

export type CancelTeleConsultMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelTeleConsultMutation = { __typename?: 'Mutation', cancelTeleConsult: { __typename?: 'TeleConsult', id: string, status: string } };

export type CreateReferralMutationVariables = Exact<{
  input: CreateReferralInput;
}>;


export type CreateReferralMutation = { __typename?: 'Mutation', createReferral: { __typename?: 'Referral', id: string } };

export type SetReferralStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
}>;


export type SetReferralStatusMutation = { __typename?: 'Mutation', setReferralStatus: { __typename?: 'Referral', id: string, status: string } };

export type DeleteReferralMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteReferralMutation = { __typename?: 'Mutation', deleteReferral: boolean };

export type SetReferralCommissionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: SetReferralCommissionInput;
}>;


export type SetReferralCommissionMutation = { __typename?: 'Mutation', setReferralCommission: { __typename?: 'Referral', id: string, commissionType: string, commissionValue: number, commissionBase: number, commissionAmount: number, payeeType: string | null, payeeName: string | null, payeeEmployeeId: string | null, payeeEmployeeName: string | null, settlementStatus: string } };

export type SettleReferralMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SettleReferralMutation = { __typename?: 'Mutation', settleReferral: { __typename?: 'Referral', id: string, settlementStatus: string, settledOn: string | null, commissionAmount: number } };

export type CreatePatientLoginMutationVariables = Exact<{
  patientId: Scalars['ID']['input'];
  email: Scalars['String']['input'];
  password?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreatePatientLoginMutation = { __typename?: 'Mutation', createPatientLogin: { __typename?: 'Patient', id: string } };

export type CreateAccountMutationVariables = Exact<{
  input: CreateAccountInput;
}>;


export type CreateAccountMutation = { __typename?: 'Mutation', createAccount: { __typename?: 'Account', id: string, code: string, name: string, type: string, parentId: string | null, isSystem: boolean, active: boolean } };

export type UpdateAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateAccountInput;
}>;


export type UpdateAccountMutation = { __typename?: 'Mutation', updateAccount: { __typename?: 'Account', id: string, code: string, name: string, type: string, parentId: string | null, isSystem: boolean, active: boolean } };

export type DeleteAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAccountMutation = { __typename?: 'Mutation', deleteAccount: boolean };

export type CreateManualJournalMutationVariables = Exact<{
  input: CreateManualJournalInput;
}>;


export type CreateManualJournalMutation = { __typename?: 'Mutation', createManualJournal: { __typename?: 'LedgerBatch', id: string, date: string, memo: string | null, posted: boolean, lines: Array<{ __typename?: 'LedgerEntry', id: string, accountId: string, accountCode: string | null, debit: number, credit: number, memo: string | null }> } };

export type SaveGradingSchemeMutationVariables = Exact<{
  input: SaveGradingSchemeInput;
}>;


export type SaveGradingSchemeMutation = { __typename?: 'Mutation', saveGradingScheme: { __typename?: 'GradingScheme', id: string, mode: string, gpaMax: number, passThreshold: number, decimals: number, creditWeighted: boolean, weightedByExamType: boolean, bands: Array<{ __typename?: 'GradeBand', id: string, letter: string, minPercent: number, maxPercent: number, gradePoint: number, isPass: boolean, sortOrder: number }> } };

export type CreateHolidayMutationVariables = Exact<{
  input: CreateHolidayInput;
}>;


export type CreateHolidayMutation = { __typename?: 'Mutation', createHoliday: Array<{ __typename?: 'Holiday', id: string, academicYearId: string, name: string, date: string, type: string, autoGen: boolean }> };

export type DeleteHolidayMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteHolidayMutation = { __typename?: 'Mutation', deleteHoliday: boolean };

export type BulkDeleteHolidaysMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type BulkDeleteHolidaysMutation = { __typename?: 'Mutation', bulkDeleteHolidays: number };

export type CopyHolidaysToAcademicYearMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  targetAcademicYearId: Scalars['String']['input'];
}>;


export type CopyHolidaysToAcademicYearMutation = { __typename?: 'Mutation', copyHolidaysToAcademicYear: { __typename?: 'CopyResult', copied: number } };

export type CreateHostelBlockMutationVariables = Exact<{
  input: CreateHostelBlockInput;
}>;


export type CreateHostelBlockMutation = { __typename?: 'Mutation', createHostelBlock: { __typename?: 'HostelBlock', id: string, name: string, type: string, floors: number } };

export type BulkDeleteHostelBlocksMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type BulkDeleteHostelBlocksMutation = { __typename?: 'Mutation', bulkDeleteHostelBlocks: number };

export type CreateHostelRoomMutationVariables = Exact<{
  input: CreateHostelRoomInput;
}>;


export type CreateHostelRoomMutation = { __typename?: 'Mutation', createHostelRoom: { __typename?: 'HostelRoom', id: string, blockId: string, roomNumber: string, floor: number, capacity: number, occupied: number, roomType: string, status: string, monthlyFee: number, roomClassId: string | null, effectiveRateType: string, semesterRate: number, annualRate: number, monthlyRate: number, roomClass: { __typename?: 'RoomClass', id: string, name: string } | null, block: { __typename?: 'HostelBlock', id: string, name: string } | null } };

export type UpdateHostelRoomMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateHostelRoomInput;
}>;


export type UpdateHostelRoomMutation = { __typename?: 'Mutation', updateHostelRoom: { __typename?: 'HostelRoom', id: string, blockId: string, roomNumber: string, floor: number, capacity: number, occupied: number, roomType: string, status: string, monthlyFee: number, roomClassId: string | null, effectiveRateType: string, semesterRate: number, annualRate: number, monthlyRate: number, roomClass: { __typename?: 'RoomClass', id: string, name: string } | null, block: { __typename?: 'HostelBlock', id: string, name: string } | null } };

export type AllocateHostelRoomMutationVariables = Exact<{
  input: AllocateHostelRoomInput;
}>;


export type AllocateHostelRoomMutation = { __typename?: 'Mutation', allocateHostelRoom: { __typename?: 'HostelAllocation', id: string, studentId: string, roomId: string, bedNumber: number, allocDate: string, vacateDate: string | null, status: string, student: { __typename?: 'Student', id: string, rollNumber: string, gender: string | null, user: { __typename?: 'User', id: string, name: string } | null } | null, room: { __typename?: 'HostelRoom', id: string, roomNumber: string, block: { __typename?: 'HostelBlock', id: string, name: string, type: string } | null } | null } };

export type VacateHostelRoomMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: VacateHostelRoomInput;
}>;


export type VacateHostelRoomMutation = { __typename?: 'Mutation', vacateHostelRoom: { __typename?: 'HostelAllocation', id: string, studentId: string, roomId: string, allocDate: string, vacateDate: string | null, status: string } };

export type CreateRoomClassMutationVariables = Exact<{
  input: CreateRoomClassInput;
}>;


export type CreateRoomClassMutation = { __typename?: 'Mutation', createRoomClass: { __typename?: 'RoomClass', id: string, name: string, description: string, rateType: string, rateAmount: number, semesterRate: number, annualRate: number, monthlyRate: number } };

export type UpdateRoomClassMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateRoomClassInput;
}>;


export type UpdateRoomClassMutation = { __typename?: 'Mutation', updateRoomClass: { __typename?: 'RoomClass', id: string, name: string, description: string, rateType: string, rateAmount: number, semesterRate: number, annualRate: number, monthlyRate: number } };

export type DeleteRoomClassMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteRoomClassMutation = { __typename?: 'Mutation', deleteRoomClass: boolean };

export type BulkDeleteHostelRoomsMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type BulkDeleteHostelRoomsMutation = { __typename?: 'Mutation', bulkDeleteHostelRooms: number };

export type BulkDeleteHostelAllocationsMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type BulkDeleteHostelAllocationsMutation = { __typename?: 'Mutation', bulkDeleteHostelAllocations: number };

export type BulkDeleteRoomClassesMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type BulkDeleteRoomClassesMutation = { __typename?: 'Mutation', bulkDeleteRoomClasses: number };

export type CreateDutyRosterMutationVariables = Exact<{
  input: CreateDutyRosterInput;
}>;


export type CreateDutyRosterMutation = { __typename?: 'Mutation', createDutyRoster: { __typename?: 'DutyRoster', id: string } };

export type UpdateDutyRosterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDutyRosterInput;
}>;


export type UpdateDutyRosterMutation = { __typename?: 'Mutation', updateDutyRoster: { __typename?: 'DutyRoster', id: string } };

export type DeleteDutyRosterMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDutyRosterMutation = { __typename?: 'Mutation', deleteDutyRoster: boolean };

export type BulkSetDutyRosterMutationVariables = Exact<{
  input: BulkSetDutyRosterInput;
}>;


export type BulkSetDutyRosterMutation = { __typename?: 'Mutation', bulkSetDutyRoster: { __typename?: 'BulkDutyRosterResult', created: number, failed: number, errors: Array<string> } };

export type CreateLearningGoalMutationVariables = Exact<{
  input: CreateLearningGoalInput;
}>;


export type CreateLearningGoalMutation = { __typename?: 'Mutation', createLearningGoal: { __typename?: 'LearningGoal', id: string, title: string, description: string | null, dueDate: string | null, isMandatory: boolean, createdAt: string } };

export type UpdateLearningGoalMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateLearningGoalInput;
}>;


export type UpdateLearningGoalMutation = { __typename?: 'Mutation', updateLearningGoal: { __typename?: 'LearningGoal', id: string, title: string, description: string | null, dueDate: string | null, isMandatory: boolean } };

export type DeleteLearningGoalMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLearningGoalMutation = { __typename?: 'Mutation', deleteLearningGoal: boolean };

export type CreateLearningSectionMutationVariables = Exact<{
  input: CreateLearningSectionInput;
}>;


export type CreateLearningSectionMutation = { __typename?: 'Mutation', createLearningSection: { __typename?: 'LearningSection', id: string, goalId: string, title: string, orderIndex: number } };

export type UpdateLearningSectionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateLearningSectionInput;
}>;


export type UpdateLearningSectionMutation = { __typename?: 'Mutation', updateLearningSection: { __typename?: 'LearningSection', id: string, title: string, orderIndex: number } };

export type DeleteLearningSectionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLearningSectionMutation = { __typename?: 'Mutation', deleteLearningSection: boolean };

export type CreateLearningUnitMutationVariables = Exact<{
  input: CreateLearningUnitInput;
}>;


export type CreateLearningUnitMutation = { __typename?: 'Mutation', createLearningUnit: { __typename?: 'LearningItem', id: string, sectionId: string, itemType: string, orderIndex: number, title: string, description: string | null, videoType: string | null, videoUrl: string | null, content: string | null } };

export type UpdateLearningUnitMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateLearningUnitInput;
}>;


export type UpdateLearningUnitMutation = { __typename?: 'Mutation', updateLearningUnit: { __typename?: 'LearningItem', id: string, title: string, description: string | null, orderIndex: number, videoType: string | null, videoUrl: string | null, content: string | null } };

export type DeleteLearningUnitMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLearningUnitMutation = { __typename?: 'Mutation', deleteLearningUnit: boolean };

export type UploadUnitVideoMutationVariables = Exact<{
  unitId: Scalars['ID']['input'];
  filename: Scalars['String']['input'];
  contentType: Scalars['String']['input'];
}>;


export type UploadUnitVideoMutation = { __typename?: 'Mutation', uploadUnitVideo: { __typename?: 'ModuleVideoUpload', unitId: string, uploadUrl: string, videoStoragePath: string } };

export type CreateLearningAssignmentMutationVariables = Exact<{
  input: CreateLearningAssignmentInput;
}>;


export type CreateLearningAssignmentMutation = { __typename?: 'Mutation', createLearningAssignment: { __typename?: 'LearningItem', id: string, sectionId: string, itemType: string, orderIndex: number, title: string, description: string | null, assessmentType: string | null, passScore: number | null } };

export type UpdateLearningAssignmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateLearningAssignmentInput;
}>;


export type UpdateLearningAssignmentMutation = { __typename?: 'Mutation', updateLearningAssignment: { __typename?: 'LearningItem', id: string, title: string, description: string | null, orderIndex: number, assessmentType: string | null, passScore: number | null } };

export type DeleteLearningAssignmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLearningAssignmentMutation = { __typename?: 'Mutation', deleteLearningAssignment: boolean };

export type AssignGoalToDepartmentMutationVariables = Exact<{
  goalId: Scalars['ID']['input'];
  departmentId: Scalars['ID']['input'];
}>;


export type AssignGoalToDepartmentMutation = { __typename?: 'Mutation', assignGoalToDepartment: { __typename?: 'GoalAssignmentItem', id: string, goalId: string, departmentId: string, createdAt: string } };

export type RemoveGoalAssignmentMutationVariables = Exact<{
  assignmentId: Scalars['ID']['input'];
}>;


export type RemoveGoalAssignmentMutation = { __typename?: 'Mutation', removeGoalAssignment: boolean };

export type UpdateItemProgressMutationVariables = Exact<{
  input: UpdateItemProgressInput;
}>;


export type UpdateItemProgressMutation = { __typename?: 'Mutation', updateItemProgress: { __typename?: 'ItemProgress', id: string, itemId: string, itemType: string, status: string, score: number | null, completedAt: string | null } };

export type CreateLearningQuestionMutationVariables = Exact<{
  input: CreateLearningQuestionInput;
}>;


export type CreateLearningQuestionMutation = { __typename?: 'Mutation', createLearningQuestion: { __typename?: 'LearningQuestion', id: string, assignmentID: string, kind: string, prompt: string, options: Array<string>, correctAnswers: Array<string>, points: number, orderIndex: number } };

export type UpdateLearningQuestionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateLearningQuestionInput;
}>;


export type UpdateLearningQuestionMutation = { __typename?: 'Mutation', updateLearningQuestion: { __typename?: 'LearningQuestion', id: string, kind: string, prompt: string, options: Array<string>, correctAnswers: Array<string>, points: number, orderIndex: number } };

export type DeleteLearningQuestionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLearningQuestionMutation = { __typename?: 'Mutation', deleteLearningQuestion: boolean };

export type SubmitQuizMutationVariables = Exact<{
  employeeGoalProgressId: Scalars['ID']['input'];
  assignmentId: Scalars['ID']['input'];
  answers: Array<QuizAnswerInput> | QuizAnswerInput;
}>;


export type SubmitQuizMutation = { __typename?: 'Mutation', submitQuiz: { __typename?: 'QuizSubmissionResult', score: number, maxScore: number, percentage: number, passed: boolean, progress: { __typename?: 'ItemProgress', id: string, itemId: string, itemType: string, status: string, score: number | null, completedAt: string | null } } };

export type ApplyLeaveMutationVariables = Exact<{
  input: ApplyLeaveInput;
}>;


export type ApplyLeaveMutation = { __typename?: 'Mutation', applyLeave: { __typename?: 'LeaveRecord', id: string, leaveTypeName: string, fromDate: string, toDate: string, reason: string, status: string } };

export type ReviewLeaveMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ReviewLeaveInput;
}>;


export type ReviewLeaveMutation = { __typename?: 'Mutation', reviewLeave: { __typename?: 'LeaveRecord', id: string, status: string, reviewNote: string | null, reviewedBy: string | null } };

export type CreateLeaveTypeMutationVariables = Exact<{
  input: CreateLeaveTypeInput;
}>;


export type CreateLeaveTypeMutation = { __typename?: 'Mutation', createLeaveType: { __typename?: 'LeaveTypeConfig', id: string, name: string, code: string, daysPerYear: number, carryForward: boolean, maxCarryForward: number, applicableTo: string, isActive: boolean } };

export type UpdateLeaveTypeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateLeaveTypeInput;
}>;


export type UpdateLeaveTypeMutation = { __typename?: 'Mutation', updateLeaveType: { __typename?: 'LeaveTypeConfig', id: string, name: string, code: string, daysPerYear: number, carryForward: boolean, maxCarryForward: number, applicableTo: string, isActive: boolean } };

export type DeleteLeaveTypeMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLeaveTypeMutation = { __typename?: 'Mutation', deleteLeaveType: boolean };

export type CreateLibraryBookMutationVariables = Exact<{
  input: CreateLibraryBookInput;
}>;


export type CreateLibraryBookMutation = { __typename?: 'Mutation', createLibraryBook: { __typename?: 'LibraryBook', id: string, title: string, author: string, isbn: string, publisher: string, category: string, rack: string, shelf: string, publish_year: number, total_copies: number, available_copies: number } };

export type UpdateLibraryBookMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateLibraryBookInput;
}>;


export type UpdateLibraryBookMutation = { __typename?: 'Mutation', updateLibraryBook: { __typename?: 'LibraryBook', id: string, title: string, author: string, isbn: string, publisher: string, category: string, rack: string, shelf: string, publish_year: number, total_copies: number, available_copies: number } };

export type DeleteLibraryBookMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLibraryBookMutation = { __typename?: 'Mutation', deleteLibraryBook: boolean };

export type IssueLibraryBookMutationVariables = Exact<{
  input: IssueLibraryBookInput;
}>;


export type IssueLibraryBookMutation = { __typename?: 'Mutation', issueLibraryBook: { __typename?: 'LibraryIssue', id: string, status: string, book_id: string, user_id: string, issue_date: string, due_date: string, return_date: string | null, fine_amount: number, book: { __typename?: 'LibraryBook', id: string, title: string, author: string } | null, user: { __typename?: 'User', id: string, name: string, email: string } | null } };

export type ReturnLibraryBookMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ReturnLibraryBookInput;
}>;


export type ReturnLibraryBookMutation = { __typename?: 'Mutation', returnLibraryBook: { __typename?: 'LibraryIssue', id: string, status: string, book_id: string, user_id: string, issue_date: string, due_date: string, return_date: string | null, fine_amount: number } };

export type CreateMarkMutationVariables = Exact<{
  input: CreateMarkInput;
}>;


export type CreateMarkMutation = { __typename?: 'Mutation', createMark: { __typename?: 'Mark', id: string, studentId: string, subject: string, examType: string, semester: number, marksObtained: number, maxMarks: number, grade: string | null, status: string | null } };

export type UpdateMarkMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateMarkInput;
}>;


export type UpdateMarkMutation = { __typename?: 'Mutation', updateMark: { __typename?: 'Mark', id: string, studentId: string, subject: string, examType: string, semester: number, marksObtained: number, maxMarks: number, grade: string | null, status: string | null } };

export type DeleteMarkMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMarkMutation = { __typename?: 'Mutation', deleteMark: boolean };

export type DeleteMarksMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type DeleteMarksMutation = { __typename?: 'Mutation', deleteMarks: number };

export type DeleteMarksByFilterMutationVariables = Exact<{
  studentId?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
  examType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type DeleteMarksByFilterMutation = { __typename?: 'Mutation', deleteMarksByFilter: number };

export type PublishResultsMutationVariables = Exact<{
  input: PublishResultsInput;
}>;


export type PublishResultsMutation = { __typename?: 'Mutation', publishResults: number };

export type MarkNotificationReadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type MarkNotificationReadMutation = { __typename?: 'Mutation', markNotificationRead: boolean };

export type MarkAllNotificationsReadMutationVariables = Exact<{ [key: string]: never; }>;


export type MarkAllNotificationsReadMutation = { __typename?: 'Mutation', markAllNotificationsRead: boolean };

export type DeleteNotificationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteNotificationMutation = { __typename?: 'Mutation', deleteNotification: boolean };

export type SendNotificationMutationVariables = Exact<{
  input: SendNotificationInput;
}>;


export type SendNotificationMutation = { __typename?: 'Mutation', sendNotification: { __typename?: 'NotificationItem', id: string, userId: string, title: string, type: string, category: string, isRead: boolean, createdAt: string } };

export type UpdateOpdSlipConfigMutationVariables = Exact<{
  content: Scalars['String']['input'];
}>;


export type UpdateOpdSlipConfigMutation = { __typename?: 'Mutation', updateOpdSlipConfig: string };

export type RecordVitalsMutationVariables = Exact<{
  input: RecordVitalsInput;
}>;


export type RecordVitalsMutation = { __typename?: 'Mutation', recordVitals: { __typename?: 'VitalsRecord', id: string } };

export type CreateMedicationOrderMutationVariables = Exact<{
  input: CreateMedicationOrderInput;
}>;


export type CreateMedicationOrderMutation = { __typename?: 'Mutation', createMedicationOrder: { __typename?: 'MedicationOrder', id: string } };

export type DiscontinueMedicationOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DiscontinueMedicationOrderMutation = { __typename?: 'Mutation', discontinueMedicationOrder: { __typename?: 'MedicationOrder', id: string, status: string } };

export type RecordMedicationAdministrationMutationVariables = Exact<{
  input: RecordAdministrationInput;
}>;


export type RecordMedicationAdministrationMutation = { __typename?: 'Mutation', recordMedicationAdministration: { __typename?: 'MedicationOrder', id: string } };

export type CreateInsurancePayerMutationVariables = Exact<{
  input: CreateInsurancePayerInput;
}>;


export type CreateInsurancePayerMutation = { __typename?: 'Mutation', createInsurancePayer: { __typename?: 'InsurancePayer', id: string } };

export type UpdateInsurancePayerMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateInsurancePayerInput;
}>;


export type UpdateInsurancePayerMutation = { __typename?: 'Mutation', updateInsurancePayer: { __typename?: 'InsurancePayer', id: string } };

export type DeleteInsurancePayerMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteInsurancePayerMutation = { __typename?: 'Mutation', deleteInsurancePayer: boolean };

export type CreateInsuranceClaimMutationVariables = Exact<{
  input: CreateInsuranceClaimInput;
}>;


export type CreateInsuranceClaimMutation = { __typename?: 'Mutation', createInsuranceClaim: { __typename?: 'InsuranceClaim', id: string } };

export type UpdateInsuranceClaimMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateInsuranceClaimInput;
}>;


export type UpdateInsuranceClaimMutation = { __typename?: 'Mutation', updateInsuranceClaim: { __typename?: 'InsuranceClaim', id: string } };

export type DeleteInsuranceClaimMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteInsuranceClaimMutation = { __typename?: 'Mutation', deleteInsuranceClaim: boolean };

export type SettleInsuranceClaimMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  approvedAmount?: InputMaybe<Scalars['Float']['input']>;
}>;


export type SettleInsuranceClaimMutation = { __typename?: 'Mutation', settleInsuranceClaim: { __typename?: 'InsuranceClaim', id: string, status: string } };

export type CreateInventoryItemMutationVariables = Exact<{
  input: CreateInventoryItemInput;
}>;


export type CreateInventoryItemMutation = { __typename?: 'Mutation', createInventoryItem: { __typename?: 'InventoryItem', id: string } };

export type UpdateInventoryItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateInventoryItemInput;
}>;


export type UpdateInventoryItemMutation = { __typename?: 'Mutation', updateInventoryItem: { __typename?: 'InventoryItem', id: string } };

export type DeleteInventoryItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteInventoryItemMutation = { __typename?: 'Mutation', deleteInventoryItem: boolean };

export type ReceiveStockMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  qty: Scalars['Float']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type ReceiveStockMutation = { __typename?: 'Mutation', receiveStock: { __typename?: 'InventoryItem', id: string, stockQty: number } };

export type AdjustInventoryStockMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  delta: Scalars['Float']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
}>;


export type AdjustInventoryStockMutation = { __typename?: 'Mutation', adjustInventoryStock: { __typename?: 'InventoryItem', id: string, stockQty: number } };

export type IssueToPharmacyMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  qty: Scalars['Float']['input'];
}>;


export type IssueToPharmacyMutation = { __typename?: 'Mutation', issueToPharmacy: { __typename?: 'InventoryItem', id: string, stockQty: number } };

export type CreateOperationTheatreMutationVariables = Exact<{
  input: CreateOperationTheatreInput;
}>;


export type CreateOperationTheatreMutation = { __typename?: 'Mutation', createOperationTheatre: { __typename?: 'OperationTheatre', id: string } };

export type UpdateOperationTheatreMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateOperationTheatreInput;
}>;


export type UpdateOperationTheatreMutation = { __typename?: 'Mutation', updateOperationTheatre: { __typename?: 'OperationTheatre', id: string } };

export type DeleteOperationTheatreMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteOperationTheatreMutation = { __typename?: 'Mutation', deleteOperationTheatre: boolean };

export type ScheduleSurgeryMutationVariables = Exact<{
  input: ScheduleSurgeryInput;
}>;


export type ScheduleSurgeryMutation = { __typename?: 'Mutation', scheduleSurgery: { __typename?: 'SurgerySchedule', id: string } };

export type SetSurgeryStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
}>;


export type SetSurgeryStatusMutation = { __typename?: 'Mutation', setSurgeryStatus: { __typename?: 'SurgerySchedule', id: string, status: string } };

export type CancelSurgeryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelSurgeryMutation = { __typename?: 'Mutation', cancelSurgery: { __typename?: 'SurgerySchedule', id: string, status: string } };

export type CreateTriageCaseMutationVariables = Exact<{
  input: CreateTriageCaseInput;
}>;


export type CreateTriageCaseMutation = { __typename?: 'Mutation', createTriageCase: { __typename?: 'TriageCase', id: string } };

export type UpdateTriageCaseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateTriageCaseInput;
}>;


export type UpdateTriageCaseMutation = { __typename?: 'Mutation', updateTriageCase: { __typename?: 'TriageCase', id: string } };

export type UpdateOrgProfileMutationVariables = Exact<{
  input: UpdateOrgProfileInput;
}>;


export type UpdateOrgProfileMutation = { __typename?: 'Mutation', updateOrgProfile: { __typename?: 'OrgProfile', id: string, name: string, logoUrl: string, tagline: string, primaryColor: string, accentColor: string, accreditation: string } };

export type UpdateOrgIdentityMutationVariables = Exact<{
  input: UpdateOrgProfileInput;
}>;


export type UpdateOrgIdentityMutation = { __typename?: 'Mutation', updateOrgProfile: { __typename?: 'OrgProfile', id: string, staffEmailRequired: boolean, studentEmailRequired: boolean } };

export type UpdateDepartmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateDepartmentInput;
}>;


export type UpdateDepartmentMutation = { __typename?: 'Mutation', updateDepartment: { __typename?: 'Department', id: string, name: string } };

export type DeleteDepartmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDepartmentMutation = { __typename?: 'Mutation', deleteDepartment: boolean };

export type CreateAcademicYearMutationVariables = Exact<{
  input: CreateAcademicYearInput;
}>;


export type CreateAcademicYearMutation = { __typename?: 'Mutation', createAcademicYear: { __typename?: 'AcademicYear', id: string, name: string, startDate: string, endDate: string, isCurrent: boolean } };

export type UpdateAcademicYearMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateAcademicYearInput;
}>;


export type UpdateAcademicYearMutation = { __typename?: 'Mutation', updateAcademicYear: { __typename?: 'AcademicYear', id: string, name: string, startDate: string, endDate: string, isCurrent: boolean } };

export type SetCurrentAcademicYearMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SetCurrentAcademicYearMutation = { __typename?: 'Mutation', setCurrentAcademicYear: { __typename?: 'AcademicYear', id: string, name: string, startDate: string, endDate: string, isCurrent: boolean } };

export type CreateSemesterMutationVariables = Exact<{
  input: CreateSemesterInput;
}>;


export type CreateSemesterMutation = { __typename?: 'Mutation', createSemester: { __typename?: 'Semester', id: string, academicYearId: string, number: number, name: string, startDate: string, endDate: string } };

export type CreateCustomRoleMutationVariables = Exact<{
  input: CreateCustomRoleInput;
}>;


export type CreateCustomRoleMutation = { __typename?: 'Mutation', createCustomRole: { __typename?: 'CustomRole', id: string, name: string, permissions: string } };

export type UpdateCustomRoleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateCustomRoleInput;
}>;


export type UpdateCustomRoleMutation = { __typename?: 'Mutation', updateCustomRole: { __typename?: 'CustomRole', id: string, name: string, permissions: string } };

export type DeleteCustomRoleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCustomRoleMutation = { __typename?: 'Mutation', deleteCustomRole: boolean };

export type AssignUserCustomRoleMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  customRoleId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type AssignUserCustomRoleMutation = { __typename?: 'Mutation', assignUserCustomRole: boolean };

export type AssignUserManagerMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  managerId?: InputMaybe<Scalars['ID']['input']>;
  departmentId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type AssignUserManagerMutation = { __typename?: 'Mutation', assignUserManager: boolean };

export type CreateSalaryStructureMutationVariables = Exact<{
  input: CreateSalaryStructureInput;
}>;


export type CreateSalaryStructureMutation = { __typename?: 'Mutation', createSalaryStructure: { __typename?: 'SalaryStructure', id: string, employeeId: string, basicSalary: number, hra: number, da: number, ta: number, medicalAllowance: number, otherAllowances: number, pf: number, esi: number, tds: number, otherDeductions: number, effectiveFrom: string, isActive: boolean, notes: string | null, employee: { __typename?: 'Employee', id: string, employeeId: string, user: { __typename?: 'User', id: string, name: string } } | null } };

export type UpdateSalaryStructureMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateSalaryStructureInput;
}>;


export type UpdateSalaryStructureMutation = { __typename?: 'Mutation', updateSalaryStructure: { __typename?: 'SalaryStructure', id: string, employeeId: string, basicSalary: number, hra: number, da: number, ta: number, medicalAllowance: number, otherAllowances: number, pf: number, esi: number, tds: number, otherDeductions: number, effectiveFrom: string, isActive: boolean, notes: string | null } };

export type DeleteSalaryStructureMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSalaryStructureMutation = { __typename?: 'Mutation', deleteSalaryStructure: boolean };

export type GeneratePayrollMutationVariables = Exact<{
  input: GeneratePayrollInput;
}>;


export type GeneratePayrollMutation = { __typename?: 'Mutation', generatePayroll: { __typename?: 'Payroll', id: string, employeeId: string, month: number, year: number, basicSalary: number, hra: number, da: number, ta: number, medicalAllowance: number, otherAllowances: number, grossSalary: number, pf: number, esi: number, tds: number, otherDeductions: number, totalDeductions: number, netSalary: number, workingDays: number, presentDays: number, leaveDays: number, status: string, paymentDate: string | null, paymentMode: string | null, notes: string | null, processedBy: string | null, employee: { __typename?: 'Employee', id: string, employeeId: string, user: { __typename?: 'User', id: string, name: string, email: string }, department: { __typename?: 'Department', id: string, name: string } | null } | null } };

export type UpdatePayrollStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdatePayrollStatusInput;
}>;


export type UpdatePayrollStatusMutation = { __typename?: 'Mutation', updatePayrollStatus: { __typename?: 'Payroll', id: string, status: string, paymentDate: string | null, paymentMode: string | null } };

export type DeletePayrollMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePayrollMutation = { __typename?: 'Mutation', deletePayroll: boolean };

export type CreateVendorMutationVariables = Exact<{
  input: CreateVendorInput;
}>;


export type CreateVendorMutation = { __typename?: 'Mutation', createVendor: { __typename?: 'Vendor', id: string, name: string, active: boolean } };

export type UpdateVendorMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateVendorInput;
}>;


export type UpdateVendorMutation = { __typename?: 'Mutation', updateVendor: { __typename?: 'Vendor', id: string, name: string, active: boolean } };

export type DeleteVendorMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteVendorMutation = { __typename?: 'Mutation', deleteVendor: boolean };

export type CreatePurchaseOrderMutationVariables = Exact<{
  input: CreatePurchaseOrderInput;
}>;


export type CreatePurchaseOrderMutation = { __typename?: 'Mutation', createPurchaseOrder: { __typename?: 'PurchaseOrder', id: string, poNumber: string, status: string } };

export type UpdatePurchaseOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdatePurchaseOrderInput;
}>;


export type UpdatePurchaseOrderMutation = { __typename?: 'Mutation', updatePurchaseOrder: { __typename?: 'PurchaseOrder', id: string, poNumber: string, status: string } };

export type SetPurchaseOrderStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  status: Scalars['String']['input'];
}>;


export type SetPurchaseOrderStatusMutation = { __typename?: 'Mutation', setPurchaseOrderStatus: { __typename?: 'PurchaseOrder', id: string, status: string } };

export type DeletePurchaseOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePurchaseOrderMutation = { __typename?: 'Mutation', deletePurchaseOrder: boolean };

export type ReceivePurchaseOrderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: ReceivePurchaseOrderInput;
}>;


export type ReceivePurchaseOrderMutation = { __typename?: 'Mutation', receivePurchaseOrder: { __typename?: 'PurchaseOrder', id: string, status: string } };

export type CreatePurchaseInvoiceMutationVariables = Exact<{
  input: CreatePurchaseInvoiceInput;
}>;


export type CreatePurchaseInvoiceMutation = { __typename?: 'Mutation', createPurchaseInvoice: { __typename?: 'PurchaseInvoice', id: string, invoiceNumber: string, status: string } };

export type RecordPurchasePaymentMutationVariables = Exact<{
  input: RecordPurchasePaymentInput;
}>;


export type RecordPurchasePaymentMutation = { __typename?: 'Mutation', recordPurchasePayment: { __typename?: 'PurchaseInvoice', id: string, status: string, paidAmount: number } };

export type DeletePurchaseInvoiceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePurchaseInvoiceMutation = { __typename?: 'Mutation', deletePurchaseInvoice: boolean };

export type CreateSalaryTemplateMutationVariables = Exact<{
  input: CreateSalaryTemplateInput;
}>;


export type CreateSalaryTemplateMutation = { __typename?: 'Mutation', createSalaryTemplate: { __typename?: 'SalaryTemplate', id: string, name: string, description: string, basicSalary: number, hra: number, da: number, ta: number, medicalAllowance: number, otherAllowances: number, pf: number, esi: number, tds: number, otherDeductions: number, isActive: boolean } };

export type UpdateSalaryTemplateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateSalaryTemplateInput;
}>;


export type UpdateSalaryTemplateMutation = { __typename?: 'Mutation', updateSalaryTemplate: { __typename?: 'SalaryTemplate', id: string, name: string, description: string, basicSalary: number, hra: number, da: number, ta: number, medicalAllowance: number, otherAllowances: number, pf: number, esi: number, tds: number, otherDeductions: number, isActive: boolean } };

export type DeleteSalaryTemplateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSalaryTemplateMutation = { __typename?: 'Mutation', deleteSalaryTemplate: boolean };

export type AssignSalaryTemplateMutationVariables = Exact<{
  input: AssignSalaryTemplateInput;
}>;


export type AssignSalaryTemplateMutation = { __typename?: 'Mutation', assignSalaryTemplate: boolean };

export type BulkAssignSalaryTemplateMutationVariables = Exact<{
  input: BulkAssignSalaryTemplateInput;
}>;


export type BulkAssignSalaryTemplateMutation = { __typename?: 'Mutation', bulkAssignSalaryTemplate: { __typename?: 'BulkAssignResult', assignedCount: number } };

export type UpdateSalaryAssignmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateSalaryAssignmentInput;
}>;


export type UpdateSalaryAssignmentMutation = { __typename?: 'Mutation', updateSalaryAssignment: { __typename?: 'SalaryAssignment', id: string, employeeId: string, templateId: string, extraAllowance: number, extraDeduction: number, effectiveFrom: string, effectiveTo: string | null, isActive: boolean, notes: string } };

export type DeleteSalaryAssignmentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSalaryAssignmentMutation = { __typename?: 'Mutation', deleteSalaryAssignment: boolean };

export type RevokeMySessionMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type RevokeMySessionMutation = { __typename?: 'Mutation', revokeMySession: boolean };

export type RevokeMyOtherSessionsMutationVariables = Exact<{ [key: string]: never; }>;


export type RevokeMyOtherSessionsMutation = { __typename?: 'Mutation', revokeMyOtherSessions: number };

export type RevokeUserSessionsMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type RevokeUserSessionsMutation = { __typename?: 'Mutation', revokeUserSessions: number };

export type CreateStudentMutationVariables = Exact<{
  input: CreateStudentInput;
}>;


export type CreateStudentMutation = { __typename?: 'Mutation', createStudent: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string, email: string } | null, course: { __typename?: 'Course', id: string, name: string, code: string } | null } };

export type UpdateStudentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateStudentInput;
}>;


export type UpdateStudentMutation = { __typename?: 'Mutation', updateStudent: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string, email: string } | null, course: { __typename?: 'Course', id: string, name: string, code: string } | null } };

export type DeleteStudentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteStudentMutation = { __typename?: 'Mutation', deleteStudent: boolean };

export type DeleteAllStudentsMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAllStudentsMutation = { __typename?: 'Mutation', deleteAllStudents: number };

export type CreateTimetableSlotMutationVariables = Exact<{
  input: CreateTimetableSlotInput;
}>;


export type CreateTimetableSlotMutation = { __typename?: 'Mutation', createTimetableSlot: { __typename?: 'TimetableSlot', id: string, courseId: string, subjectId: string, dayOfWeek: string, periodNumber: number, startTime: string, endTime: string, semester: number, section: string | null, room: string | null, course: { __typename?: 'Course', id: string, name: string } | null, subject: { __typename?: 'Subject', id: string, name: string } | null } };

export type UpdateTimetableSlotMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateTimetableSlotInput;
}>;


export type UpdateTimetableSlotMutation = { __typename?: 'Mutation', updateTimetableSlot: { __typename?: 'TimetableSlot', id: string, subjectId: string, employeeId: string | null, dayOfWeek: string, periodNumber: number, startTime: string, endTime: string, semester: number, section: string | null, room: string | null, course: { __typename?: 'Course', id: string, name: string } | null, subject: { __typename?: 'Subject', id: string, name: string } | null } };

export type DeleteTimetableSlotMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTimetableSlotMutation = { __typename?: 'Mutation', deleteTimetableSlot: boolean };

export type BulkCreateTimetableSlotsMutationVariables = Exact<{
  input: BulkCreateTimetableSlotsInput;
}>;


export type BulkCreateTimetableSlotsMutation = { __typename?: 'Mutation', bulkCreateTimetableSlots: Array<{ __typename?: 'TimetableSlot', id: string, courseId: string, subjectId: string, dayOfWeek: string, periodNumber: number, startTime: string, endTime: string, semester: number, section: string | null, room: string | null }> };

export type CreateTransportRouteMutationVariables = Exact<{
  input: CreateTransportRouteInput;
}>;


export type CreateTransportRouteMutation = { __typename?: 'Mutation', createTransportRoute: { __typename?: 'TransportRoute', id: string, stops: string, distance: number, route_name: string, start_point: string, end_point: string } };

export type UpdateTransportRouteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateTransportRouteInput;
}>;


export type UpdateTransportRouteMutation = { __typename?: 'Mutation', updateTransportRoute: { __typename?: 'TransportRoute', id: string, stops: string, distance: number, route_name: string, start_point: string, end_point: string } };

export type DeleteTransportRouteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTransportRouteMutation = { __typename?: 'Mutation', deleteTransportRoute: boolean };

export type CreateTransportVehicleMutationVariables = Exact<{
  input: CreateTransportVehicleInput;
}>;


export type CreateTransportVehicleMutation = { __typename?: 'Mutation', createTransportVehicle: { __typename?: 'TransportVehicle', id: string, capacity: number, status: string, vehicle_number: string, vehicle_type: string, driver_name: string, driver_phone: string, route_id: string, route: { __typename?: 'TransportRoute', id: string, route_name: string } | null } };

export type UpdateTransportVehicleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateTransportVehicleInput;
}>;


export type UpdateTransportVehicleMutation = { __typename?: 'Mutation', updateTransportVehicle: { __typename?: 'TransportVehicle', id: string, capacity: number, status: string, vehicle_number: string, vehicle_type: string, driver_name: string, driver_phone: string, route_id: string, route: { __typename?: 'TransportRoute', id: string, route_name: string } | null } };

export type DeleteTransportVehicleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTransportVehicleMutation = { __typename?: 'Mutation', deleteTransportVehicle: boolean };

export type AllocateTransportVehicleMutationVariables = Exact<{
  input: AllocateTransportInput;
}>;


export type AllocateTransportVehicleMutation = { __typename?: 'Mutation', allocateTransportVehicle: { __typename?: 'TransportAllocation', id: string, status: string, alloc_type: string, student_id: string, employee_id: string, vehicle_id: string, pickup_stop: string, start_date: string, end_date: string | null, student: { __typename?: 'Student', id: string, user: { __typename?: 'User', id: string, name: string } | null } | null, employee: { __typename?: 'Employee', id: string, user: { __typename?: 'User', id: string, name: string } } | null, vehicle: { __typename?: 'TransportVehicle', id: string, vehicle_number: string, vehicle_type: string, driver_name: string, route: { __typename?: 'TransportRoute', id: string, route_name: string } | null } | null } };

export type RemoveTransportAllocationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: RemoveTransportAllocationInput;
}>;


export type RemoveTransportAllocationMutation = { __typename?: 'Mutation', removeTransportAllocation: { __typename?: 'TransportAllocation', id: string, status: string, student_id: string, vehicle_id: string, end_date: string | null } };

export type BulkDeleteTransportRoutesMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type BulkDeleteTransportRoutesMutation = { __typename?: 'Mutation', bulkDeleteTransportRoutes: number };

export type BulkDeleteTransportVehiclesMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type BulkDeleteTransportVehiclesMutation = { __typename?: 'Mutation', bulkDeleteTransportVehicles: number };

export type BulkDeleteTransportAllocationsMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type BulkDeleteTransportAllocationsMutation = { __typename?: 'Mutation', bulkDeleteTransportAllocations: number };

export type SetUserWorkspaceRolesMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  roles: Array<WorkspaceRoleInput> | WorkspaceRoleInput;
}>;


export type SetUserWorkspaceRolesMutation = { __typename?: 'Mutation', setUserWorkspaceRoles: Array<{ __typename?: 'Workspace', role: string, label: string, isPrimary: boolean, customRoleId: string | null }> };

export type ListCoursesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListCoursesQuery = { __typename?: 'Query', courses: Array<{ __typename?: 'Course', id: string, name: string, code: string, description: string | null, durationYears: number | null, totalSemesters: number | null, departmentId: string | null, department: { __typename?: 'Department', id: string, name: string } | null }> };

export type CourseBatchesQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type CourseBatchesQuery = { __typename?: 'Query', courseBatches: Array<{ __typename?: 'CourseBatch', id: string, name: string, startYear: number, endYear: number }> };

export type ListSubjectsQueryVariables = Exact<{
  departmentId?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListSubjectsQuery = { __typename?: 'Query', subjects: Array<{ __typename?: 'Subject', id: string, name: string, code: string, credits: number | null, teachingHours: number | null, labHours: number | null, semesterNumber: number | null, description: string | null, syllabusUrl: string | null, departmentId: string | null, courseOutcomes: Array<string>, department: { __typename?: 'Department', id: string, name: string } | null, units: Array<{ __typename?: 'SubjectUnit', title: string, content: string, labActivities: string | null, fieldVisits: string | null, others: string | null }> }> };

export type CurriculumQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type CurriculumQuery = { __typename?: 'Query', curriculum: Array<{ __typename?: 'CurriculumSubject', id: string, courseId: string, semesterNumber: number, sortOrder: number | null, subject: { __typename?: 'Subject', id: string, name: string, code: string, credits: number | null, semesterNumber: number | null, departmentId: string | null, courseOutcomes: Array<string>, units: Array<{ __typename?: 'SubjectUnit', title: string, content: string, labActivities: string | null, fieldVisits: string | null, others: string | null }> } }> };

export type ListAcademicYearsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListAcademicYearsQuery = { __typename?: 'Query', academicYears: Array<{ __typename?: 'AcademicYear', id: string, name: string, startDate: string, endDate: string, isCurrent: boolean }> };

export type ListExamSchedulesQueryVariables = Exact<{
  semesterNumber?: InputMaybe<Scalars['Int']['input']>;
  examType?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListExamSchedulesQuery = { __typename?: 'Query', examSchedules: Array<{ __typename?: 'ExamSchedule', id: string, name: string, examType: string, semesterNumber: number | null, startDate: string | null, endDate: string | null, published: boolean, instructions: string | null, academicYearId: string | null }> };

export type ListExamTypesQueryVariables = Exact<{
  departmentId?: InputMaybe<Scalars['String']['input']>;
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListExamTypesQuery = { __typename?: 'Query', examTypes: Array<{ __typename?: 'ExamType', id: string, name: string, departmentId: string | null, maxMarks: number, weightage: number | null, active: boolean, createdAt: string | null, department: { __typename?: 'Department', id: string, name: string } | null }> };

export type ListAnnouncementsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListAnnouncementsQuery = { __typename?: 'Query', announcements: Array<{ __typename?: 'AnnouncementItem', id: string, title: string, body: string, authorId: string, targetRoles: string, priority: string, isPublished: boolean, expiresAt: string | null, author: { __typename?: 'User', id: string, name: string } | null }> };

export type ListAllAnnouncementsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListAllAnnouncementsQuery = { __typename?: 'Query', allAnnouncements: Array<{ __typename?: 'AnnouncementItem', id: string, title: string, body: string, authorId: string, targetRoles: string, priority: string, isPublished: boolean, expiresAt: string | null, author: { __typename?: 'User', id: string, name: string } | null }> };

export type ListAttendanceQueryVariables = Exact<{
  entityId?: InputMaybe<Scalars['String']['input']>;
  entityType?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListAttendanceQuery = { __typename?: 'Query', attendance: Array<{ __typename?: 'AttendanceRecord', id: string, entityId: string, entityType: string, date: string, status: string, markedBy: string | null, remarks: string | null, subjectId: string | null }> };

export type AttendanceSummaryQueryVariables = Exact<{
  entityType?: InputMaybe<Scalars['String']['input']>;
}>;


export type AttendanceSummaryQuery = { __typename?: 'Query', attendanceSummary: Array<{ __typename?: 'AttendanceSummaryRow', entityId: string, total: number, present: number, absent: number, late: number, attendancePct: number }> };

export type GetAttendanceSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAttendanceSettingsQuery = { __typename?: 'Query', attendanceSettings: { __typename?: 'AttendanceSettings', id: string, minAttendancePct: number, gracePeriodMinutes: number, lockAfterHours: number } };

export type AttendanceShortageQueryVariables = Exact<{ [key: string]: never; }>;


export type AttendanceShortageQuery = { __typename?: 'Query', attendanceShortage: { __typename?: 'ShortageList', threshold: number, count: number, students: Array<{ __typename?: 'ShortageStudent', total: number, present: number, attendancePct: number, student: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string } | null, course: { __typename?: 'Course', id: string, name: string } | null } }> } };

export type BrochureContentQueryVariables = Exact<{ [key: string]: never; }>;


export type BrochureContentQuery = { __typename?: 'Query', brochureContent: string | null };

export type GetCalendarSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCalendarSettingsQuery = { __typename?: 'Query', calendarSettings: { __typename?: 'CalendarSettings', id: string, sundayOff: boolean, saturdayRule: string, saturdayWeeks: string, defaultWorking: number } };

export type GetCalendarMonthQueryVariables = Exact<{
  year: Scalars['Int']['input'];
  month: Scalars['Int']['input'];
}>;


export type GetCalendarMonthQuery = { __typename?: 'Query', calendarMonth: { __typename?: 'CalendarMonth', year: number, month: number, working: number, totalDays: number, days: Array<{ __typename?: 'CalendarDay', date: string, weekday: number, type: string, name: string, autoGen: boolean }> } };

export type ListStudentAssignmentsQueryVariables = Exact<{
  courseId?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
  section?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListStudentAssignmentsQuery = { __typename?: 'Query', studentAssignments: Array<{ __typename?: 'StudentAssignment', id: string, title: string, description: string | null, courseId: string | null, courseName: string | null, semester: number | null, section: string | null, subjectId: string | null, subjectName: string | null, teacherId: string, teacherName: string, maxMarks: number, dueDate: string | null, attachmentUrl: string | null, status: string, submissionCount: number, gradedCount: number, createdAt: string | null }> };

export type ListAssignmentSubmissionsQueryVariables = Exact<{
  assignmentId: Scalars['ID']['input'];
}>;


export type ListAssignmentSubmissionsQuery = { __typename?: 'Query', assignmentSubmissions: Array<{ __typename?: 'AssignmentSubmission', id: string, assignmentId: string, assignmentTitle: string | null, maxMarks: number, studentId: string, studentName: string, rollNumber: string | null, submittedAt: string | null, text: string | null, attachmentUrl: string | null, status: string, marksAwarded: number | null, feedback: string | null, gradedByName: string | null }> };

export type ListMyAssignmentsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListMyAssignmentsQuery = { __typename?: 'Query', myAssignments: Array<{ __typename?: 'MyAssignment', canSubmit: boolean, late: boolean, assignment: { __typename?: 'StudentAssignment', id: string, title: string, description: string | null, subjectName: string | null, teacherName: string, maxMarks: number, dueDate: string | null, attachmentUrl: string | null, status: string }, submission: { __typename?: 'AssignmentSubmission', id: string, submittedAt: string | null, text: string | null, attachmentUrl: string | null, status: string, marksAwarded: number | null, feedback: string | null } | null }> };

export type ListMessMenuQueryVariables = Exact<{
  hostelBlockId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListMessMenuQuery = { __typename?: 'Query', messMenu: Array<{ __typename?: 'MessMenu', id: string, dayOfWeek: number, meal: string, items: string | null, hostelBlockId: string | null, hostelBlockName: string | null }> };

export type ListMyMessMenuQueryVariables = Exact<{ [key: string]: never; }>;


export type ListMyMessMenuQuery = { __typename?: 'Query', myMessMenu: Array<{ __typename?: 'MessMenu', id: string, dayOfWeek: number, meal: string, items: string | null, hostelBlockName: string | null }> };

export type ListMessAttendanceQueryVariables = Exact<{
  date: Scalars['String']['input'];
  meal: Scalars['String']['input'];
  hostelBlockId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListMessAttendanceQuery = { __typename?: 'Query', messAttendance: Array<{ __typename?: 'MessAttendanceRow', id: string | null, studentId: string, studentName: string, rollNumber: string | null, date: string, meal: string, present: boolean }> };

export type ListMessExpensesQueryVariables = Exact<{
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListMessExpensesQuery = { __typename?: 'Query', messExpenses: Array<{ __typename?: 'MessExpense', id: string, date: string, category: string, description: string | null, amount: number, vendorId: string | null, vendorName: string | null, purchaseOrderId: string | null, poNumber: string | null }> };

export type MessExpenseSummaryQueryVariables = Exact<{
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
}>;


export type MessExpenseSummaryQuery = { __typename?: 'Query', messExpenseSummary: { __typename?: 'MessExpenseSummary', total: number, byCategory: Array<{ __typename?: 'MessCategoryTotal', category: string, total: number }> } };

export type ListLiveVehiclesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListLiveVehiclesQuery = { __typename?: 'Query', liveVehicles: Array<{ __typename?: 'LiveVehicle', id: string, vehicleNumber: string, vehicleType: string, capacity: number, status: string, routeId: string | null, routeName: string | null, latitude: number, longitude: number, lastPingAt: string | null, driverEmployeeId: string | null, driverName: string | null, driverPhone: string | null }> };

export type ListDriverAttendanceQueryVariables = Exact<{
  date?: InputMaybe<Scalars['String']['input']>;
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  employeeId?: InputMaybe<Scalars['String']['input']>;
  vehicleId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListDriverAttendanceQuery = { __typename?: 'Query', driverAttendance: Array<{ __typename?: 'DriverAttendance', id: string, employeeId: string, employeeName: string, vehicleId: string | null, vehicleNumber: string | null, date: string, checkInAt: string | null, checkOutAt: string | null, status: string }> };

export type ListLabTestsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListLabTestsQuery = { __typename?: 'Query', labTests: Array<{ __typename?: 'LabTest', id: string, code: string, name: string, category: string | null, panel: string | null, method: string | null, sampleType: string, unit: string | null, refLow: number, refHigh: number, refText: string | null, price: number, active: boolean }> };

export type ListLabOrdersQueryVariables = Exact<{
  patientId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListLabOrdersQuery = { __typename?: 'Query', labOrders: Array<{ __typename?: 'LabOrder', id: string, patientId: string, patientName: string, patientMrn: string, encounterId: string | null, orderedById: string | null, orderedByName: string | null, orderDate: string, status: string, notes: string | null, totalPrice: number, items: Array<{ __typename?: 'LabOrderItem', id: string, testId: string, testCode: string, testName: string, unit: string | null, refLow: number, refHigh: number, refText: string | null, price: number, resultValue: string | null, flag: string | null, resultedAt: string | null }> }> };

export type ListRadiologyStudiesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListRadiologyStudiesQuery = { __typename?: 'Query', radiologyStudies: Array<{ __typename?: 'RadiologyStudy', id: string, code: string, name: string, modality: string, bodyPart: string | null, price: number, active: boolean }> };

export type ListRadiologyOrdersQueryVariables = Exact<{
  patientId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListRadiologyOrdersQuery = { __typename?: 'Query', radiologyOrders: Array<{ __typename?: 'RadiologyOrder', id: string, patientId: string, patientName: string, patientMrn: string, orderedByName: string | null, studyId: string, studyCode: string, studyName: string, modality: string, bodyPart: string | null, price: number, orderDate: string, status: string, notes: string | null, findings: string | null, impression: string | null, reportedByName: string | null, reportedAt: string | null }> };

export type ListWardsQueryVariables = Exact<{
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListWardsQuery = { __typename?: 'Query', wards: Array<{ __typename?: 'Ward', id: string, code: string, name: string, wardType: string, gender: string, floor: string | null, active: boolean, bedCount: number, occupiedCount: number, beds: Array<{ __typename?: 'Bed', id: string, wardId: string, bedNumber: string, bay: string | null, status: string, dailyCharge: number, patientId: string | null, patientName: string | null, admissionId: string | null }> }> };

export type ListAdmissionsQueryVariables = Exact<{
  patientId?: InputMaybe<Scalars['String']['input']>;
  wardId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListAdmissionsQuery = { __typename?: 'Query', admissions: Array<{ __typename?: 'Admission', id: string, patientId: string, patientName: string, patientMrn: string, encounterId: string | null, clinicianId: string | null, clinicianName: string | null, wardId: string | null, wardName: string | null, bedId: string | null, bedNumber: string | null, admissionDate: string, reason: string | null, status: string, dischargeDate: string | null, dischargeDiagnosis: string | null, treatmentGiven: string | null, conditionOnDischarge: string | null, followUpInstructions: string | null, transfers: Array<{ __typename?: 'BedTransfer', id: string, fromBedNumber: string | null, toBedNumber: string | null, fromWardName: string | null, toWardName: string | null, transferDate: string | null, reason: string | null }> }> };

export type EmailSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type EmailSettingsQuery = { __typename?: 'Query', emailSettings: { __typename?: 'EmailSettings', enabled: boolean, fromName: string, fromEmail: string, smtpHost: string, smtpPort: number, smtpUsername: string, useTls: boolean, hasPassword: boolean } };

export type EmailSendStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type EmailSendStatusQuery = { __typename?: 'Query', emailSendStatus: { __typename?: 'EmailSendStatus', allowed: boolean, enabled: boolean, transportConfigured: boolean, canSend: boolean } };

export type ListEmployeesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListEmployeesQuery = { __typename?: 'Query', employees: Array<{ __typename?: 'Employee', id: string, employeeId: string, designation: string | null, phone: string | null, joinDate: string | null, gender: string | null, bloodGroup: string | null, dateOfBirth: string | null, photoUrl: string | null, emergencyName: string | null, emergencyPhone: string | null, employmentType: string | null, user: { __typename?: 'User', id: string, name: string, email: string, role: string }, department: { __typename?: 'Department', id: string, name: string } | null, paymentDetails: { __typename?: 'EmployeePaymentDetails', bankName: string | null, accountNumber: string | null, accountType: string | null, ifscCode: string | null, branchName: string | null, pfNumber: string | null, uanNumber: string | null, pfEmployeePercent: number | null, pfEmployerPercent: number | null, esiNumber: string | null, esiDispensary: string | null, panNumber: string | null, taxRegime: string | null, form16Ref: string | null, npsAccountNumber: string | null, npsTier: string | null, gratuityEligible: boolean | null } | null }> };

export type ListDepartmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListDepartmentsQuery = { __typename?: 'Query', departments: Array<{ __typename?: 'Department', id: string, name: string }> };

export type ListUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type ListUsersQuery = { __typename?: 'Query', users: Array<{ __typename?: 'User', id: string, name: string, email: string, role: string, isActive: boolean }> };

export type ListEventsQueryVariables = Exact<{
  category?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListEventsQuery = { __typename?: 'Query', events: Array<{ __typename?: 'EventItem', id: string, title: string, description: string | null, eventDate: string, endDate: string, location: string | null, category: string, color: string | null, isPublic: boolean, createdBy: string | null }> };

export type ListEventCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListEventCategoriesQuery = { __typename?: 'Query', eventCategories: Array<{ __typename?: 'EventCategory', id: string, name: string, slug: string, color: string | null, description: string | null }> };

export type QuestionBankQueryVariables = Exact<{
  curriculumSubjectId: Scalars['ID']['input'];
  unit?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['String']['input']>;
  questionType?: InputMaybe<Scalars['String']['input']>;
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type QuestionBankQuery = { __typename?: 'Query', questionBank: Array<{ __typename?: 'QuestionBankItem', id: string, curriculumSubjectId: string, subjectId: string | null, unit: string | null, questionText: string, questionType: string, difficulty: string, marks: number, options: Array<string>, answer: string | null, courseOutcome: string | null, active: boolean, createdAt: string | null }> };

export type QuestionPapersQueryVariables = Exact<{
  curriculumSubjectId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type QuestionPapersQuery = { __typename?: 'Query', questionPapers: Array<{ __typename?: 'QuestionPaper', id: string, title: string, examTypeId: string | null, curriculumSubjectId: string, subjectId: string | null, totalMarks: number, durationMinutes: number | null, instructions: string | null, status: string, createdAt: string | null, items: Array<{ __typename?: 'QuestionPaperItem', id: string, seqNo: number, questionText: string, questionType: string, marks: number, options: Array<string>, section: string | null }> }> };

export type QuestionPaperQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type QuestionPaperQuery = { __typename?: 'Query', questionPaper: { __typename?: 'QuestionPaper', id: string, title: string, totalMarks: number, durationMinutes: number | null, instructions: string | null, generationRule: string | null, status: string, createdAt: string | null, subject: { __typename?: 'Subject', id: string, name: string, code: string } | null, examType: { __typename?: 'ExamType', id: string, name: string } | null, items: Array<{ __typename?: 'QuestionPaperItem', id: string, seqNo: number, questionText: string, questionType: string, marks: number, options: Array<string>, section: string | null }> } | null };

export type HallTicketsQueryVariables = Exact<{
  examScheduleId: Scalars['ID']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type HallTicketsQuery = { __typename?: 'Query', hallTickets: Array<{ __typename?: 'HallTicket', id: string, examScheduleId: string, studentId: string, ticketNumber: string, seatNumber: string | null, examCenter: string | null, eligible: boolean, holdReason: string | null, issuedOn: string | null, status: string, qrPayload: string, student: { __typename?: 'Student', id: string, rollNumber: string, semester: number | null, section: string | null, user: { __typename?: 'User', id: string, name: string } | null, course: { __typename?: 'Course', id: string, name: string, code: string } | null } | null }> };

export type MyHallTicketsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyHallTicketsQuery = { __typename?: 'Query', myHallTickets: Array<{ __typename?: 'HallTicket', id: string, examScheduleId: string, ticketNumber: string, seatNumber: string | null, examCenter: string | null, eligible: boolean, issuedOn: string | null, status: string, qrPayload: string, examSchedule: { __typename?: 'ExamSchedule', id: string, name: string, examType: string, startDate: string | null, endDate: string | null, instructions: string | null } | null }> };

export type ListBloodUnitsQueryVariables = Exact<{
  bloodGroup?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  component?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListBloodUnitsQuery = { __typename?: 'Query', bloodUnits: Array<{ __typename?: 'BloodUnit', id: string, bagNumber: string, bloodGroup: string, component: string, volumeMl: number, donorName: string | null, collectedDate: string | null, expiryDate: string | null, status: string, issuedToId: string | null, issuedToName: string | null, issuedDate: string | null }> };

export type ListBloodRequestsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListBloodRequestsQuery = { __typename?: 'Query', bloodRequests: Array<{ __typename?: 'BloodRequest', id: string, patientId: string, patientName: string, patientMrn: string, bloodGroup: string, component: string, unitsRequired: number, requestedByName: string | null, requestDate: string | null, status: string, notes: string | null }> };

export type ListAmbulancesQueryVariables = Exact<{
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListAmbulancesQuery = { __typename?: 'Query', ambulances: Array<{ __typename?: 'Ambulance', id: string, code: string, registration: string | null, vehicleType: string, driverName: string | null, driverPhone: string | null, status: string, active: boolean }> };

export type ListAmbulanceTripsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListAmbulanceTripsQuery = { __typename?: 'Query', ambulanceTrips: Array<{ __typename?: 'AmbulanceTrip', id: string, ambulanceId: string, ambulanceCode: string, patientId: string | null, patientName: string | null, tripType: string, origin: string | null, destination: string | null, dispatchTime: string, returnTime: string | null, status: string, notes: string | null }> };

export type ListDietPlansQueryVariables = Exact<{
  admissionId: Scalars['String']['input'];
  includeDiscontinued?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListDietPlansQuery = { __typename?: 'Query', dietPlans: Array<{ __typename?: 'DietPlan', id: string, admissionId: string, patientId: string, dietType: string, calories: number, restrictions: string | null, notes: string | null, status: string, servings: Array<{ __typename?: 'MealServing', id: string, mealType: string, servedAt: string, status: string, notes: string | null }> }> };

export type ListTeleConsultsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListTeleConsultsQuery = { __typename?: 'Query', teleConsults: Array<{ __typename?: 'TeleConsult', id: string, patientId: string, patientName: string, patientMrn: string, clinicianId: string | null, clinicianName: string | null, scheduledAt: string, meetingLink: string | null, status: string, reason: string | null, notes: string | null }> };

export type ListReferralsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  settlementStatus?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListReferralsQuery = { __typename?: 'Query', referrals: Array<{ __typename?: 'Referral', id: string, patientId: string, patientName: string, patientMrn: string, fromClinicianId: string | null, fromClinicianName: string | null, referredTo: string, specialty: string | null, reason: string | null, urgency: string, referralDate: string | null, status: string, notes: string | null, commissionType: string, commissionValue: number, commissionBase: number, commissionAmount: number, payeeType: string | null, payeeName: string | null, payeeEmployeeId: string | null, payeeEmployeeName: string | null, settlementStatus: string, settledOn: string | null }> };

export type ListAuditLogsQueryVariables = Exact<{
  action?: InputMaybe<Scalars['String']['input']>;
  module?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAuditLogsQuery = { __typename?: 'Query', auditLogs: Array<{ __typename?: 'AuditLog', id: string, actorName: string | null, actorRole: string | null, action: string, module: string | null, operation: string | null, entityId: string | null, detail: string | null, ip: string | null, createdAt: string }> };

export type ListAccountsQueryVariables = Exact<{
  type?: InputMaybe<Scalars['String']['input']>;
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListAccountsQuery = { __typename?: 'Query', accounts: Array<{ __typename?: 'Account', id: string, code: string, name: string, type: string, parentId: string | null, isSystem: boolean, systemKey: string | null, active: boolean, createdAt: string | null }> };

export type LedgerBatchesQueryVariables = Exact<{
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  sourceType?: InputMaybe<Scalars['String']['input']>;
}>;


export type LedgerBatchesQuery = { __typename?: 'Query', ledgerBatches: Array<{ __typename?: 'LedgerBatch', id: string, date: string, memo: string | null, sourceType: string | null, sourceId: string | null, posted: boolean, reversed: boolean, createdAt: string | null, lines: Array<{ __typename?: 'LedgerEntry', id: string, accountId: string, accountCode: string | null, accountName: string | null, debit: number, credit: number, memo: string | null }> }> };

export type AccountLedgerQueryVariables = Exact<{
  accountId: Scalars['ID']['input'];
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
}>;


export type AccountLedgerQuery = { __typename?: 'Query', accountLedger: { __typename?: 'AccountLedger', openingBalance: number, closingBalance: number, account: { __typename?: 'Account', id: string, code: string, name: string, type: string }, rows: Array<{ __typename?: 'AccountLedgerRow', batchId: string, date: string, memo: string | null, debit: number, credit: number, balance: number }> } };

export type TrialBalanceQueryVariables = Exact<{
  asOf?: InputMaybe<Scalars['String']['input']>;
}>;


export type TrialBalanceQuery = { __typename?: 'Query', trialBalance: Array<{ __typename?: 'TrialBalanceRow', accountId: string, code: string, name: string, type: string, debit: number, credit: number }> };

export type ProfitAndLossQueryVariables = Exact<{
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
}>;


export type ProfitAndLossQuery = { __typename?: 'Query', profitAndLoss: { __typename?: 'FinancialStatement', title: string, from: string | null, to: string | null, total: number, balanced: boolean, sections: Array<{ __typename?: 'StatementSection', title: string, total: number, lines: Array<{ __typename?: 'StatementLine', code: string, name: string, amount: number }> }> } };

export type BalanceSheetQueryVariables = Exact<{
  asOf: Scalars['String']['input'];
}>;


export type BalanceSheetQuery = { __typename?: 'Query', balanceSheet: { __typename?: 'FinancialStatement', title: string, asOf: string | null, total: number, balanced: boolean, sections: Array<{ __typename?: 'StatementSection', title: string, total: number, lines: Array<{ __typename?: 'StatementLine', code: string, name: string, amount: number }> }> } };

export type ArAgingQueryVariables = Exact<{
  asOf?: InputMaybe<Scalars['String']['input']>;
}>;


export type ArAgingQuery = { __typename?: 'Query', accountsReceivableAging: Array<{ __typename?: 'AgingRow', partyId: string, partyName: string, reference: string, date: string | null, dueDate: string | null, amount: number, daysOverdue: number, bucket: string }> };

export type ApAgingQueryVariables = Exact<{
  asOf?: InputMaybe<Scalars['String']['input']>;
}>;


export type ApAgingQuery = { __typename?: 'Query', accountsPayableAging: Array<{ __typename?: 'AgingRow', partyId: string, partyName: string, reference: string, date: string | null, dueDate: string | null, amount: number, daysOverdue: number, bucket: string }> };

export type GradingSchemeQueryVariables = Exact<{ [key: string]: never; }>;


export type GradingSchemeQuery = { __typename?: 'Query', gradingScheme: { __typename?: 'GradingScheme', id: string, mode: string, gpaMax: number, passThreshold: number, decimals: number, creditWeighted: boolean, weightedByExamType: boolean, bands: Array<{ __typename?: 'GradeBand', id: string, letter: string, minPercent: number, maxPercent: number, gradePoint: number, isPass: boolean, sortOrder: number }> } };

export type StudentAcademicResultQueryVariables = Exact<{
  studentId?: InputMaybe<Scalars['String']['input']>;
}>;


export type StudentAcademicResultQuery = { __typename?: 'Query', studentAcademicResult: { __typename?: 'AcademicResult', studentId: string, studentName: string, rollNumber: string, courseName: string, mode: string, gpaMax: number, totalCredits: number, marksObtained: number, maxMarks: number, percentage: number, cgpa: number, letter: string, isPass: boolean, generatedAt: string, semesters: Array<{ __typename?: 'SemesterResult', semester: number, totalCredits: number, marksObtained: number, maxMarks: number, percentage: number, sgpa: number, letter: string, isPass: boolean, subjects: Array<{ __typename?: 'SubjectResult', subjectId: string | null, subject: string, credits: number, marksObtained: number, maxMarks: number, percentage: number, letter: string, gradePoint: number, isPass: boolean }> }> } };

export type GetHolidaysQueryVariables = Exact<{
  year?: InputMaybe<Scalars['String']['input']>;
  academicYearId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetHolidaysQuery = { __typename?: 'Query', holidays: Array<{ __typename?: 'Holiday', id: string, academicYearId: string, name: string, date: string, type: string, autoGen: boolean }> };

export type GetHostelBlocksQueryVariables = Exact<{ [key: string]: never; }>;


export type GetHostelBlocksQuery = { __typename?: 'Query', hostelBlocks: Array<{ __typename?: 'HostelBlock', id: string, name: string, type: string, floors: number }> };

export type GetHostelRoomsQueryVariables = Exact<{
  blockId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetHostelRoomsQuery = { __typename?: 'Query', hostelRooms: Array<{ __typename?: 'HostelRoom', id: string, blockId: string, roomNumber: string, floor: number, capacity: number, occupied: number, roomType: string, status: string, monthlyFee: number, roomClassId: string | null, rateType: string | null, rateAmount: number | null, effectiveRateType: string, semesterRate: number, annualRate: number, monthlyRate: number, roomClass: { __typename?: 'RoomClass', id: string, name: string, description: string, rateType: string, rateAmount: number, semesterRate: number, annualRate: number, monthlyRate: number } | null, block: { __typename?: 'HostelBlock', id: string, name: string, type: string, floors: number } | null }> };

export type GetRoomClassesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRoomClassesQuery = { __typename?: 'Query', roomClasses: Array<{ __typename?: 'RoomClass', id: string, name: string, description: string, rateType: string, rateAmount: number, semesterRate: number, annualRate: number, monthlyRate: number }> };

export type GetHostelAllocationsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetHostelAllocationsQuery = { __typename?: 'Query', hostelAllocations: Array<{ __typename?: 'HostelAllocation', id: string, studentId: string, roomId: string, bedNumber: number, allocDate: string, vacateDate: string | null, status: string, student: { __typename?: 'Student', id: string, rollNumber: string, gender: string | null, user: { __typename?: 'User', id: string, name: string } | null } | null, room: { __typename?: 'HostelRoom', id: string, roomNumber: string, floor: number, capacity: number, roomType: string, status: string, monthlyFee: number, block: { __typename?: 'HostelBlock', id: string, name: string, type: string } | null } | null }> };

export type ListDutyRosterQueryVariables = Exact<{
  from?: InputMaybe<Scalars['String']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  employeeId?: InputMaybe<Scalars['String']['input']>;
  departmentId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListDutyRosterQuery = { __typename?: 'Query', dutyRoster: Array<{ __typename?: 'DutyRoster', id: string, employeeId: string, employeeName: string, date: string, shiftName: string | null, startTime: string, endTime: string, location: string | null, notes: string | null, createdAt: string | null }> };

export type ListEmployeeOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListEmployeeOptionsQuery = { __typename?: 'Query', employees: Array<{ __typename?: 'Employee', id: string, designation: string | null, user: { __typename?: 'User', name: string }, department: { __typename?: 'Department', id: string, name: string } | null }> };

export type ListLearningGoalsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListLearningGoalsQuery = { __typename?: 'Query', learningGoals: Array<{ __typename?: 'LearningGoal', id: string, title: string, description: string | null, dueDate: string | null, isMandatory: boolean, createdAt: string, sections: Array<{ __typename?: 'LearningSection', id: string, title: string, orderIndex: number, items: Array<{ __typename?: 'LearningItem', id: string, itemType: string, orderIndex: number, title: string, description: string | null, videoType: string | null, videoUrl: string | null, content: string | null, assessmentType: string | null, passScore: number | null, questions: Array<{ __typename?: 'LearningQuestion', id: string, assignmentID: string, kind: string, prompt: string, options: Array<string>, correctAnswers: Array<string>, points: number, orderIndex: number }> | null }> }> }> };

export type GetLearningGoalQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetLearningGoalQuery = { __typename?: 'Query', learningGoal: { __typename?: 'LearningGoal', id: string, title: string, description: string | null, dueDate: string | null, isMandatory: boolean, createdAt: string, sections: Array<{ __typename?: 'LearningSection', id: string, goalId: string, title: string, orderIndex: number, items: Array<{ __typename?: 'LearningItem', id: string, sectionId: string, itemType: string, orderIndex: number, title: string, description: string | null, videoType: string | null, videoUrl: string | null, content: string | null, assessmentType: string | null, passScore: number | null, questions: Array<{ __typename?: 'LearningQuestion', id: string, assignmentID: string, kind: string, prompt: string, options: Array<string>, correctAnswers: Array<string>, points: number, orderIndex: number }> | null }> }> } | null };

export type GoalAssignmentsQueryVariables = Exact<{
  goalId: Scalars['ID']['input'];
}>;


export type GoalAssignmentsQuery = { __typename?: 'Query', goalAssignments: Array<{ __typename?: 'GoalAssignmentItem', id: string, goalId: string, departmentId: string, createdAt: string, department: { __typename?: 'Department', id: string, name: string }, goal: { __typename?: 'LearningGoal', id: string, title: string } }> };

export type DepartmentLearningProgressQueryVariables = Exact<{
  deptId: Scalars['ID']['input'];
}>;


export type DepartmentLearningProgressQuery = { __typename?: 'Query', departmentLearningProgress: Array<{ __typename?: 'EmployeeGoalProgress', id: string, employeeId: string, goalId: string, status: string, completedAt: string | null, goal: { __typename?: 'LearningGoal', id: string, title: string, dueDate: string | null, isMandatory: boolean }, itemProgress: Array<{ __typename?: 'ItemProgress', id: string, itemId: string, itemType: string, status: string, score: number | null, completedAt: string | null }> }> };

export type MyLearningGoalsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyLearningGoalsQuery = { __typename?: 'Query', myLearningGoals: Array<{ __typename?: 'EmployeeGoalProgress', id: string, employeeId: string, goalId: string, status: string, completedAt: string | null, goal: { __typename?: 'LearningGoal', id: string, title: string, description: string | null, dueDate: string | null, isMandatory: boolean, sections: Array<{ __typename?: 'LearningSection', id: string, title: string, orderIndex: number, items: Array<{ __typename?: 'LearningItem', id: string, itemType: string, orderIndex: number, title: string, description: string | null, videoType: string | null, videoUrl: string | null, content: string | null, assessmentType: string | null, passScore: number | null, questions: Array<{ __typename?: 'LearningQuestion', id: string, assignmentID: string, kind: string, prompt: string, options: Array<string>, correctAnswers: Array<string>, points: number, orderIndex: number }> | null }> }> }, itemProgress: Array<{ __typename?: 'ItemProgress', id: string, itemId: string, itemType: string, status: string, score: number | null, completedAt: string | null }> }> };

export type AssignmentQuestionsQueryVariables = Exact<{
  assignmentId: Scalars['ID']['input'];
}>;


export type AssignmentQuestionsQuery = { __typename?: 'Query', assignmentQuestions: Array<{ __typename?: 'LearningQuestion', id: string, assignmentID: string, kind: string, prompt: string, options: Array<string>, correctAnswers: Array<string>, points: number, orderIndex: number }> };

export type EmployeeLearningGoalsQueryVariables = Exact<{
  employeeId: Scalars['ID']['input'];
}>;


export type EmployeeLearningGoalsQuery = { __typename?: 'Query', employeeLearningGoals: Array<{ __typename?: 'EmployeeGoalProgress', id: string, employeeId: string, goalId: string, status: string, completedAt: string | null, goal: { __typename?: 'LearningGoal', id: string, title: string, description: string | null, dueDate: string | null, isMandatory: boolean, sections: Array<{ __typename?: 'LearningSection', id: string, title: string, orderIndex: number, items: Array<{ __typename?: 'LearningItem', id: string, itemType: string, orderIndex: number, title: string, description: string | null, videoType: string | null, videoUrl: string | null, content: string | null, assessmentType: string | null, passScore: number | null, questions: Array<{ __typename?: 'LearningQuestion', id: string, assignmentID: string, kind: string, prompt: string, options: Array<string>, correctAnswers: Array<string>, points: number, orderIndex: number }> | null }> }> }, itemProgress: Array<{ __typename?: 'ItemProgress', id: string, itemId: string, itemType: string, status: string, score: number | null, completedAt: string | null }> }> };

export type ListLeavesQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListLeavesQuery = { __typename?: 'Query', leaves: Array<{ __typename?: 'LeaveRecord', id: string, applicantId: string, leaveTypeName: string, leaveTypeId: string | null, fromDate: string, toDate: string, reason: string, status: string, reviewedBy: string | null, reviewNote: string | null, applicant: { __typename?: 'User', id: string, name: string, email: string, role: string, isActive: boolean } | null }> };

export type ListLeaveTypesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListLeaveTypesQuery = { __typename?: 'Query', leaveTypes: Array<{ __typename?: 'LeaveTypeConfig', id: string, name: string, code: string, daysPerYear: number, carryForward: boolean, maxCarryForward: number, applicableTo: string, isActive: boolean }> };

export type MyLeaveBalanceQueryVariables = Exact<{ [key: string]: never; }>;


export type MyLeaveBalanceQuery = { __typename?: 'Query', myLeaveBalance: Array<{ __typename?: 'LeaveBalance', id: string, userId: string, leaveTypeId: string, year: number, total: number, used: number, pending: number, leaveType: { __typename?: 'LeaveTypeConfig', id: string, name: string, code: string, daysPerYear: number, carryForward: boolean, maxCarryForward: number, applicableTo: string, isActive: boolean } | null }> };

export type ListLeaveBalancesQueryVariables = Exact<{
  year?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListLeaveBalancesQuery = { __typename?: 'Query', leaveBalances: Array<{ __typename?: 'LeaveBalance', id: string, userId: string, leaveTypeId: string, year: number, total: number, used: number, pending: number, leaveType: { __typename?: 'LeaveTypeConfig', id: string, name: string, code: string } | null }> };

export type GetLibraryBooksQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLibraryBooksQuery = { __typename?: 'Query', libraryBooks: Array<{ __typename?: 'LibraryBook', id: string, title: string, author: string, isbn: string, publisher: string, category: string, rack: string, shelf: string, publish_year: number, total_copies: number, available_copies: number }> };

export type GetLibraryIssuesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLibraryIssuesQuery = { __typename?: 'Query', libraryIssues: Array<{ __typename?: 'LibraryIssue', id: string, status: string, book_id: string, user_id: string, issue_date: string, due_date: string, return_date: string | null, fine_amount: number, book: { __typename?: 'LibraryBook', id: string, title: string, author: string, isbn: string, rack: string, shelf: string } | null, user: { __typename?: 'User', id: string, name: string, email: string } | null }> };

export type GetLibraryOverdueQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLibraryOverdueQuery = { __typename?: 'Query', libraryOverdue: Array<{ __typename?: 'LibraryIssue', id: string, status: string, book_id: string, user_id: string, issue_date: string, due_date: string, return_date: string | null, fine_amount: number, book: { __typename?: 'LibraryBook', id: string, title: string, author: string, isbn: string, rack: string, shelf: string } | null, user: { __typename?: 'User', id: string, name: string, email: string } | null }> };

export type ListMarksQueryVariables = Exact<{
  studentId?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
  examType?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListMarksQuery = { __typename?: 'Query', marks: Array<{ __typename?: 'Mark', id: string, studentId: string, subject: string, examType: string, semester: number, marksObtained: number, maxMarks: number, grade: string | null, enteredBy: string | null, subjectId: string | null, assessmentType: string | null, status: string | null, academicYearId: string | null, isPublished: boolean, publishedAt: string | null, student: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string } | null } | null }> };

export type MarksCountQueryVariables = Exact<{
  studentId?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
  examType?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type MarksCountQuery = { __typename?: 'Query', marksCount: number };

export type ListPublishedResultsQueryVariables = Exact<{
  examType?: InputMaybe<Scalars['String']['input']>;
  subject?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
  courseId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListPublishedResultsQuery = { __typename?: 'Query', publishedResults: Array<{ __typename?: 'Mark', id: string, studentId: string, subject: string, examType: string, semester: number, marksObtained: number, maxMarks: number, grade: string | null, isPublished: boolean, student: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string } | null, course: { __typename?: 'Course', id: string, name: string } | null } | null }> };

export type GetResultSummaryQueryVariables = Exact<{
  courseId: Scalars['String']['input'];
  semester: Scalars['Int']['input'];
}>;


export type GetResultSummaryQuery = { __typename?: 'Query', resultSummary: { __typename?: 'ResultSummary', totalStudents: number, passCount: number, failCount: number } };

export type MyNotificationsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyNotificationsQuery = { __typename?: 'Query', myNotifications: Array<{ __typename?: 'NotificationItem', id: string, userId: string, title: string, body: string | null, type: string, category: string, refId: string | null, refType: string | null, isRead: boolean, createdAt: string }> };

export type UnreadNotificationCountQueryVariables = Exact<{ [key: string]: never; }>;


export type UnreadNotificationCountQuery = { __typename?: 'Query', unreadNotificationCount: { __typename?: 'UnreadCount', count: number } };

export type OpdSlipConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type OpdSlipConfigQuery = { __typename?: 'Query', opdSlipConfig: string | null };

export type GetAppointmentForSlipQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetAppointmentForSlipQuery = { __typename?: 'Query', appointment: { __typename?: 'Appointment', id: string, patientId: string, patientName: string, patientMrn: string, clinicianName: string, departmentName: string | null, date: string, startTime: string, endTime: string | null, reason: string | null, referredBy: string | null, status: string } | null };

export type ListVitalsQueryVariables = Exact<{
  admissionId: Scalars['String']['input'];
}>;


export type ListVitalsQuery = { __typename?: 'Query', vitalsRecords: Array<{ __typename?: 'VitalsRecord', id: string, recordedByName: string | null, recordedAt: string, tempC: number, pulse: number, respRate: number, bpSystolic: number, bpDiastolic: number, spo2: number, painScore: number, notes: string | null }> };

export type ListMedicationOrdersQueryVariables = Exact<{
  admissionId: Scalars['String']['input'];
  includeDiscontinued?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListMedicationOrdersQuery = { __typename?: 'Query', medicationOrders: Array<{ __typename?: 'MedicationOrder', id: string, drugName: string, dose: string | null, route: string | null, frequency: string | null, orderedByName: string | null, startDate: string | null, endDate: string | null, status: string, notes: string | null, administrations: Array<{ __typename?: 'MedicationAdministration', id: string, administeredByName: string | null, administeredAt: string, status: string, notes: string | null }> }> };

export type ListInsurancePayersQueryVariables = Exact<{
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListInsurancePayersQuery = { __typename?: 'Query', insurancePayers: Array<{ __typename?: 'InsurancePayer', id: string, code: string, name: string, payerType: string, contactName: string | null, phone: string | null, email: string | null, active: boolean }> };

export type ListInsuranceClaimsQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  payerId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListInsuranceClaimsQuery = { __typename?: 'Query', insuranceClaims: Array<{ __typename?: 'InsuranceClaim', id: string, claimNumber: string, patientId: string, patientName: string, patientMrn: string, payerId: string | null, payerName: string | null, policyNumber: string | null, diagnosis: string | null, claimAmount: number, approvedAmount: number, status: string, notes: string | null, submittedAt: string | null, settledAt: string | null, createdAt: string | null }> };

export type ListInventoryItemsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListInventoryItemsQuery = { __typename?: 'Query', inventoryItems: Array<{ __typename?: 'InventoryItem', id: string, code: string, name: string, category: string, unit: string, stockQty: number, reorderLevel: number, unitCost: number, linkedDrugId: string | null, linkedDrugName: string | null, active: boolean }> };

export type ListStockTransactionsQueryVariables = Exact<{
  itemId: Scalars['String']['input'];
}>;


export type ListStockTransactionsQuery = { __typename?: 'Query', stockTransactions: Array<{ __typename?: 'StockTransaction', id: string, kind: string, qty: number, reason: string | null, byName: string | null, date: string | null }> };

export type ListOperationTheatresQueryVariables = Exact<{
  includeInactive?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListOperationTheatresQuery = { __typename?: 'Query', operationTheatres: Array<{ __typename?: 'OperationTheatre', id: string, code: string, name: string, location: string | null, active: boolean }> };

export type ListSurgeriesQueryVariables = Exact<{
  date?: InputMaybe<Scalars['String']['input']>;
  theatreId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListSurgeriesQuery = { __typename?: 'Query', surgeries: Array<{ __typename?: 'SurgerySchedule', id: string, patientId: string, patientName: string, patientMrn: string, theatreId: string, theatreName: string, surgeonId: string | null, surgeonName: string | null, procedureName: string, anesthesiaType: string | null, scheduledDate: string, startTime: string, endTime: string, status: string, notes: string | null }> };

export type ListTriageCasesQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListTriageCasesQuery = { __typename?: 'Query', triageCases: Array<{ __typename?: 'TriageCase', id: string, patientId: string, patientName: string, patientMrn: string, arrivalTime: string, chiefComplaint: string | null, triageLevel: number, vitals: string | null, assignedClinicianId: string | null, assignedClinicianName: string | null, status: string, disposition: string | null, notes: string | null }> };

export type GetOrgProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOrgProfileQuery = { __typename?: 'Query', orgProfile: { __typename?: 'OrgProfile', id: string, name: string, logoUrl: string, tagline: string, primaryColor: string, accentColor: string, accreditation: string } };

export type GetOrgSetupStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOrgSetupStatusQuery = { __typename?: 'Query', orgSetupStatus: { __typename?: 'OrgSetupStatus', orgProfile: boolean, departments: boolean, academicYear: boolean, firstUser: boolean } };

export type GetOrgUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOrgUsersQuery = { __typename?: 'Query', orgUsers: Array<{ __typename?: 'OrgUser', id: string, name: string, email: string, role: string, photoUrl: string, managerId: string | null, departmentId: string | null, designation: string }> };

export type GetOrgStructureQueryVariables = Exact<{
  department?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetOrgStructureQuery = { __typename?: 'Query', orgStructure: { __typename?: 'OrgStructure', roots: Array<{ __typename?: 'OrgNode', id: string, name: string, email: string, role: string, photoUrl: string, managerId: string | null, departmentId: string | null, designation: string, children: Array<{ __typename?: 'OrgNode', id: string, name: string, email: string, role: string, photoUrl: string, managerId: string | null, departmentId: string | null, designation: string, children: Array<{ __typename?: 'OrgNode', id: string, name: string, email: string, role: string, photoUrl: string, managerId: string | null, departmentId: string | null, designation: string, children: Array<{ __typename?: 'OrgNode', id: string, name: string, email: string, role: string, photoUrl: string, managerId: string | null, departmentId: string | null, designation: string, children: Array<{ __typename?: 'OrgNode', id: string, name: string, email: string, role: string, photoUrl: string, managerId: string | null, departmentId: string | null, designation: string, children: Array<{ __typename?: 'OrgNode', id: string, name: string }> }> }> }> }> }>, users: Array<{ __typename?: 'OrgUser', id: string, name: string, email: string, role: string, photoUrl: string, managerId: string | null, departmentId: string | null, designation: string }> } };

export type GetSemestersQueryVariables = Exact<{
  academicYearId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetSemestersQuery = { __typename?: 'Query', semesters: Array<{ __typename?: 'Semester', id: string, academicYearId: string, number: number, name: string, startDate: string, endDate: string }> };

export type GetCustomRolesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCustomRolesQuery = { __typename?: 'Query', customRoles: Array<{ __typename?: 'CustomRole', id: string, name: string, permissions: string }> };

export type GetSystemRolesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSystemRolesQuery = { __typename?: 'Query', systemRoles: Array<{ __typename?: 'SystemRole', id: string, roleId: string, label: string, description: string, color: string, sortOrder: number }> };

export type AskPeepalAiQueryVariables = Exact<{
  question: Scalars['String']['input'];
}>;


export type AskPeepalAiQuery = { __typename?: 'Query', askPeepalAI: { __typename?: 'PeepalAIAnswer', answer: string, sql: string, columns: Array<string>, rows: Array<Array<string>>, denied: boolean, message: string } };

export type PlatformAnalyticsQueryVariables = Exact<{ [key: string]: never; }>;


export type PlatformAnalyticsQuery = { __typename?: 'Query', platformAnalytics: { __typename?: 'PlatformAnalytics', generatedAt: string, tenants: { __typename?: 'PlatformTenantStats', total: number, active: number, suspended: number, newThisMonth: number, growth: Array<{ __typename?: 'TenantGrowthPoint', month: string, created: number, cumulative: number }>, byType: Array<{ __typename?: 'TenantTypeCount', type: string, count: number }> }, people: { __typename?: 'PlatformPeopleStats', students: number, employees: number, users: number, topTenants: Array<{ __typename?: 'TenantPeopleCount', tenantId: string, tenantName: string, students: number, employees: number }> }, subscriptions: { __typename?: 'PlatformSubscriptionStats', active: number, unsubscribed: number, expiringSoon: number, estimatedMrr: number, byPlan: Array<{ __typename?: 'PlanCount', planId: string, planName: string, tenants: number, priceMonthly: number }>, byStatus: Array<{ __typename?: 'SubStatusCount', status: string, count: number }> }, quota: { __typename?: 'PlatformQuotaStats', overQuota: number, studentUsage: number, studentLimit: number, employeeUsage: number, employeeLimit: number, breaches: Array<{ __typename?: 'TenantQuotaBreach', tenantId: string, tenantName: string, resource: string, limit: number, current: number, overBy: number }> } } };

export type MyPatientSummaryQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPatientSummaryQuery = { __typename?: 'Query', myPatientProfile: { __typename?: 'Patient', id: string, mrn: string, firstName: string, lastName: string | null, gender: string | null, bloodGroup: string | null, phone: string | null, email: string | null, allergies: string | null, chronicConditions: string | null, status: string } | null, myPatientSummary: { __typename?: 'PatientPortalSummary', upcomingAppointments: number, visits: number, labOrders: number, activeReferrals: number } };

export type MyPatientAppointmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPatientAppointmentsQuery = { __typename?: 'Query', myPatientAppointments: Array<{ __typename?: 'Appointment', id: string, clinicianName: string, departmentName: string | null, date: string, startTime: string, endTime: string | null, reason: string | null, status: string }> };

export type MyPatientVisitsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPatientVisitsQuery = { __typename?: 'Query', myPatientVisits: Array<{ __typename?: 'Encounter', id: string, clinicianName: string, visitType: string, visitDate: string, chiefComplaint: string | null, diagnosis: string | null, prescription: string | null, followUpDate: string | null, status: string }> };

export type MyPatientLabOrdersQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPatientLabOrdersQuery = { __typename?: 'Query', myPatientLabOrders: Array<{ __typename?: 'LabOrder', id: string, orderDate: string, status: string, items: Array<{ __typename?: 'LabOrderItem', id: string, testName: string, resultValue: string | null, unit: string | null, flag: string | null, refText: string | null }> }> };

export type MyPatientRadiologyQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPatientRadiologyQuery = { __typename?: 'Query', myPatientRadiologyOrders: Array<{ __typename?: 'RadiologyOrder', id: string, studyName: string, modality: string, orderDate: string, status: string, impression: string | null, reportedByName: string | null }> };

export type MyPatientReferralsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPatientReferralsQuery = { __typename?: 'Query', myPatientReferrals: Array<{ __typename?: 'Referral', id: string, referredTo: string, specialty: string | null, urgency: string, referralDate: string | null, status: string }> };

export type MyPatientTeleConsultsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPatientTeleConsultsQuery = { __typename?: 'Query', myPatientTeleConsults: Array<{ __typename?: 'TeleConsult', id: string, clinicianName: string | null, scheduledAt: string, meetingLink: string | null, status: string, reason: string | null }> };

export type ListVendorsQueryVariables = Exact<{
  active?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListVendorsQuery = { __typename?: 'Query', vendors: Array<{ __typename?: 'Vendor', id: string, name: string, code: string | null, gstin: string | null, contactName: string | null, phone: string | null, email: string | null, address: string | null, paymentTerms: string | null, active: boolean, createdAt: string | null }> };

export type ListPurchaseOrdersQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
  vendorId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListPurchaseOrdersQuery = { __typename?: 'Query', purchaseOrders: Array<{ __typename?: 'PurchaseOrder', id: string, poNumber: string, vendorId: string, status: string, orderDate: string | null, expectedDate: string | null, subtotal: number, taxTotal: number, total: number, notes: string | null, vendor: { __typename?: 'Vendor', id: string, name: string } | null, items: Array<{ __typename?: 'PurchaseOrderItem', id: string, itemId: string | null, itemName: string, qty: number, receivedQty: number, unitCost: number, taxPct: number, lineTotal: number }> }> };

export type GetPurchaseOrderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetPurchaseOrderQuery = { __typename?: 'Query', purchaseOrder: { __typename?: 'PurchaseOrder', id: string, poNumber: string, vendorId: string, status: string, orderDate: string | null, expectedDate: string | null, subtotal: number, taxTotal: number, total: number, notes: string | null, vendor: { __typename?: 'Vendor', id: string, name: string } | null, items: Array<{ __typename?: 'PurchaseOrderItem', id: string, itemId: string | null, itemName: string, qty: number, receivedQty: number, unitCost: number, taxPct: number, lineTotal: number }> } | null };

export type ListPurchaseInvoicesQueryVariables = Exact<{
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListPurchaseInvoicesQuery = { __typename?: 'Query', purchaseInvoices: Array<{ __typename?: 'PurchaseInvoice', id: string, invoiceNumber: string, vendorId: string, purchaseOrderId: string | null, invoiceDate: string | null, dueDate: string | null, subtotal: number, taxTotal: number, total: number, paidAmount: number, status: string, vendor: { __typename?: 'Vendor', id: string, name: string } | null }> };

export type ExpiringDrugsQueryVariables = Exact<{
  days: Scalars['Int']['input'];
}>;


export type ExpiringDrugsQuery = { __typename?: 'Query', expiringDrugs: Array<{ __typename?: 'DrugBatch', id: string, drugId: string, drugName: string | null, batchNo: string, expiryDate: string | null, qty: number, unitCost: number }> };

export type DashboardStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type DashboardStatsQuery = { __typename?: 'Query', dashboardStats: { __typename?: 'DashboardStats', students: number, employees: number, teachers: number, users: number, pendingLeaves: number, pendingPayrolls: number, todayPresent: number, todayAbsent: number, patients: number, todayAppointments: number, todayOpd: number, openOpd: number, activeAdmissions: number, occupiedBeds: number, availableBeds: number } };

export type AttendanceReportQueryVariables = Exact<{
  fromDate?: InputMaybe<Scalars['String']['input']>;
  toDate?: InputMaybe<Scalars['String']['input']>;
  entityType?: InputMaybe<Scalars['String']['input']>;
  subjectId?: InputMaybe<Scalars['String']['input']>;
}>;


export type AttendanceReportQuery = { __typename?: 'Query', attendanceReport: { __typename?: 'AttendanceReportResult', fromDate: string, toDate: string, entityType: string, daily: Array<{ __typename?: 'DailyAttendanceRow', date: string, present: number, absent: number, late: number, total: number }> } };

export type MarksReportQueryVariables = Exact<{
  courseId?: InputMaybe<Scalars['String']['input']>;
  semesterNumber?: InputMaybe<Scalars['String']['input']>;
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  assessmentType?: InputMaybe<Scalars['String']['input']>;
}>;


export type MarksReportQuery = { __typename?: 'Query', marksReport: { __typename?: 'MarksReportResult', gradeDistribution: Array<{ __typename?: 'GradeRow', grade: string, count: number }>, subjectAverages: Array<{ __typename?: 'SubjectAvgRow', subjectId: string, subjectName: string, avgMarks: number, maxMarks: number, passCount: number, failCount: number, totalCount: number }> } };

export type LeaveReportQueryVariables = Exact<{
  year?: InputMaybe<Scalars['String']['input']>;
  department?: InputMaybe<Scalars['String']['input']>;
}>;


export type LeaveReportQuery = { __typename?: 'Query', leaveReport: { __typename?: 'LeaveReportResult', year: string, total: number, approved: number, statusBreakdown: Array<{ __typename?: 'LeaveStatusRow', status: string, count: number }>, monthlyTrend: Array<{ __typename?: 'LeaveMonthRow', month: string, count: number }>, byDepartment: Array<{ __typename?: 'LeaveDeptRow', department: string, count: number }> } };

export type FeeReportQueryVariables = Exact<{
  academicYearId?: InputMaybe<Scalars['String']['input']>;
}>;


export type FeeReportQuery = { __typename?: 'Query', feeReport: { __typename?: 'FeeReportResult', totalCollected: number, paymentCount: number, monthlyTrend: Array<{ __typename?: 'FeeMonthRow', month: string, amount: number, count: number }>, byPaymentMode: Array<{ __typename?: 'FeeModeRow', mode: string, amount: number, count: number }>, byPlan: Array<{ __typename?: 'FeePlanReportRow', plan: string, amount: number, count: number }> } };

export type PayrollReportQueryVariables = Exact<{
  year?: InputMaybe<Scalars['String']['input']>;
}>;


export type PayrollReportQuery = { __typename?: 'Query', payrollReport: { __typename?: 'PayrollReportResult', year: string, totalGross: number, totalNet: number, totalEmployees: number, monthlyTrend: Array<{ __typename?: 'PayrollMonthRow', month: string, grossSalary: number, netSalary: number, totalDeductions: number, employeeCount: number }> } };

export type GetSalaryTemplatesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSalaryTemplatesQuery = { __typename?: 'Query', salaryTemplates: Array<{ __typename?: 'SalaryTemplate', id: string, name: string, description: string, basicSalary: number, hra: number, da: number, ta: number, medicalAllowance: number, otherAllowances: number, pf: number, esi: number, tds: number, otherDeductions: number, isActive: boolean }> };

export type GetSalaryAssignmentsQueryVariables = Exact<{
  employeeId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetSalaryAssignmentsQuery = { __typename?: 'Query', salaryAssignments: Array<{ __typename?: 'SalaryAssignment', id: string, employeeId: string, templateId: string, extraAllowance: number, extraDeduction: number, effectiveFrom: string, effectiveTo: string | null, isActive: boolean, notes: string, employee: { __typename?: 'Employee', id: string, employeeId: string, designation: string | null, user: { __typename?: 'User', id: string, name: string, email: string }, department: { __typename?: 'Department', id: string, name: string } | null } | null, template: { __typename?: 'SalaryTemplate', id: string, name: string, basicSalary: number, hra: number, da: number, ta: number, medicalAllowance: number, otherAllowances: number, pf: number, esi: number, tds: number, otherDeductions: number } | null }> };

export type SessionFieldsFragment = { __typename?: 'UserSession', id: string, current: boolean, activeRole: string, createdAt: string, lastUsedAt: string, expiresAt: string, deviceLabel: string, userAgent: string | null, ip: string | null };

export type MySessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MySessionsQuery = { __typename?: 'Query', mySessions: Array<{ __typename?: 'UserSession', id: string, current: boolean, activeRole: string, createdAt: string, lastUsedAt: string, expiresAt: string, deviceLabel: string, userAgent: string | null, ip: string | null }> };

export type UserSessionsQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type UserSessionsQuery = { __typename?: 'Query', userSessions: Array<{ __typename?: 'UserSession', id: string, current: boolean, activeRole: string, createdAt: string, lastUsedAt: string, expiresAt: string, deviceLabel: string, userAgent: string | null, ip: string | null }> };

export type ListStudentsQueryVariables = Exact<{
  courseId?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListStudentsQuery = { __typename?: 'Query', students: Array<{ __typename?: 'Student', id: string, rollNumber: string, section: string | null, semester: number | null, phone: string | null, enrollDate: string | null, dateOfBirth: string | null, gender: string | null, bloodGroup: string | null, photoUrl: string | null, address: string | null, city: string | null, state: string | null, pincode: string | null, nationality: string | null, emergencyName: string | null, emergencyPhone: string | null, fatherName: string | null, fatherPhone: string | null, motherName: string | null, motherPhone: string | null, admissionStatus: string | null, batch: string | null, user: { __typename?: 'User', id: string, name: string, email: string, role: string, isActive: boolean } | null, course: { __typename?: 'Course', id: string, name: string, code: string } | null }> };

export type ListCoursesWithBatchesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListCoursesWithBatchesQuery = { __typename?: 'Query', courses: Array<{ __typename?: 'Course', id: string, name: string, code: string, department: { __typename?: 'Department', id: string, name: string } | null, batches: Array<{ __typename?: 'CourseBatch', id: string, name: string, startYear: number, endYear: number }> }> };

export type GetStudentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetStudentQuery = { __typename?: 'Query', student: { __typename?: 'Student', id: string, rollNumber: string, section: string | null, semester: number | null, phone: string | null, enrollDate: string | null, dateOfBirth: string | null, gender: string | null, bloodGroup: string | null, user: { __typename?: 'User', id: string, name: string, email: string } | null, course: { __typename?: 'Course', id: string, name: string, code: string } | null } | null };

export type GetTerminologyQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTerminologyQuery = { __typename?: 'Query', terminology: { __typename?: 'TerminologyPayload', type: string, labels: { __typename?: 'TerminologyLabels', organization: string, organizationPlural: string, member: string, memberPlural: string, staff: string, staffPlural: string, department: string, departmentPlural: string, course: string, coursePlural: string, attendance: string, marks: string, leave: string } } };

export type ListTimetableQueryVariables = Exact<{
  academicYearId?: InputMaybe<Scalars['String']['input']>;
  courseId?: InputMaybe<Scalars['String']['input']>;
  semester?: InputMaybe<Scalars['Int']['input']>;
  section?: InputMaybe<Scalars['String']['input']>;
  dayOfWeek?: InputMaybe<Scalars['String']['input']>;
  employeeId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListTimetableQuery = { __typename?: 'Query', timetable: Array<{ __typename?: 'TimetableSlot', id: string, academicYearId: string | null, courseId: string, subjectId: string, employeeId: string | null, dayOfWeek: string, periodNumber: number, startTime: string, endTime: string, semester: number, section: string | null, room: string | null, course: { __typename?: 'Course', id: string, name: string, code: string } | null, subject: { __typename?: 'Subject', id: string, name: string, code: string } | null }> };

export type GetTransportRoutesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTransportRoutesQuery = { __typename?: 'Query', transportRoutes: Array<{ __typename?: 'TransportRoute', id: string, stops: string, distance: number, route_name: string, start_point: string, end_point: string }> };

export type GetTransportVehiclesQueryVariables = Exact<{
  routeId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetTransportVehiclesQuery = { __typename?: 'Query', transportVehicles: Array<{ __typename?: 'TransportVehicle', id: string, capacity: number, status: string, vehicle_number: string, vehicle_type: string, driver_name: string, driver_phone: string, route_id: string, route: { __typename?: 'TransportRoute', id: string, route_name: string, start_point: string, end_point: string } | null }> };

export type GetTransportAllocationsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTransportAllocationsQuery = { __typename?: 'Query', transportAllocations: Array<{ __typename?: 'TransportAllocation', id: string, status: string, alloc_type: string, student_id: string, employee_id: string, vehicle_id: string, pickup_stop: string, start_date: string, end_date: string | null, student: { __typename?: 'Student', id: string, user: { __typename?: 'User', id: string, name: string } | null } | null, employee: { __typename?: 'Employee', id: string, user: { __typename?: 'User', id: string, name: string } } | null, vehicle: { __typename?: 'TransportVehicle', id: string, vehicle_number: string, vehicle_type: string, driver_name: string, route: { __typename?: 'TransportRoute', id: string, route_name: string } | null } | null }> };

export type WorkspaceFieldsFragment = { __typename?: 'Workspace', role: string, label: string, isPrimary: boolean, customRoleId: string | null };

export type MyWorkspacesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyWorkspacesQuery = { __typename?: 'Query', myWorkspaces: Array<{ __typename?: 'Workspace', role: string, label: string, isPrimary: boolean, customRoleId: string | null }> };

export type UserWorkspacesQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type UserWorkspacesQuery = { __typename?: 'Query', userWorkspaces: Array<{ __typename?: 'Workspace', role: string, label: string, isPrimary: boolean, customRoleId: string | null }> };

export type FeeStructureFieldsFragment = { __typename?: 'FeeStructure', id: string, courseId: string, name: string, code: string, batchId: string | null, description: string | null, isActive: boolean, totalAmount: number, allocationCount: number, yearTotals: Array<{ __typename?: 'FeeYearTotal', yearNumber: number, amount: number }>, items: Array<{ __typename?: 'FeeStructureItem', id: string, feeCategoryId: string, yearNumber: number, amount: number, feeCategory: { __typename?: 'FeeCategory', id: string, name: string, code: string } | null }>, course: { __typename?: 'Course', id: string, name: string, code: string, durationYears: number | null, totalSemesters: number | null } | null, batch: { __typename?: 'CourseBatch', id: string, name: string } | null };

export type FeeAllocationFieldsFragment = { __typename?: 'FeeAllocation', id: string, feeStructureId: string, name: string, frequency: string, targetType: string, targetId: string, targetName: string, totalAmount: number, isActive: boolean, studentCount: number, installments: Array<{ __typename?: 'FeeAllocationInstallment', id: string, sequence: number, label: string, yearNumber: number, dueDate: string | null, amount: number }>, feeStructure: { __typename?: 'FeeStructure', id: string, name: string, code: string, course: { __typename?: 'Course', id: string, name: string } | null } | null };

export type StudentFeeFieldsFragment = { __typename?: 'StudentFee', id: string, studentId: string, feeAllocationId: string, grossAmount: number, discountAmount: number, netAmount: number, paidAmount: number, status: string, discounts: Array<{ __typename?: 'StudentFeeDiscount', id: string, label: string, discountType: string, value: number, amount: number, remarks: string | null }>, addOns: Array<{ __typename?: 'StudentFeeAddOn', id: string, feeAddOnId: string, yearNumber: number, amount: number, feeAddOn: { __typename?: 'FeeAddOn', id: string, name: string, code: string } | null }>, installments: Array<{ __typename?: 'StudentFeeInstallment', id: string, sequence: number, label: string, dueDate: string | null, amount: number, paidAmount: number, status: string, isOverdue: boolean }>, student: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string } | null, course: { __typename?: 'Course', id: string, name: string } | null } | null, feeAllocation: { __typename?: 'FeeAllocation', id: string, name: string, frequency: string, feeStructure: { __typename?: 'FeeStructure', id: string, name: string, course: { __typename?: 'Course', id: string, name: string, durationYears: number | null } | null } | null } | null };

export type ListFeeCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListFeeCategoriesQuery = { __typename?: 'Query', feeCategories: Array<{ __typename?: 'FeeCategory', id: string, name: string, code: string, description: string | null, isActive: boolean }> };

export type ListFeeStructuresQueryVariables = Exact<{
  courseId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListFeeStructuresQuery = { __typename?: 'Query', feeStructures: Array<{ __typename?: 'FeeStructure', id: string, courseId: string, name: string, code: string, batchId: string | null, description: string | null, isActive: boolean, totalAmount: number, allocationCount: number, yearTotals: Array<{ __typename?: 'FeeYearTotal', yearNumber: number, amount: number }>, items: Array<{ __typename?: 'FeeStructureItem', id: string, feeCategoryId: string, yearNumber: number, amount: number, feeCategory: { __typename?: 'FeeCategory', id: string, name: string, code: string } | null }>, course: { __typename?: 'Course', id: string, name: string, code: string, durationYears: number | null, totalSemesters: number | null } | null, batch: { __typename?: 'CourseBatch', id: string, name: string } | null }> };

export type ListFeeAllocationsQueryVariables = Exact<{
  feeStructureId?: InputMaybe<Scalars['String']['input']>;
  courseId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListFeeAllocationsQuery = { __typename?: 'Query', feeAllocations: Array<{ __typename?: 'FeeAllocation', id: string, feeStructureId: string, name: string, frequency: string, targetType: string, targetId: string, targetName: string, totalAmount: number, isActive: boolean, studentCount: number, installments: Array<{ __typename?: 'FeeAllocationInstallment', id: string, sequence: number, label: string, yearNumber: number, dueDate: string | null, amount: number }>, feeStructure: { __typename?: 'FeeStructure', id: string, name: string, code: string, course: { __typename?: 'Course', id: string, name: string } | null } | null }> };

export type ListStudentFeesQueryVariables = Exact<{
  studentId?: InputMaybe<Scalars['String']['input']>;
  feeAllocationId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  courseId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListStudentFeesQuery = { __typename?: 'Query', studentFees: Array<{ __typename?: 'StudentFee', id: string, studentId: string, feeAllocationId: string, grossAmount: number, discountAmount: number, netAmount: number, paidAmount: number, status: string, discounts: Array<{ __typename?: 'StudentFeeDiscount', id: string, label: string, discountType: string, value: number, amount: number, remarks: string | null }>, addOns: Array<{ __typename?: 'StudentFeeAddOn', id: string, feeAddOnId: string, yearNumber: number, amount: number, feeAddOn: { __typename?: 'FeeAddOn', id: string, name: string, code: string } | null }>, installments: Array<{ __typename?: 'StudentFeeInstallment', id: string, sequence: number, label: string, dueDate: string | null, amount: number, paidAmount: number, status: string, isOverdue: boolean }>, student: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string } | null, course: { __typename?: 'Course', id: string, name: string } | null } | null, feeAllocation: { __typename?: 'FeeAllocation', id: string, name: string, frequency: string, feeStructure: { __typename?: 'FeeStructure', id: string, name: string, course: { __typename?: 'Course', id: string, name: string, durationYears: number | null } | null } | null } | null }> };

export type MyStudentFeesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyStudentFeesQuery = { __typename?: 'Query', myStudentFees: Array<{ __typename?: 'StudentFee', id: string, studentId: string, feeAllocationId: string, grossAmount: number, discountAmount: number, netAmount: number, paidAmount: number, status: string, discounts: Array<{ __typename?: 'StudentFeeDiscount', id: string, label: string, discountType: string, value: number, amount: number, remarks: string | null }>, addOns: Array<{ __typename?: 'StudentFeeAddOn', id: string, feeAddOnId: string, yearNumber: number, amount: number, feeAddOn: { __typename?: 'FeeAddOn', id: string, name: string, code: string } | null }>, installments: Array<{ __typename?: 'StudentFeeInstallment', id: string, sequence: number, label: string, dueDate: string | null, amount: number, paidAmount: number, status: string, isOverdue: boolean }>, student: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string } | null, course: { __typename?: 'Course', id: string, name: string } | null } | null, feeAllocation: { __typename?: 'FeeAllocation', id: string, name: string, frequency: string, feeStructure: { __typename?: 'FeeStructure', id: string, name: string, course: { __typename?: 'Course', id: string, name: string, durationYears: number | null } | null } | null } | null }> };

export type ListFeePaymentsQueryVariables = Exact<{
  studentId?: InputMaybe<Scalars['String']['input']>;
  studentFeeId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type ListFeePaymentsQuery = { __typename?: 'Query', feePayments: Array<{ __typename?: 'FeePayment', id: string, studentFeeId: string, studentId: string, installmentId: string | null, amount: number, paymentDate: string, paymentMode: string, transactionRef: string | null, status: string, remarks: string | null, receiptNumber: string, student: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string } | null } | null, studentFee: { __typename?: 'StudentFee', id: string, feeAllocation: { __typename?: 'FeeAllocation', id: string, name: string } | null } | null }> };

export type MyFeePaymentsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyFeePaymentsQuery = { __typename?: 'Query', myFeePayments: Array<{ __typename?: 'FeePayment', id: string, amount: number, paymentDate: string, paymentMode: string, status: string, receiptNumber: string, transactionRef: string | null, remarks: string | null, installmentId: string | null, studentFee: { __typename?: 'StudentFee', id: string, feeAllocation: { __typename?: 'FeeAllocation', id: string, name: string } | null } | null }> };

export type FeeOverviewQueryVariables = Exact<{ [key: string]: never; }>;


export type FeeOverviewQuery = { __typename?: 'Query', feeOverview: { __typename?: 'FeeOverview', summary: { __typename?: 'FeeCollectionSummary', totalCollected: number, paymentCount: number, pendingDues: number, totalExpected: number }, byCourse: Array<{ __typename?: 'FeeCourseRow', courseId: string, courseName: string, expected: number, collected: number, pending: number, studentCount: number }>, byMode: Array<{ __typename?: 'FeeModeRow', mode: string, amount: number, count: number }>, byMonth: Array<{ __typename?: 'FeeMonthRow', month: string, amount: number, count: number }>, recentPayments: Array<{ __typename?: 'FeePayment', id: string, amount: number, paymentDate: string, paymentMode: string, receiptNumber: string, student: { __typename?: 'Student', id: string, rollNumber: string, user: { __typename?: 'User', id: string, name: string } | null } | null }> } };

export type ListFeeAddOnsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListFeeAddOnsQuery = { __typename?: 'Query', feeAddOns: Array<{ __typename?: 'FeeAddOn', id: string, name: string, code: string, kind: string, feeCategoryId: string, amountPerYear: number, description: string | null, isActive: boolean, studentCount: number, feeCategory: { __typename?: 'FeeCategory', id: string, name: string, code: string } | null }> };

export type CreateFeeAddOnMutationVariables = Exact<{
  input: CreateFeeAddOnInput;
}>;


export type CreateFeeAddOnMutation = { __typename?: 'Mutation', createFeeAddOn: { __typename?: 'FeeAddOn', id: string } };

export type UpdateFeeAddOnMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateFeeAddOnInput;
}>;


export type UpdateFeeAddOnMutation = { __typename?: 'Mutation', updateFeeAddOn: { __typename?: 'FeeAddOn', id: string } };

export type DeleteFeeAddOnMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteFeeAddOnMutation = { __typename?: 'Mutation', deleteFeeAddOn: boolean };

export type ResyncFacilityFeesMutationVariables = Exact<{ [key: string]: never; }>;


export type ResyncFacilityFeesMutation = { __typename?: 'Mutation', resyncFacilityFees: number };

export type AddStudentFeeAddOnMutationVariables = Exact<{
  input: AddStudentFeeAddOnInput;
}>;


export type AddStudentFeeAddOnMutation = { __typename?: 'Mutation', addStudentFeeAddOn: { __typename?: 'StudentFee', id: string, netAmount: number } };

export type RemoveStudentFeeAddOnMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveStudentFeeAddOnMutation = { __typename?: 'Mutation', removeStudentFeeAddOn: { __typename?: 'StudentFee', id: string, netAmount: number } };

export type CreateFeeCategoryMutationVariables = Exact<{
  input: CreateFeeCategoryInput;
}>;


export type CreateFeeCategoryMutation = { __typename?: 'Mutation', createFeeCategory: { __typename?: 'FeeCategory', id: string } };

export type UpdateFeeCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateFeeCategoryInput;
}>;


export type UpdateFeeCategoryMutation = { __typename?: 'Mutation', updateFeeCategory: { __typename?: 'FeeCategory', id: string } };

export type DeleteFeeCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteFeeCategoryMutation = { __typename?: 'Mutation', deleteFeeCategory: boolean };

export type CreateFeeStructureMutationVariables = Exact<{
  input: CreateFeeStructureInput;
}>;


export type CreateFeeStructureMutation = { __typename?: 'Mutation', createFeeStructure: { __typename?: 'FeeStructure', id: string } };

export type UpdateFeeStructureMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateFeeStructureInput;
}>;


export type UpdateFeeStructureMutation = { __typename?: 'Mutation', updateFeeStructure: { __typename?: 'FeeStructure', id: string } };

export type DeleteFeeStructureMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteFeeStructureMutation = { __typename?: 'Mutation', deleteFeeStructure: boolean };

export type CloneFeeStructureMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  code: Scalars['String']['input'];
}>;


export type CloneFeeStructureMutation = { __typename?: 'Mutation', cloneFeeStructure: { __typename?: 'FeeStructure', id: string } };

export type CreateFeeAllocationMutationVariables = Exact<{
  input: CreateFeeAllocationInput;
}>;


export type CreateFeeAllocationMutation = { __typename?: 'Mutation', createFeeAllocation: { __typename?: 'FeeAllocation', id: string, studentCount: number } };

export type UpdateFeeAllocationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateFeeAllocationInput;
}>;


export type UpdateFeeAllocationMutation = { __typename?: 'Mutation', updateFeeAllocation: { __typename?: 'FeeAllocation', id: string } };

export type DeleteFeeAllocationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteFeeAllocationMutation = { __typename?: 'Mutation', deleteFeeAllocation: boolean };

export type SyncFeeAllocationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SyncFeeAllocationMutation = { __typename?: 'Mutation', syncFeeAllocation: number };

export type AddStudentFeeDiscountMutationVariables = Exact<{
  input: AddStudentFeeDiscountInput;
}>;


export type AddStudentFeeDiscountMutation = { __typename?: 'Mutation', addStudentFeeDiscount: { __typename?: 'StudentFee', id: string } };

export type RemoveStudentFeeDiscountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveStudentFeeDiscountMutation = { __typename?: 'Mutation', removeStudentFeeDiscount: { __typename?: 'StudentFee', id: string } };

export type RecordFeePaymentMutationVariables = Exact<{
  input: RecordFeePaymentInput;
}>;


export type RecordFeePaymentMutation = { __typename?: 'Mutation', recordFeePayment: { __typename?: 'FeePayment', id: string, receiptNumber: string } };

export type CancelFeePaymentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelFeePaymentMutation = { __typename?: 'Mutation', cancelFeePayment: { __typename?: 'FeePayment', id: string, status: string } };

export type SystemUpdateStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type SystemUpdateStatusQuery = { __typename?: 'Query', systemUpdateStatus: { __typename?: 'SystemUpdateStatus', installedBackend: string, installedFrontend: string, availableBackend: string, availableFrontend: string, updateAvailable: boolean, snoozed: boolean, snoozedUntil: string | null, activeUsersInTenant: number, agentReachable: boolean } };

export type SnoozeSystemUpdateMutationVariables = Exact<{ [key: string]: never; }>;


export type SnoozeSystemUpdateMutation = { __typename?: 'Mutation', snoozeSystemUpdate: { __typename?: 'SystemUpdateStatus', updateAvailable: boolean, snoozed: boolean, snoozedUntil: string | null, activeUsersInTenant: number, agentReachable: boolean } };

export type ApplySystemUpdateMutationVariables = Exact<{ [key: string]: never; }>;


export type ApplySystemUpdateMutation = { __typename?: 'Mutation', applySystemUpdate: boolean };
