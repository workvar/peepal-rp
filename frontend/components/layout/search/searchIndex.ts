import { BASE_MODULES } from "@/constants/navigation/modules";
import type { ModuleDef } from "@/types/general/moduleConfig";

export type SearchEntry = {
  id: string;
  title: string;
  category: string;        // group, used as the result section header
  baseHref: string;
  icon: React.ElementType;
  description?: string;
  keywords: string[];      // extra synonyms for deep matching
  roles: string[];
};

// Synonyms / deep keywords per module id so a search for "present", "salary slip",
// "csv" etc. surfaces the right page even when the word isn't in the label.
const KEYWORDS: Record<string, string[]> = {
  users: ["accounts", "access", "login", "credentials", "create user", "permissions"],
  employees: ["staff", "teachers", "faculty", "hr", "people"],
  students: ["learners", "enrolment", "enrollment", "admission", "roll number"],
  "organization-structure": ["hierarchy", "org chart", "reporting", "find people"],
  marks: ["grades", "score", "marksheet", "gpa", "assessment"],
  results: ["transcript", "report card", "gpa", "exam result"],
  subjects: ["course", "syllabus", "curriculum"],
  exams: ["test", "exam schedule", "datesheet", "examination"],
  timetable: ["schedule", "periods", "classes", "routine"],
  attendance: ["present", "absent", "roll call", "mark attendance", "register"],
  "attendance-summary": ["aggregate", "monthly attendance", "percentage"],
  "attendance-shortage": ["below threshold", "defaulters", "low attendance"],
  "attendance-export": ["download", "csv", "excel", "export attendance"],
  leaves: ["leave request", "time off", "vacation", "apply leave", "approval"],
  "leave-types": ["casual leave", "sick leave", "leave category", "configure leave"],
  "my-approvals": ["pending approval", "inbox", "requests", "approve", "reject"],
  "approval-flows": ["workflow", "approval chain", "multi step", "routing"],
  "approval-types": ["approval category", "request type"],
  payroll: ["salary", "pay", "wages", "payslip", "salary slip", "compensation"],
  "salary-templates": ["pay structure", "salary structure", "ctc"],
  "salary-assignments": ["assign salary", "employee salary"],
  fees: ["fee payment", "tuition", "invoice", "receipt", "collection", "billing"],
  "fee-structures": ["fee plan", "fee setup"],
  "fee-dues": ["outstanding", "pending fees", "arrears", "overdue"],
  "fee-categories": ["fee head", "account head"],
  hostel: ["dormitory", "room", "accommodation", "boarding"],
  transport: ["bus", "route", "vehicle", "pickup"],
  library: ["books", "issue book", "catalogue", "borrow"],
  events: ["calendar", "campus events", "fest", "function"],
  announcements: ["notice", "circular", "broadcast", "memo"],
  notifications: ["alerts", "reminders", "system messages"],
  learning: ["training", "goals", "lms", "course library"],
  "learning-assignments": ["assign training", "assign goals"],
  "my-learning": ["my goals", "my training", "my courses"],
  "reports-attendance": ["attendance analytics", "attendance report"],
  "reports-marks": ["marks analytics", "grade report"],
  "reports-fees": ["fee analytics", "collection report"],
  "reports-payroll": ["payroll analytics", "salary report"],
  "reports-leaves": ["leave analytics", "leave report"],
  org: ["settings", "configuration", "organisation profile", "institute profile"],
  departments: ["dept", "branches", "faculties"],
  "academic-years": ["session", "academic session", "year"],
  roles: ["permissions", "rbac", "access control", "custom roles"],
  holidays: ["holiday list", "day off", "vacation calendar"],
  calendar: ["working days", "half days", "academic calendar"],
  portal: ["self service", "student portal", "my dashboard"],
  profile: ["my account", "settings", "edit profile", "password", "preferences"],
  docs: ["help", "guide", "manual", "documentation"],
};

// Extra "settings" rows that aren't standalone modules but users may search for.
const EXTRA_ENTRIES: SearchEntry[] = [
  {
    id: "settings-theme",
    title: "Appearance & Theme",
    category: "Settings",
    baseHref: "/profile",
    icon: BASE_MODULES.find((m) => m.id === "profile")!.icon,
    description: "Dark mode and display preferences",
    keywords: ["dark mode", "light mode", "theme", "appearance", "display"],
    roles: ["admin", "teacher", "student", "staff", "super_admin"],
  },
];

export function buildSearchIndex(): SearchEntry[] {
  const fromModules: SearchEntry[] = (BASE_MODULES as Omit<ModuleDef, "href">[]).map((m) => ({
    id: m.id,
    title: m.label,
    category: m.group,
    baseHref: m.baseHref,
    icon: m.icon,
    description: m.description,
    keywords: KEYWORDS[m.id] ?? [],
    roles: m.roles,
  }));
  return [...fromModules, ...EXTRA_ENTRIES];
}
