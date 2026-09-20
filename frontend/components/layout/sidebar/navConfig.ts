import {
  LayoutDashboard, Users, UserCog, GraduationCap, CalendarCheck,
  BookOpen, FileText, Settings, Building, Calendar,
  Shield, ShieldCheck, User, ClipboardList, BarChart2, AlertTriangle,
  CalendarX, DollarSign, Sliders, CreditCard, Megaphone, Bell,
  PieChart, TrendingUp, LayoutGrid, Hotel, Bus, Award, Download,
  Sparkles, Network, GitBranch, Inbox, Mail, ListChecks, ListTree,
  Stethoscope, ClipboardPlus, HeartPulse, Pill, CalendarClock,
  FlaskConical, ScanLine, BedDouble, DoorOpen,
  HeartHandshake, FileCheck2, Boxes, Scissors, Siren,
  Droplet, Ambulance, Utensils, Video, Share2, ScrollText, Activity,
  ShoppingCart, Store, FileQuestion, TicketCheck,
} from "lucide-react";
import type { Role } from "@/types";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
};

export type NavSection = {
  id: string;
  label: string | null; // null = top section (no header)
  items: NavItem[];
  // restrict the whole section to certain roles
  roles?: Role[];
};

// Top-level items (no section header)
const topItems: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",              icon: LayoutDashboard, roles: ["admin","teacher","student","staff","super_admin","patient"] },
  { label: "Ask PeepalAI",  href: "/ask",                    icon: Sparkles,        roles: ["admin","teacher","student","staff","super_admin","patient"] },
  { label: "My Portal",     href: "/portal",                 icon: User,            roles: ["student"] },
  { label: "My Fees",       href: "/portal/fees",            icon: CreditCard,      roles: ["student"] },
  { label: "My Hall Tickets", href: "/portal/hall-tickets",  icon: TicketCheck,     roles: ["student"] },
  { label: "Admins",        href: "/admins",                 icon: Users,           roles: ["admin","super_admin"] },
  { label: "Employees",     href: "/employees",              icon: UserCog,         roles: ["admin","staff","super_admin"] },
  { label: "Students",      href: "/students",               icon: GraduationCap,   roles: ["admin","teacher","super_admin"] },
  { label: "My Approvals",  href: "/my-approvals",           icon: Inbox,           roles: ["admin","teacher","staff","super_admin"] },
  { label: "Org Structure", href: "/organization-structure", icon: Network,         roles: ["admin","teacher","staff","super_admin"] },
];

const attendanceItems: NavItem[] = [
  { label: "Attendance",    href: "/attendance",          icon: CalendarCheck, roles: ["admin","teacher","staff","student","super_admin"] },
  { label: "Att. Summary",  href: "/attendance/summary",  icon: BarChart2,     roles: ["admin","teacher","super_admin"] },
  { label: "Shortage List", href: "/attendance/shortage", icon: AlertTriangle, roles: ["admin","super_admin"] },
  { label: "Att. Export",   href: "/attendance/export",   icon: Download,      roles: ["admin","super_admin"] },
];

const academicItems: NavItem[] = [
  { label: "Marks",          href: "/marks",              icon: BookOpen,      roles: ["admin","teacher","student","super_admin"] },
  { label: "Results",        href: "/results",            icon: Award,         roles: ["admin","teacher","student","super_admin"] },
  { label: "Courses",        href: "/academic/courses",   icon: GraduationCap, roles: ["admin","teacher","super_admin"] },
  { label: "Subjects",       href: "/academic/subjects",  icon: BookOpen,      roles: ["admin","teacher","super_admin"] },
  { label: "Curriculum",     href: "/academic/curriculum", icon: ListTree,     roles: ["admin","super_admin"] },
  { label: "Exams",          href: "/academic/exam-types", icon: ListChecks,   roles: ["admin","teacher","super_admin"] },
  { label: "Exam Schedules", href: "/academic/exams",     icon: ClipboardList, roles: ["admin","teacher","super_admin"] },
  { label: "Timetable",      href: "/timetable",          icon: LayoutGrid,    roles: ["admin","teacher","student","staff","super_admin"] },
];

// Exam cell (Phase 5). Education-only, surfaced through the industry map in
// lib/access.ts the same way the academic section is.
const examCellItems: NavItem[] = [
  { label: "Question Bank",   href: "/academic/question-bank",   icon: FileQuestion, roles: ["admin","teacher","super_admin"] },
  { label: "Question Papers", href: "/academic/question-papers", icon: FileText,     roles: ["admin","teacher","super_admin"] },
  { label: "Hall Tickets",    href: "/academic/hall-tickets",    icon: TicketCheck,  roles: ["admin","staff","super_admin"] },
];

// Healthcare-industry section. Visibility is driven by canViewHref → the
// industry map in lib/access.ts + backend myAccess, so education tenants
// never see these (and hospital tenants never see the academic sections).
// The clinical modules are large, so they are split into several smaller
// collapsible groups (each is its own NAV_SECTIONS entry) for easier scanning.

// Front-desk & patient flow.
const clinicalCareItems: NavItem[] = [
  { label: "Patients",     href: "/patients",     icon: HeartPulse,    roles: ["admin","teacher","staff","super_admin"] },
  { label: "Appointments", href: "/appointments", icon: Stethoscope,   roles: ["admin","teacher","staff","super_admin"] },
  { label: "OPD Visits",   href: "/encounters",   icon: ClipboardPlus, roles: ["admin","teacher","staff","super_admin"] },
  { label: "Admissions",   href: "/ipd",          icon: DoorOpen,      roles: ["admin","teacher","staff","super_admin"] },
  { label: "Schedules",    href: "/schedules",    icon: CalendarClock, roles: ["admin","teacher","staff","super_admin"] },
];

// Diagnostic services.
const clinicalDiagnosticsItems: NavItem[] = [
  { label: "Laboratory",   href: "/laboratory",   icon: FlaskConical,  roles: ["admin","teacher","staff","super_admin"] },
  { label: "Radiology",    href: "/radiology",    icon: ScanLine,      roles: ["admin","teacher","staff","super_admin"] },
];

// Ward, theatre & emergency operations.
const clinicalWardItems: NavItem[] = [
  { label: "Nursing",      href: "/nursing",      icon: HeartHandshake, roles: ["admin","teacher","staff","super_admin"] },
  { label: "OT Schedule",  href: "/ot",           icon: Scissors,      roles: ["admin","teacher","staff","super_admin"] },
  { label: "Triage",       href: "/triage",       icon: Siren,         roles: ["admin","teacher","staff","super_admin"] },
];

// Ancillary & patient-support services.
const clinicalSupportItems: NavItem[] = [
  { label: "Blood Bank",   href: "/bloodbank",    icon: Droplet,       roles: ["admin","staff","super_admin"] },
  { label: "Ambulance",    href: "/ambulance",    icon: Ambulance,     roles: ["admin","staff","super_admin"] },
  { label: "Dietary",      href: "/dietary",      icon: Utensils,      roles: ["admin","teacher","staff","super_admin"] },
  { label: "Telemedicine", href: "/telemedicine", icon: Video,         roles: ["admin","teacher","staff","super_admin"] },
  { label: "Referrals",    href: "/referrals",    icon: Share2,        roles: ["admin","teacher","staff","super_admin"] },
];

// Revenue cycle.
const clinicalBillingItems: NavItem[] = [
  { label: "Billing",      href: "/billing",      icon: CreditCard,    roles: ["admin","staff","super_admin"] },
  { label: "Claims",       href: "/claims",       icon: FileCheck2,    roles: ["admin","staff","super_admin"] },
];

// Patient self-service (role-locked to patient, like the student portal), plus
// the clinician's own calendar (role-locked to teacher/staff).
const patientPortalItems: NavItem[] = [
  { label: "My Health",   href: "/my-health",   icon: Activity,      roles: ["patient"] },
  { label: "My Schedule", href: "/my-schedule", icon: CalendarClock, roles: ["teacher","staff"] },
];

const leavesItems: NavItem[] = [
  { label: "Leaves",      href: "/leaves",      icon: FileText, roles: ["admin","teacher","staff","super_admin"] },
  { label: "Leave Types", href: "/leave-types", icon: FileText, roles: ["admin","super_admin"] },
];

const payrollItems: NavItem[] = [
  { label: "Payroll",             href: "/payroll",            icon: DollarSign, roles: ["admin","teacher","staff","super_admin"] },
  { label: "Salary Templates",    href: "/salary/templates",   icon: Sliders,    roles: ["admin","super_admin"] },
  { label: "Salary Assignments",  href: "/salary/assignment",  icon: Users,      roles: ["admin","super_admin"] },
];

const feesItems: NavItem[] = [
  { label: "Fee Categories",  href: "/fees/categories",  icon: FileText,   roles: ["admin","super_admin"] },
  { label: "Fee Add-ons",     href: "/fees/addons",      icon: Sliders,    roles: ["admin","super_admin"] },
  { label: "Fee Structures",  href: "/fees/structures",  icon: Sliders,    roles: ["admin","super_admin"] },
  { label: "Fee Allocations", href: "/fees/allocations", icon: Sliders,    roles: ["admin","super_admin"] },
  { label: "Fee Payments",    href: "/fees/payments",    icon: CreditCard, roles: ["admin","staff","super_admin"] },
  { label: "Student Fees",    href: "/fees/students",    icon: Bell,       roles: ["admin","staff","super_admin"] },
  { label: "Fee Overview",    href: "/fees/overview",    icon: DollarSign, roles: ["admin","staff","super_admin"] },
];

const financeItems: NavItem[] = [
  { label: "Chart of Accounts", href: "/finance/chart-of-accounts", icon: ListTree,   roles: ["admin","super_admin"] },
  { label: "General Ledger",    href: "/finance/ledger",            icon: BookOpen,    roles: ["admin","super_admin"] },
  { label: "Receivables",       href: "/finance/ar",                icon: TrendingUp,  roles: ["admin","super_admin"] },
  { label: "Payables",          href: "/finance/ap",                icon: CreditCard,  roles: ["admin","super_admin"] },
];

const reportsItems: NavItem[] = [
  { label: "Attendance", href: "/reports/attendance", icon: BarChart2,  roles: ["admin","super_admin"] },
  { label: "Marks",      href: "/reports/marks",      icon: PieChart,   roles: ["admin","super_admin"] },
  { label: "Fees",       href: "/reports/fees",       icon: TrendingUp, roles: ["admin","super_admin"] },
  { label: "Payroll",    href: "/reports/payroll",    icon: TrendingUp, roles: ["admin","super_admin"] },
  { label: "Leaves",     href: "/reports/leaves",     icon: BarChart2,  roles: ["admin","super_admin"] },
];

// Configurable physical facilities. Item visibility is industry-filtered
// (canViewHref → lib/access.ts + myAccess), so an education tenant sees
// Hostel/Transport/Library while a hospital sees Wards & Beds — from the same
// section, under one neutral "Facilities" heading.
const facilitiesItems: NavItem[] = [
  { label: "Hostel",      href: "/hostel",    icon: Hotel,     roles: ["admin","staff","super_admin"] },
  { label: "Transport",   href: "/transport", icon: Bus,       roles: ["admin","staff","super_admin"] },
  { label: "Library",     href: "/library",   icon: BookOpen,  roles: ["admin","teacher","staff","student","super_admin"] },
  { label: "Wards & Beds", href: "/wards",    icon: BedDouble, roles: ["admin","staff","super_admin"] },
];

const campusItems: NavItem[] = [
  { label: "Events",    href: "/events",    icon: Calendar, roles: ["admin","teacher","student","staff","super_admin"] },
];

const learningItems: NavItem[] = [
  { label: "Goal Library",       href: "/learning",             icon: Sparkles, roles: ["admin","super_admin"] },
  { label: "Assignments",        href: "/learning/assignments", icon: Users,    roles: ["admin","super_admin"] },
  { label: "My Learning",        href: "/learning/my-goals",    icon: BookOpen, roles: ["admin","teacher","staff","student","super_admin"] },
];

const communicationItems: NavItem[] = [
  { label: "Announcements", href: "/announcements", icon: Megaphone, roles: ["admin","teacher","student","staff","super_admin"] },
  { label: "Notifications", href: "/notifications", icon: Bell,      roles: ["admin","teacher","student","staff","super_admin"] },
];

const orgItems: NavItem[] = [
  { label: "Org Profile",    href: "/org/profile",        icon: Settings,  roles: ["admin","super_admin"] },
  { label: "Departments",    href: "/org/departments",    icon: Building,  roles: ["admin","super_admin"] },
  { label: "Academic Years", href: "/org/academic-years", icon: Calendar,  roles: ["admin","super_admin"] },
  { label: "Roles",          href: "/org/roles",          icon: Shield,      roles: ["admin","super_admin"] },
  { label: "Access Control", href: "/org/access-control", icon: ShieldCheck, roles: ["admin","super_admin"] },
  { label: "Audit Trail",    href: "/audit",              icon: ScrollText, roles: ["admin","super_admin"] },
  { label: "Email",          href: "/org/email",          icon: Mail,      roles: ["admin","super_admin"] },
  { label: "Holidays",       href: "/org/holidays",       icon: CalendarX, roles: ["admin","super_admin"] },
  { label: "Calendar",       href: "/calendar",           icon: Calendar,  roles: ["admin","super_admin"] },
  { label: "Approval Types", href: "/approval-types",     icon: Sliders,   roles: ["admin","super_admin"] },
  { label: "Approval Flows", href: "/approval-flows",     icon: GitBranch, roles: ["admin","super_admin"] },
];

// Inventory & supply chain — pharmacy stock, central stores, and the procurement
// items that feed them. Pharmacy/Stores are healthcare-gated (canViewHref), so a
// non-healthcare tenant only sees Vendors/Purchase Orders here — hence the
// section is relabelled "Procurement" outside healthcare (see navSectionLabels).
const inventoryItems: NavItem[] = [
  { label: "Pharmacy",        href: "/pharmacy",                  icon: Pill,         roles: ["admin","staff","super_admin"] },
  { label: "Stores",          href: "/inventory",                 icon: Boxes,        roles: ["admin","staff","super_admin"] },
  { label: "Vendors",         href: "/org/vendors",               icon: Store,        roles: ["admin","staff","super_admin"] },
  { label: "Purchase Orders", href: "/inventory/purchase-orders", icon: ShoppingCart, roles: ["admin","staff","super_admin"] },
];

const profileItems: NavItem[] = [
  { label: "My Profile", href: "/profile", icon: User, roles: ["admin","teacher","student","staff","super_admin","patient"] },
];

export const NAV_SECTIONS: NavSection[] = [
  { id: "top",           label: null,              items: topItems },
  { id: "patient",       label: null,              items: patientPortalItems },
  { id: "attendance",    label: "Attendance",      items: attendanceItems },
  { id: "academic",      label: "Academic",        items: academicItems },
  { id: "exam-cell",     label: "Exam Cell",       items: examCellItems },
  { id: "clinical-care",        label: "Patient Care",       items: clinicalCareItems },
  { id: "clinical-diagnostics", label: "Diagnostics",        items: clinicalDiagnosticsItems },
  { id: "clinical-ward",        label: "Ward & Theatre",     items: clinicalWardItems },
  { id: "clinical-support",     label: "Support Services",   items: clinicalSupportItems },
  { id: "clinical-billing",     label: "Billing & Claims",   items: clinicalBillingItems },
  { id: "inventory",     label: "Inventory",       items: inventoryItems },
  { id: "leaves",        label: "Leaves",          items: leavesItems },
  { id: "payroll",       label: "Payroll",         items: payrollItems },
  { id: "fees",          label: "Fees",            items: feesItems },
  { id: "finance",       label: "Finance",         items: financeItems },
  { id: "reports",       label: "Reports",         items: reportsItems, roles: ["admin","super_admin"] },
  { id: "facilities",    label: "Facilities",      items: facilitiesItems },
  { id: "campus",        label: "Campus Life",     items: campusItems },
  { id: "learning",      label: "Learning",        items: learningItems },
  { id: "communication", label: "Communication",   items: communicationItems },
  { id: "org",           label: "Organisation",    items: orgItems, roles: ["admin","super_admin"] },
  { id: "profile",       label: null,              items: profileItems },
];
