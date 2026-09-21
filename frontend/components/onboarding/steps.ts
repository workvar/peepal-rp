import {
  Building2,
  CalendarDays,
  LayoutGrid,
  Megaphone,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface TourStep {
  title: string;
  body: string;
  icon: LucideIcon;
  // Optional call-to-action that takes the admin to a setup page.
  cta?: { label: string; path: string };
  // When set, the step is shown only for those tenant types. Unset = all.
  industries?: string[];
}

// Tour shown to a tenant's admin on the first login.
// Walks through what lives on the dashboard, then nudges the minimum
// setup needed to make the ERP useful (departments → users → year).
export const ONBOARDING_STEPS: TourStep[] = [
  {
    title: "Welcome to your ERP",
    body: "This is your organisation's home base. Every module you need lives one click away. Let's take a quick tour before you set things up.",
    icon: Sparkles,
  },
  {
    title: "Your dashboard at a glance",
    body: "The top of the page greets you and highlights today's numbers — people, occupancy, present/absent counts and pending work. Each stat card links straight into the underlying list.",
    icon: TrendingUp,
  },
  {
    title: "All modules on one grid",
    body: "Below the stats, the module grid shows every page available to your role — grouped by People, Academics, Operations, Finance, Campus, Learning, Reports and Administration. Nothing is hidden in sub-menus.",
    icon: LayoutGrid,
  },
  {
    title: "Announcements & notifications",
    body: "New notices show on the dashboard so your team never misses an update. Post announcements from the Notices tile, or check Notifications for system alerts.",
    icon: Megaphone,
  },
  {
    title: "Step 1 — Create your departments",
    body: "Departments are the backbone of the system. Assign employees and students to departments so attendance, payroll and reports can roll up cleanly.",
    icon: Building2,
    cta: { label: "Open Departments", path: "/org/departments" },
  },
  {
    title: "Step 2 — Configure the academic year",
    body: "Set the current session / academic year so marks, results and timetables land under the right period.",
    icon: CalendarDays,
    cta: { label: "Open Academic Years", path: "/org/academic-years" },
    industries: ["education"],
  },
  {
    title: "Step 3 — Add your employees",
    body: "Create teachers and staff from the Employees page. Each person's login account is created in the same step — no separate user setup. You can bulk upload too.",
    icon: UserPlus,
    cta: { label: "Open Employees", path: "/employees" },
  },
  {
    title: "Step 4 — Enrol your students",
    body: "Add students from the Students page; their login account is created with them. Once people are in, every other module (attendance, marks, payroll) comes to life.",
    icon: Users,
    cta: { label: "Open Students", path: "/students" },
    industries: ["education", "nonprofit"],
  },
  {
    title: "Step 4 — Register your patients",
    body: "Add patients from the Patients page. OPD visits, IPD admissions, appointments and billing all hang off that registry — start here so the rest of the clinical modules have someone to treat.",
    icon: Users,
    cta: { label: "Open Patients", path: "/patients" },
    industries: ["healthcare"],
  },
  {
    title: "You're all set",
    body: "You can re-open this tour any time from the dashboard header. If you skipped setup, start with Departments — the shortcut is right on your dashboard.",
    icon: Sparkles,
  },
];

/** Steps visible for a tenant type. Untagged steps are shared. */
export function onboardingStepsFor(tenantType: string | null | undefined): TourStep[] {
  const t = tenantType || "education";
  return ONBOARDING_STEPS.filter((s) => !s.industries || s.industries.includes(t));
}
