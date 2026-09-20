// Single typed source of truth for all editable brochure content. The page and
// the dynamic PDF both render from this shape; the admin editor edits it and
// saves it (serialized JSON) via GraphQL. DEFAULT_CONTENT is the fallback when
// nothing has been saved yet.

export type ModuleItem = {
  name: string;
  tagline: string;
  icon: string; // key into ICON_MAP
};

export type Pillar = { title: string; desc: string };

export type BrochureContent = {
  cover: {
    label: string;
    title1: string;
    title2: string;
    lead: string;
    paragraph: string;
    edition: string;
    builtForLine: string;
    ctaText: string;
    contactEmail: string;
    brand: string;
  };
  why: {
    title: string;
    subhead: string;
    pillars: Pillar[];
    whyTitle: string;
    whyParagraph: string;
  };
  features: {
    title: string;
    subhead: string;
    footer: string;
  };
  modules: ModuleItem[];
  closing: {
    title: string;
    brand: string;
    contactEmail: string;
    ctaText: string;
  };
};

export const DEFAULT_CONTENT: BrochureContent = {
  cover: {
    label: "Peepal · ERP for institutes",
    title1: "Run every team.",
    title2: "Every workflow.",
    lead: "Most institutes run on six tools and a thousand spreadsheets.",
    paragraph:
      "Peepal replaces all of them with a single workspace where attendance, marks, leaves, payroll, fees, announcements and reports finally talk to each other, and to you. One platform. Every workflow. Built for scale, secured by role-based access, and ready on day one.",
    edition: "Edition · 2026",
    builtForLine: "Built for modern institutes",
    ctaText: "Book a demo",
    contactEmail: "info@cybsec.co.in",
    brand: "Peepal",
  },
  why: {
    title: "Built for the people who actually run it.",
    subhead:
      "Multi-tenant, role-based and audit-friendly. Designed for IT & operations.",
    pillars: [
      { title: "Roles & Permissions", desc: "27+ scopes, role-based access end-to-end" },
      { title: "Data Ownership", desc: "Export anything, CSV/PDF baked into every screen" },
      { title: "Audit & Access", desc: "Every action logged, one tenant per institute" },
      { title: "Built to Last", desc: "Multi-tenant · Role-based · Audit-friendly · Modern stack" },
    ],
    whyTitle: "Why Choose Peepal?",
    whyParagraph:
      "Peepal unifies all its modules: students, employees, attendance, marks, leaves, payroll, fees, reports and announcements; under one secure, role-based workspace. Every action is logged, every screen exports to CSV/PDF, and every user sees only the numbers that matter to them. Modern stack, one tenant per institute, zero drama.",
  },
  features: {
    title: "Feature deep dives",
    subhead: "Every module, up close. The workflows your teams live in.",
    footer: "Peepal · Feature deep dives",
  },
  modules: [
    { name: "Student Management", tagline: "Every learner, one profile.", icon: "graduation-cap" },
    { name: "Employee Management", tagline: "People operations, uncomplicated.", icon: "users" },
    { name: "Attendance", tagline: "Mark, see, fix in seconds.", icon: "clock" },
    { name: "Marks & Grades", tagline: "From raw scores to grade sheets.", icon: "bar-chart" },
    { name: "Leave Management", tagline: "Ask. Approve. Track.", icon: "calendar" },
    { name: "Payroll & Salary", tagline: "Run payroll with zero drama.", icon: "wallet" },
    { name: "Fee Collection", tagline: "Know who owes what.", icon: "receipt" },
    { name: "Reports & Analytics", tagline: "Answers, not spreadsheets.", icon: "pie-chart" },
    { name: "Announcements", tagline: "Get the word out, right now.", icon: "megaphone" },
    { name: "Curriculum", tagline: "Map every course, unit by unit.", icon: "book" },
    { name: "Exams & Schedules", tagline: "Plan every paper, every hall.", icon: "clipboard" },
    { name: "Grading Schemes", tagline: "Your scale, live SGPA & CGPA.", icon: "gauge" },
    { name: "Hostel", tagline: "A bed for every student.", icon: "bed" },
    { name: "Transport", tagline: "Routes that run on time.", icon: "bus" },
    { name: "Library", tagline: "Every title, tracked.", icon: "library" },
    { name: "Events", tagline: "Campus life, on a calendar.", icon: "ticket" },
    { name: "Timetable", tagline: "Periods that fit, every section.", icon: "layout-grid" },
    { name: "Organization Structure", tagline: "Who reports to whom.", icon: "network" },
    { name: "Approvals", tagline: "Workflows that just flow.", icon: "git-branch" },
    { name: "Access Control", tagline: "The right eyes only.", icon: "shield" },
    { name: "Notifications", tagline: "Nothing slips through.", icon: "bell" },
    { name: "Holidays & Calendar", tagline: "The whole year at a glance.", icon: "palmtree" },
    { name: "Student & Staff Portals", tagline: "Self-service, sorted.", icon: "layout-dashboard" },
    { name: "Invites & Onboarding", tagline: "Invite, set up, go.", icon: "user-plus" },
    { name: "Subscriptions & Quotas", tagline: "Scale on your terms.", icon: "credit-card" },
  ],
  closing: {
    title: "Run your institute on one operating system.",
    brand: "PEEPAL",
    contactEmail: "info@cybsec.co.in",
    ctaText: "Book a demo today",
  },
};

// Shallow-merge saved JSON over defaults so older/partial saved payloads still
// render. Each top-level section falls back to its default when absent.
export function mergeContent(saved: unknown): BrochureContent {
  if (!saved || typeof saved !== "object") return DEFAULT_CONTENT;
  const s = saved as Partial<BrochureContent>;
  return {
    cover: { ...DEFAULT_CONTENT.cover, ...(s.cover ?? {}) },
    why: {
      ...DEFAULT_CONTENT.why,
      ...(s.why ?? {}),
      pillars: s.why?.pillars?.length ? s.why.pillars : DEFAULT_CONTENT.why.pillars,
    },
    features: { ...DEFAULT_CONTENT.features, ...(s.features ?? {}) },
    modules: Array.isArray(s.modules) && s.modules.length ? s.modules : DEFAULT_CONTENT.modules,
    closing: { ...DEFAULT_CONTENT.closing, ...(s.closing ?? {}) },
  };
}
