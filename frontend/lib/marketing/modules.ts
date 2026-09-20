import {
  Users,
  GraduationCap,
  CalendarCheck,
  DollarSign,
  FileText,
  BarChart2,
  Bell,
  Award,
  Wallet,
} from "lucide-react";

export type ModuleDef = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  icon: React.ElementType;
  gradient: string;
  color: string;
  whoCanUse: { role: string; why: string }[];
  features: { title: string; desc: string }[];
  highlights: string[];
};

export const MODULES: ModuleDef[] = [
  {
    slug: "students",
    name: "Student Management",
    tagline: "Every learner, one profile.",
    summary:
      "Enrollments, batches, courses, guardians and performance — the single source of truth for every student in your institution.",
    icon: Users,
    gradient: "linear-gradient(135deg,#1f5d36,#2d7a4a)",
    color: "#1f5d36",
    whoCanUse: [
      { role: "Admins",    why: "Full CRUD over student records, bulk import and transfers." },
      { role: "Teachers",  why: "View students in their classes, academic history and parent contacts." },
      { role: "Staff",     why: "Handle admissions, ID card issuance and record requests." },
      { role: "Students",  why: "See their own profile, batch and enrolled courses." },
    ],
    features: [
      { title: "Unified profiles",      desc: "Demographics, guardians, docs and academic history in one view." },
      { title: "Bulk enrollment",       desc: "CSV upload with validation and deduping." },
      { title: "Course allocation",     desc: "Assign cohorts to subjects, batches and academic years." },
      { title: "Transfer & archival",   desc: "Promote, transfer or archive cleanly with full audit trail." },
    ],
    highlights: [
      "Guardian & emergency contacts",
      "Document vault per student",
      "Batch-level bulk actions",
      "Photo, ID and roll-number tracking",
    ],
  },
  {
    slug: "employees",
    name: "Employee Management",
    tagline: "People operations, uncomplicated.",
    summary:
      "A complete HR record for every teacher and staff member — profiles, departments, designations, payment details and onboarding.",
    icon: Users,
    gradient: "linear-gradient(135deg,#2d7a4a,#4f9268)",
    color: "#2d7a4a",
    whoCanUse: [
      { role: "Admins",    why: "Hire, edit and offboard employees; manage payment details." },
      { role: "HR staff",  why: "Update personal details, contracts and qualifications." },
      { role: "Teachers",  why: "View and update their own profile." },
    ],
    features: [
      { title: "Departments & roles", desc: "Model your org with departments, designations and reporting lines." },
      { title: "Payment details",     desc: "Bank and tax details per employee, encrypted at rest." },
      { title: "Documents",           desc: "Upload contracts, qualifications and compliance paperwork." },
      { title: "Onboarding",          desc: "Create a user, assign permissions, email login — in one flow." },
    ],
    highlights: [
      "Department hierarchy",
      "Encrypted payment fields",
      "Linked user accounts",
      "Full profile history",
    ],
  },
  {
    slug: "attendance",
    name: "Attendance",
    tagline: "Mark, see, fix — in seconds.",
    summary:
      "Attendance for students and employees with bulk marking, shortage alerts, configurable periods and crystal-clear summaries.",
    icon: CalendarCheck,
    gradient: "linear-gradient(135deg,#1f5d36,#4f9268)",
    color: "#1f5d36",
    whoCanUse: [
      { role: "Teachers",  why: "Mark class attendance in bulk; edit and justify entries." },
      { role: "Admins",    why: "Configure periods, thresholds and shortage policies." },
      { role: "Students",  why: "See their attendance percentage and absences in real time." },
      { role: "HR / Staff", why: "Run employee attendance and leave balances." },
    ],
    features: [
      { title: "Bulk marking",     desc: "Whole-class or whole-department marking with a single submit." },
      { title: "Period-wise",      desc: "Configure periods/shifts and capture attendance per slot." },
      { title: "Shortage alerts",  desc: "Automated flags when students dip below the threshold." },
      { title: "Summaries",        desc: "Roll up by batch, course, department or date range." },
    ],
    highlights: [
      "Bulk + individual modes",
      "Configurable periods",
      "Shortage detection",
      "Export to CSV",
    ],
  },
  {
    slug: "marks",
    name: "Marks & Grades",
    tagline: "From raw scores to grade sheets.",
    summary:
      "Enter marks with validations, auto-calculate grades, generate semester reports — and never chase a spreadsheet again.",
    icon: Award,
    gradient: "linear-gradient(135deg,#163f25,#1f5d36)",
    color: "#163f25",
    whoCanUse: [
      { role: "Teachers",  why: "Enter assessment and exam marks for their subjects." },
      { role: "Admins",    why: "Configure exam structures, grade bands and publish report cards." },
      { role: "Students",  why: "View their own results after release." },
    ],
    features: [
      { title: "Grade auto-calc",   desc: "O / A+ / A / B+ / B / C / F bands computed from configurable cutoffs." },
      { title: "Exam structures",   desc: "Internal, external, practical — weight each component." },
      { title: "Report cards",      desc: "Per-student semester report PDFs with branding." },
      { title: "Moderation",        desc: "Review, approve and publish workflow with audit trail." },
    ],
    highlights: [
      "Grade bands configurable",
      "Per-subject weightage",
      "Publishable report cards",
      "Bulk mark entry",
    ],
  },
  {
    slug: "leaves",
    name: "Leave Management",
    tagline: "Ask. Approve. Track.",
    summary:
      "Leaves for students and employees — configurable leave types, balances, approval chains and a calendar view everyone trusts.",
    icon: FileText,
    gradient: "linear-gradient(135deg,#4f9268,#93c2a0)",
    color: "#4f9268",
    whoCanUse: [
      { role: "Anyone",    why: "Apply for leave from the dashboard." },
      { role: "Approvers", why: "Review, comment, approve or reject — with email + in-app notifications." },
      { role: "Admins",    why: "Configure leave types, balances and approval chains." },
    ],
    features: [
      { title: "Typed leaves",     desc: "CL, SL, earned, medical, academic — configure to match your policy." },
      { title: "Approval chains",  desc: "Single or multi-step approvals with delegation." },
      { title: "Balances",         desc: "Auto-decrement, carry-forward and encashment-ready balances." },
      { title: "Calendar",         desc: "Team-level view of who's out, when." },
    ],
    highlights: [
      "Configurable leave types",
      "Multi-step approvals",
      "Balance tracking",
      "Calendar view",
    ],
  },
  {
    slug: "payroll",
    name: "Payroll & Salary",
    tagline: "Run payroll with zero drama.",
    summary:
      "Salary structures, automated payruns, payslips and reports — fully integrated with attendance and leaves.",
    icon: Wallet,
    gradient: "linear-gradient(135deg,#1f5d36,#2d7a4a)",
    color: "#1f5d36",
    whoCanUse: [
      { role: "Admins",    why: "Configure structures, run payroll and release payslips." },
      { role: "Finance",   why: "Reconcile bank advices, generate reports for statutory filings." },
      { role: "Employees", why: "View and download their own payslips and YTD reports." },
    ],
    features: [
      { title: "Salary structures", desc: "Build pay components with formulas and deductions." },
      { title: "Automated payruns", desc: "Factor in attendance, leaves and overtime automatically." },
      { title: "Payslips",          desc: "Release branded payslip PDFs — individually or in bulk." },
      { title: "Reports",           desc: "Bank advice, tax summary, YTD — exportable in one click." },
    ],
    highlights: [
      "Component-based structures",
      "Attendance-aware payrun",
      "Branded payslip PDFs",
      "Statutory-ready reports",
    ],
  },
  {
    slug: "fees",
    name: "Fee Collection",
    tagline: "Know who owes what.",
    summary:
      "Fee structures, installments, receipts, reminders and overdue reports — everything finance needs, nothing they don't.",
    icon: DollarSign,
    gradient: "linear-gradient(135deg,#0e2d1a,#163f25)",
    color: "#0e2d1a",
    whoCanUse: [
      { role: "Finance team", why: "Record payments, issue receipts and chase overdue." },
      { role: "Admins",       why: "Configure fee heads, structures and concessions." },
      { role: "Students",     why: "View their fee ledger, upcoming installments and past receipts." },
    ],
    features: [
      { title: "Fee heads",     desc: "Tuition, hostel, transport — any number of configurable fee heads." },
      { title: "Structures",    desc: "Program- or batch-level fee structures with installment plans." },
      { title: "Receipts",      desc: "Print-ready receipts with your branding and numbering." },
      { title: "Overdue alerts", desc: "Automated nudges to students and guardians." },
    ],
    highlights: [
      "Installments & concessions",
      "Branded receipts",
      "Overdue automation",
      "Per-student ledger",
    ],
  },
  {
    slug: "reports",
    name: "Reports & Analytics",
    tagline: "Answers, not spreadsheets.",
    summary:
      "A live dashboard plus deep reports across attendance, marks, payroll and fees — export to CSV or PDF instantly.",
    icon: BarChart2,
    gradient: "linear-gradient(135deg,#2d7a4a,#1f5d36)",
    color: "#2d7a4a",
    whoCanUse: [
      { role: "Admins",    why: "Institute-wide dashboards and exports." },
      { role: "Department heads", why: "Drill into their department's KPIs." },
      { role: "Finance",   why: "Run revenue, outstanding and payroll reports." },
    ],
    features: [
      { title: "Live dashboards",  desc: "At-a-glance KPIs for attendance, collection, payroll and marks." },
      { title: "Deep reports",     desc: "Filterable, saveable reports across every module." },
      { title: "Exports",          desc: "CSV and PDF on every table — with one click." },
      { title: "Role-aware views", desc: "Each role sees only what they're entitled to." },
    ],
    highlights: [
      "Live KPIs",
      "Cross-module reports",
      "One-click exports",
      "Role-aware drilldowns",
    ],
  },
  {
    slug: "announcements",
    name: "Announcements",
    tagline: "Get the word out, right now.",
    summary:
      "Broadcast updates to targeted roles, batches or departments — with priority levels and read tracking.",
    icon: Bell,
    gradient: "linear-gradient(135deg,#4f9268,#2d7a4a)",
    color: "#4f9268",
    whoCanUse: [
      { role: "Admins",   why: "Institute-wide announcements and emergencies." },
      { role: "Teachers", why: "Class- and batch-level updates." },
      { role: "Everyone", why: "Receive targeted announcements with priority flags." },
    ],
    features: [
      { title: "Targeted delivery", desc: "By role, department, batch or individual user." },
      { title: "Priority levels",   desc: "Info / Important / Urgent — each styled differently." },
      { title: "Scheduling",        desc: "Queue announcements to go live at a future time." },
      { title: "Read tracking",     desc: "See who has seen an announcement." },
    ],
    highlights: [
      "Role-targeted",
      "Priority levels",
      "Scheduled delivery",
      "Read receipts",
    ],
  },
];

export function getModule(slug: string) {
  return MODULES.find((m) => m.slug === slug);
}
