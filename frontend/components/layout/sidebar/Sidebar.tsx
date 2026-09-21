"use client";

import { usePathname } from "next/navigation";

import { useAccess } from "@/lib/useAccess";
import { Logo } from "@/components/ui/Logo";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_SECTIONS, type NavItem } from "./navConfig";
import { useSidebarState } from "./useSidebarState";
import SidebarSection from "./SidebarSection";
import SidebarFooter from "./SidebarFooter";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { sectionLabel, itemLabel } from "./navSectionLabels";
import { useTerminology, useTenantType } from "@/store/hooks/useTerminology";

// Sections expanded by default on first visit.
const DEFAULT_OPEN = ["top", "attendance", "academic", "clinical-care", "inventory", "leaves", "profile"];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { canViewHref } = useAccess();
  const terms = useTerminology();
  const tenantType = useTenantType();

  const { collapsed, toggleCollapsed, isSectionOpen, toggleSection } =
    useSidebarState(DEFAULT_OPEN);

  // Item visibility is matrix-driven (myAccess), falling back to each item's
  // static roles before the matrix loads. Sections appear when they end up with
  // at least one visible item, so a granted module surfaces its section too.
  const visibleItems = (items: NavItem[]) =>
    items.filter((item) => canViewHref(item.href, item.roles));

  // Headers are relabelled per industry so a surviving section never carries
  // education wording into another vertical.
  const sections = NAV_SECTIONS
    .map((s) => ({
      ...s,
      label: sectionLabel(s.id, s.label, terms, tenantType),
      items: visibleItems(s.items).map((item) => ({
        ...item,
        label: itemLabel(item.href, item.label, terms),
      })),
    }))
    .filter((s) => s.items.length > 0);

  // First URL segment is the tenant slug, e.g. /acme/attendance → "acme".
  const tenant = pathname.split("/").filter(Boolean)[0] ?? "";

  // nav hrefs are tenant-less (/attendance); prefix the current tenant so
  // links resolve to /{tenant}/{module} instead of /{module}.
  const resolveHref = (href: string) => (tenant ? `/${tenant}${href}` : href);

  // Path relative to the tenant prefix, e.g. /acme/attendance/summary → /attendance/summary
  const relPath = "/" + pathname.split("/").filter(Boolean).slice(1).join("/");

  // Highlight only the single deepest matching link so a parent (/attendance)
  // doesn't light up alongside its child (/attendance/summary).
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const bestMatch = allHrefs
    .filter((h) => relPath === h || relPath.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const isActive = (href: string) => href === bestMatch;

  return (
    <aside
      aria-label="Main navigation"
      className="h-screen flex flex-col shrink-0 overflow-hidden transition-[width] duration-200"
      style={{
        width: collapsed ? "4.5rem" : "16rem",
        background: "rgb(var(--secondary))",
        borderRight: "1px solid rgb(var(--border))",
      }}
    >
      {/* ── Logo + collapse toggle ─────────────────────────── */}
      <div className={`flex items-center border-b border-border ${collapsed ? "justify-center px-2 py-4" : "justify-between px-5 py-4"}`}>
        {!collapsed && (
          <div>
            <Logo withText size={30} />
            <p className="text-[10px] text-muted-foreground mt-1 ml-[38px] leading-none font-medium tracking-wide">
              One platform. Every workflow.
            </p>
          </div>
        )}
        {collapsed && <Logo size={28} />}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          className={`text-muted-foreground hover:text-foreground transition-colors ${collapsed ? "mt-2" : ""}`}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* ── User chip / workspace switcher ─────────────────── */}
      {/* Renders as a plain identity chip for single-role users, and as a
          picker for anyone holding more than one role. */}
      <WorkspaceSwitcher collapsed={collapsed} />

      {/* ── Nav ────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-1">
        {sections.map((s) => (
          <SidebarSection
            key={s.id}
            id={s.id}
            label={s.label}
            items={s.items}
            collapsed={collapsed}
            open={isSectionOpen(s.id)}
            onToggle={toggleSection}
            isActive={isActive}
            resolveHref={resolveHref}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
