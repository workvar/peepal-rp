#!/usr/bin/env node
// Regenerates the DB Visualizer schema from backend/models/*.go.
//   Usage: npm run gen:schema   (run from the frontend/ directory)
// Parses Go structs + gorm/json tags into tables, columns and FK edges, then
// writes components/pages/(super-admin)/super/db-visualizer/schema.ts.
//
// When you add a NEW table, give it a one-line description in DESC below;
// the script warns about any table missing one.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.resolve(__dirname, "../../backend/models");
const OUT_FILE = path.resolve(
  __dirname,
  "../components/pages/(super-admin)/super/db-visualizer/schema.ts"
);

// file -> module label
const MODULE = {
  "access.go": "Access", "access_registry.go": "Access",
  "academic.go": "Academic", "approval.go": "Approvals", "attendance.go": "Attendance",
  "calendar.go": "Calendar", "employee.go": "Employees", "event.go": "Calendar",
  "fee_addon.go": "Fees", "fee_allocation.go": "Fees", "fee_category.go": "Fees",
  "fee_payment.go": "Fees", "fee_structure.go": "Fees", "hostel.go": "Hostel",
  "learning.go": "Learning", "leave.go": "Leaves", "library.go": "Library", "mark.go": "Marks",
  "notification.go": "Notifications", "org.go": "Organization", "payroll.go": "Payroll",
  "student.go": "Students", "student_fee.go": "Fees", "subscription.go": "Platform",
  "tenant.go": "Platform", "terminology.go": "Platform", "timetable.go": "Academic",
  "transport.go": "Transport", "user.go": "Core",
};

const MOD_ORDER = ["Platform", "Core", "Access", "Employees", "Students", "Academic",
  "Attendance", "Marks", "Leaves", "Approvals", "Fees", "Hostel", "Transport", "Library",
  "Learning", "Payroll", "Calendar", "Organization", "Notifications", "Other"];

const MOD_COLOR = {
  Platform: "#f59e0b", Core: "#3b82f6", Access: "#dc2626", Employees: "#10b981",
  Students: "#06b6d4", Academic: "#8b5cf6", Attendance: "#22c55e", Marks: "#ef4444",
  Leaves: "#f97316", Approvals: "#ec4899", Fees: "#14b8a6", Hostel: "#a855f7",
  Transport: "#0ea5e9", Library: "#84cc16", Learning: "#6366f1", Payroll: "#eab308",
  Calendar: "#d946ef", Organization: "#64748b", Notifications: "#f43f5e", Other: "#94a3b8",
};

const DESC = {
  AccessRule: "Per-tenant override of one role's CRUD access to one module. Sparse: a row exists only when an admin changes access away from the registry default. Powers the access matrix and per-action GraphQL gating.",
  Tenant: "A customer institution (college/school/org). Root of all tenant-scoped data; every business row carries its tenant_id.",
  SubscriptionPlan: "A purchasable plan (Free/Pro/Enterprise) defining limits and which modules a tenant may enable.",
  TenantSubscription: "Links a tenant to its active plan with billing period, status and seat counts.",
  Terminology: "Per-tenant label overrides (e.g. \"Student\"→\"Trainee\") powering the white-label terminology layer.",
  User: "A login identity. Email + bcrypt password, a role, and an optional manager_id chain. Join point for Employee and Student.",
  Employee: "Staff/faculty profile attached 1:1 to a User. Holds HR fields, department and designation.",
  EmployeePaymentDetails: "Bank, PF, ESI, PAN and tax details for an employee, used by payroll.",
  Department: "An academic or administrative department within a tenant; may have a head employee.",
  Student: "Student profile attached 1:1 to a User; enrolled in a Course/batch with roll number and semester.",
  Course: "A program of study (e.g. B.Tech CSE) offered by the tenant.",
  CourseBatch: "An intake/cohort of a Course (e.g. 2024 batch) used for fees and grouping.",
  AcademicYear: "A named academic session (e.g. 2024-25) with start/end dates; one can be current.",
  Semester: "A semester/term inside an academic year.",
  Subject: "A teachable subject/paper with code, credits and hours; optionally owned by a department.",
  ExamSchedule: "A planned exam window (internal/semester/assignment) with instructions and publish flag.",
  TimetableSlot: "A single timetable entry binding subject, teacher, room and time to a day.",
  Attendance: "One attendance record for a student or employee on a date, with status P/A/L/H.",
  AttendanceSettings: "Per-tenant attendance rules: minimum %, grace period and lock window.",
  Holiday: "A holiday date (institutional or auto-generated) optionally tied to an academic year.",
  CalendarSettings: "Weekly-off configuration (Sunday/Saturday rules) used to compute working days.",
  Event: "A calendar event (academic/cultural/sports/exam) shown on the institute calendar.",
  Mark: "A student's marks and computed grade for a subject in an exam.",
  Leave: "A leave application by a user with type, dates, reason and approval status.",
  LeaveBalance: "Remaining leave quota per user per leave type.",
  LeaveTypeConfig: "Per-tenant definition of a leave type (name, annual quota, paid flag).",
  ApprovalProcessType: "Catalogue of approvable processes (leave, fee-waiver…); builtin or custom per tenant.",
  ApprovalFlow: "A configured multi-step approval pipeline for a process, with optional custom form fields.",
  ApprovalStep: "One ordered step in a flow naming the approver (user/role/department/manager-level) and optional conditions.",
  ApprovalRequest: "A live instance of a flow raised against a record; tracks current step and overall status.",
  ApprovalAction: "An approve/reject decision recorded by an approver on a request step, with a comment.",
  FeeCategory: "A type of fee (tuition, library, exam…). Building block for structures and add-ons.",
  FeeStructure: "A fee variation for a course/batch (Regular/NRI/Scholarship) holding per-year line items.",
  FeeStructureItem: "One category amount for a given course-year inside a fee structure.",
  FeeAllocation: "Assigns a fee structure to a course/batch/student with frequency and total amount.",
  FeeAllocationInstallment: "A scheduled installment slot (sequence, due date, amount) of an allocation.",
  FeeAddOn: "An optional extra fee (transport/hostel/other) billable per year on top of the base fee.",
  StudentFee: "A student's computed fee record for a year: total, paid, balance and status.",
  StudentFeeInstallment: "Per-student installment derived from the allocation schedule.",
  StudentFeeAddOn: "Links a chosen add-on (with amount) to a student's fee for a year.",
  StudentFeeDiscount: "A discount/scholarship applied to a student's fee.",
  FeePayment: "A recorded payment/receipt against a student fee or installment.",
  HostelBlock: "A hostel building (boys/girls/mixed) with a number of floors.",
  HostelRoom: "A room in a block with capacity, occupancy, type, status and rate.",
  RoomClass: "A reusable room-rate class (monthly/semester/annual) applied to rooms.",
  HostelAllocation: "Assigns a student to a specific bed in a room for a period.",
  TransportRoute: "A bus route with stops and fare.",
  TransportVehicle: "A vehicle in the transport fleet (registration, capacity, driver).",
  TransportAllocation: "Assigns a student to a route/vehicle stop.",
  LibraryBook: "A catalogued book/title with copies and metadata.",
  LibraryIssue: "An issue/return record of a book to a borrower with due date and fine.",
  LearningGoal: "A training goal/course built of sections; can be mandatory with a due date.",
  LearningSection: "An ordered section grouping units and assignments inside a goal.",
  LearningUnit: "A learning unit (video/reading) within a section.",
  LearningAssignment: "A quiz/assignment in a section, made of questions.",
  LearningQuestion: "A question belonging to a learning assignment.",
  GoalAssignment: "Assigns a learning goal to a user/group as a learner.",
  AssignmentProgress: "Tracks a learner's attempt/score on a learning assignment.",
  UnitProgress: "Tracks a learner's completion of a learning unit.",
  EmployeeGoalProgress: "Roll-up of an employee's overall progress on a learning goal.",
  SalaryStructure: "A named pay structure (earnings/deductions components) for staff.",
  SalaryTemplate: "A reusable salary template that seeds structures.",
  SalaryAssignment: "Assigns a salary structure to an employee with effective dates.",
  Payroll: "A generated payroll run/payslip for an employee for a period.",
  PayrollDeduction: "A single deduction line on a payroll record.",
  OrgProfile: "The tenant's organisation profile (address, contacts, branding).",
  CustomRole: "A tenant-defined role with a permission set beyond the base roles.",
  Notification: "An in-app notification delivered to a user.",
  Announcement: "A broadcast announcement to the tenant or a segment.",
  Ward: "A nursing ward (the hostel-block counterpart for healthcare) holding beds, with type, gender policy and floor.",
  Bed: "A single bed in a ward with a unique number, optional bay grouping, status and daily charge; occupancy is derived from admissions.",
  Admission: "Places a patient on a bed and, on discharge, holds the discharge summary.",
  BedTransfer: "One ward/bed move within an admission (the T in ADT).",
  SubjectUnit: "One unit of a subject's course plan (topics, optional lab/field notes); stored JSON-encoded in Subject.UnitsJSON.",
  Account: "One node of a tenant's chart-of-accounts tree; system accounts are seeded and looked up by key for auto-posting.",
  Ambulance: "One vehicle in the ambulance fleet.",
  AmbulanceTrip: "One dispatch/trip of an ambulance.",
  Appointment: "A booked consultation slot between a patient and a clinician (an Employee).",
  AuditLog: "One recorded action in the audit trail (writes and logins).",
  BillableService: "A priced catalog entry (consultation, dressing, X-ray…) used to prefill invoice lines.",
  Invoice: "Bills a patient for one or more services, optionally linked to the encounter; totals are denormalised.",
  InvoiceItem: "One charged line on an invoice, with description and price frozen at billing time.",
  InvoicePayment: "Money received against an invoice.",
  BloodUnit: "One bag of a blood component in stock in the blood bank.",
  BloodRequest: "A demand for blood for a patient.",
  BrochureContent: "Per-tenant JSON payload powering the editable /brochure page and its downloadable PDF.",
  ClinicianSchedule: "A clinician's recurring weekly consulting window; appointment booking validates against it.",
  CurriculumSubject: "Assigns a subject to a course-semester in the curriculum (the link row).",
  DietPlan: "The prescribed diet for an admitted patient.",
  MealServing: "One meal delivered against a diet plan.",
  DriverAttendance: "A driver's sign-on to a vehicle for a day (kept separate from the generic Attendance model).",
  DrugBatch: "One received batch of a drug with expiry and quantity; dispensing draws earliest-expiry first (FEFO).",
  DutyRoster: "A one-off dated staff shift (a superset of the recurring weekly clinician schedule).",
  EmailSettings: "Per-tenant (or platform) SMTP host/from configuration for outbound email.",
  EmailTemplate: "Per-tenant override of a transactional email template body, keyed by template; uses {{variable}} placeholders.",
  Encounter: "One clinical visit (OPD): complaint, findings and prescription; optionally linked to an appointment.",
  EventCategory: "A tenant-defined event category supplementing the built-in defaults; Slug is what an Event stores.",
  ExamType: "A department-scoped (or org-wide) assessment type that populates the marks-entry dropdown.",
  GradingScheme: "Per-tenant grading configuration (cgpa/gpa/percentage/letter/pass_fail) driving SGPA/CGPA.",
  GradeBand: "One row of the grade scale: a percentage range mapped to a letter, grade point and pass flag.",
  HallTicket: "An exam admit card issued to a student with a verification QR; idempotently generated.",
  InsurancePayer: "An insurer / TPA the hospital bills claims to.",
  InsuranceClaim: "One reimbursement claim for a patient's care.",
  InventoryItem: "One stocked line in the central store.",
  StockTransaction: "One signed movement of an inventory item (positive in / negative out); sums to the on-hand quantity.",
  Invite: "A pending user-setup invitation; only the SHA-256 hash of the emailed token is stored.",
  LabTest: "One catalog entry the lab can order and result.",
  LabOrder: "A request for one or more lab tests for a patient, optionally tied to an encounter.",
  LabOrderItem: "One test on a lab order with a frozen catalog snapshot and optional result.",
  LedgerBatch: "One journal entry: a balanced set of lines with provenance for idempotent auto-posting.",
  LedgerEntry: "One debit or credit line of a ledger batch (exactly one of Debit/Credit is > 0).",
  MessMenu: "One (day, meal) cell of the weekly mess menu, optionally scoped to a hostel block.",
  MessAttendance: "One student consuming/opting into one meal on one day (idempotent per day).",
  MessExpense: "One mess provisioning cost, optionally linked to a vendor or purchase order.",
  ModuleCatalog: "One coarse subscription module (stable Key plus display Label).",
  ModulePageMap: "Maps one fine-grained access-matrix page to a coarse subscription module (or marks it core).",
  VitalsRecord: "One set of vitals for an admitted patient, stored as discrete columns for trending.",
  MedicationOrder: "A prescribed drug for an admitted patient (one row of the MAR).",
  MedicationAdministration: "One recorded dose event against a medication order.",
  OperationTheatre: "A bookable operation-theatre room.",
  SurgerySchedule: "One booking of a theatre for a patient's procedure.",
  Patient: "A person the hospital/clinic treats (no login); MRN is the human-facing per-tenant identifier.",
  Drug: "One catalog entry the pharmacy stocks and dispenses.",
  Dispense: "One hand-over of drugs to a patient; creating one decrements stock inside a transaction.",
  DispenseItem: "One drug line on a dispense, with name and price frozen at hand-over.",
  PurchaseInvoice: "A supplier bill, optionally raised against a purchase order.",
  PurchaseOrder: "A header + lines document sent to a vendor; receiving lines writes StockTransactions.",
  PurchaseOrderItem: "One ordered line on a PO, optionally linked to the store item it replenishes.",
  QuestionBankItem: "One reusable question in the question bank.",
  QuestionPaper: "A question-paper header: exam, subject and the rule that produced it.",
  QuestionPaperItem: "One frozen question on a generated question paper.",
  RadiologyStudy: "One catalog entry for a specific imaging study.",
  RadiologyOrder: "One imaging request with its later report.",
  Referral: "One outbound patient referral.",
  StudentAssignment: "One piece of coursework set by a teacher, scoped by course/semester/section/subject.",
  AssignmentSubmission: "One student's answer to an assignment; a resubmission updates the same row.",
  ModulePreset: "A named group of module keys a super-admin can apply in one click while building a plan.",
  QuotaBreach: "One subscription limit a tenant has exceeded.",
  QuotaSnapshot: "A tenant's full usage-vs-limits picture, used by the quota banner.",
  SystemRole: "A per-tenant role definition powering the Roles page and Add Employee dropdown (industry-relabeled).",
  TeleConsult: "One remote video consultation.",
  TriageCase: "One emergency-department presentation with an acuity level.",
  Vendor: "A supplier of goods/services, shared across procurement, accounts payable and mess.",
};

const snake = (s) => s.replace(/(?<!^)(?=[A-Z])/g, "_").toLowerCase();

// --- read & index structs -----------------------------------------------
const files = fs.readdirSync(MODELS_DIR)
  .filter((f) => f.endsWith(".go") && !f.endsWith("_defaults.go"))
  .sort();

// A struct is a DB table only if it has at least one json-tagged field. Helper
// value types (AccessFlags, ModuleMeta, …) carry no json tags and are skipped —
// both as tables and as relation targets.
const isTable = (body) => /json:"/.test(body);

const src = {};
const known = new Set();
for (const f of files) {
  const text = fs.readFileSync(path.join(MODELS_DIR, f), "utf8");
  src[f] = text;
  for (const m of text.matchAll(/type (\w+) struct \{([\s\S]*?)\n\}/g)) {
    if (isTable(m[2])) known.add(m[1]);
  }
}

function parseFields(body) {
  const out = [];
  for (let line of body.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("//") || line === "}") continue;
    const m = line.match(/^(\w+)\s+([[\]*\w.]+)\s*(`[^`]*`)?\s*(\/\/.*)?$/);
    if (!m) continue;
    const [, name, type, tagsRaw, commentRaw] = m;
    const tags = tagsRaw || "";
    const gorm = (tags.match(/gorm:"([^"]*)"/) || [, ""])[1];
    const jsonT = (tags.match(/json:"([^"]*)"/) || [, ""])[1].split(",")[0];
    const comment = (commentRaw || "").replace(/^\/+\s*/, "").trim();
    out.push({ name, type, gorm, json: jsonT, comment });
  }
  return out;
}

const tables = [];
const relations = [];
for (const [f, text] of Object.entries(src)) {
  const mod = MODULE[f] || "Other";
  for (const sm of text.matchAll(/type (\w+) struct \{([\s\S]*?)\n\}/g)) {
    const sname = sm[1];
    if (!isTable(sm[2])) continue; // skip helper value structs
    const fields = parseFields(sm[2]);
    const cols = [];
    for (const fld of fields) {
      const base = fld.type.replace(/^[[\]*]+/, "");
      if (known.has(base)) {
        const fk = (fld.gorm.match(/foreignKey:(\w+)/) || [, null])[1];
        relations.push({ from: sname, to: base, fk, many: fld.type.startsWith("[]") });
        continue;
      }
      const pk = fld.gorm.includes("primaryKey");
      const name = fld.json || fld.name;
      cols.push({
        name, type: fld.type, pk,
        fk: name.endsWith("_id") && !pk,
        req: fld.gorm.includes("not null"),
        note: fld.comment,
        ref: null,
      });
    }
    tables.push({ name: sname, module: mod, file: f, desc: DESC[sname] || "", columns: cols });
  }
}

// --- normalize FK edges (child holds the FK -> parent) -------------------
const edgeSet = new Map();
for (const r of relations) {
  const child = r.many ? r.to : r.from;
  const parent = r.many ? r.from : r.to;
  const fk = r.fk || "";
  edgeSet.set(`${child}|${parent}|${fk}`, { child, parent, fk });
}
const edges = [...edgeSet.values()].sort((a, b) =>
  `${a.child}${a.parent}${a.fk}`.localeCompare(`${b.child}${b.parent}${b.fk}`));

// attach ref targets to columns
const fkmap = {};
for (const e of edges) {
  if (!e.fk) continue;
  (fkmap[e.child] ||= {})[snake(e.fk)] = e.parent;
}
for (const t of tables) {
  const fm = fkmap[t.name] || {};
  for (const c of t.columns) c.ref = fm[c.name] || null;
}

const modules = MOD_ORDER
  .filter((m) => tables.some((t) => t.module === m))
  .map((m) => ({ name: m, color: MOD_COLOR[m] }));

// --- warn on missing descriptions ----------------------------------------
const missing = tables.filter((t) => !t.desc).map((t) => t.name);
if (missing.length) {
  console.warn("⚠ tables missing a description in DESC:", missing.join(", "));
}

// --- emit schema.ts ------------------------------------------------------
const ts =
`// AUTO-GENERATED from backend/models/*.go — do not edit by hand.
// Regenerate with: npm run gen:schema. Describes the Peepal database for the DB Visualizer.

export interface Column { name: string; type: string; pk: boolean; fk: boolean; req: boolean; note: string; ref: string | null }
export interface Table { name: string; module: string; file: string; desc: string; columns: Column[] }
export interface Edge { child: string; parent: string; fk: string }
export interface ModuleMeta { name: string; color: string }

export const MODULES: ModuleMeta[] = ${JSON.stringify(modules)};

export const TABLES: Table[] = ${JSON.stringify(tables)};

export const EDGES: Edge[] = ${JSON.stringify(edges)};
`;

fs.writeFileSync(OUT_FILE, ts);
console.log(`✓ wrote ${path.relative(process.cwd(), OUT_FILE)} — ${tables.length} tables, ${edges.length} edges, ${modules.length} modules`);
