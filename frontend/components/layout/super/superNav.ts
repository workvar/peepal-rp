import {
  LayoutDashboard,
  Building2,
  Package,
  CreditCard,
  ShieldCheck,
  BookText,
  Database,
  Boxes,
  Mail,
  Sparkles,
  FileText,
  type LucideIcon,
} from "lucide-react";

export interface SuperNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  keywords?: string[];
}

// Single source of truth for super-admin destinations, consumed by both the
// sidebar and the top search so they never drift.
export const SUPER_NAV: SuperNavItem[] = [
  { label: "Dashboard",      href: "/super/dashboard",     icon: LayoutDashboard, description: "Platform overview & stats",      keywords: ["home", "overview", "metrics"] },
  { label: "Organisations",  href: "/super/tenants",       icon: Building2,       description: "Manage tenant organisations",   keywords: ["tenants", "orgs", "companies", "institutes", "schools"] },
  { label: "Plans",          href: "/super/plans",         icon: Package,         description: "Subscription plan templates",   keywords: ["pricing", "tiers", "packages"] },
  { label: "Subscriptions",  href: "/super/subscriptions", icon: CreditCard,      description: "Assign plans, quotas & billing", keywords: ["billing", "assign", "quota", "modules", "override"] },
  { label: "Module Config",  href: "/super/modules",       icon: Boxes,           description: "Define modules & map pages to them", keywords: ["modules", "configurator", "mapping", "pages", "gating", "settings"] },
  { label: "Email",          href: "/super/email",         icon: Mail,            description: "Platform SMTP / email settings", keywords: ["email", "smtp", "mail", "invites", "notifications"] },
  { label: "Brochure",       href: "/super/brochure",      icon: FileText,        description: "Edit the public product brochure", keywords: ["brochure", "marketing", "pdf", "public", "product"] },
  { label: "Admins",         href: "/super/admins",        icon: ShieldCheck,     description: "Manage super admin accounts",   keywords: ["super admin", "accounts", "staff"] },
  { label: "Ask PeepalAI",   href: "/super/ask",           icon: Sparkles,        description: "Natural-language data questions", keywords: ["ai", "ask", "query", "nl", "sql", "peepal"] },
  { label: "Technical Docs", href: "/super/tech-docs",     icon: BookText,        description: "Architecture & chapter docs",   keywords: ["documentation", "guide", "reference"] },
  { label: "DB Visualizer",  href: "/super/db-visualizer", icon: Database,        description: "Interactive schema explorer",   keywords: ["database", "schema", "tables", "erd", "models"] },
];
