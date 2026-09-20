"use client";

import { ChevronDown } from "lucide-react";
import SidebarNavLink from "./SidebarNavLink";
import type { NavItem } from "./navConfig";

/**
 * A collapsible accordion group of nav links.
 * When the rail is collapsed (icon-only), sections render flat with no header
 * and no accordion behaviour so every icon stays reachable.
 */
export default function SidebarSection({
  id,
  label,
  items,
  collapsed,
  open,
  onToggle,
  isActive,
  resolveHref,
  onNavigate,
}: {
  id: string;
  label: string | null;
  items: NavItem[];
  collapsed: boolean;
  open: boolean;
  onToggle: (id: string) => void;
  isActive: (href: string) => boolean;
  resolveHref: (href: string) => string;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  const links = items.map((item) => (
    <SidebarNavLink
      key={item.href}
      href={resolveHref(item.href)}
      icon={item.icon}
      label={item.label}
      active={isActive(item.href)}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  ));

  // No header (top / profile groups) or collapsed rail → render links directly.
  if (!label || collapsed) {
    return <div className="space-y-0.5">{links}</div>;
  }

  const sectionHasActive = items.some((i) => isActive(i.href));

  return (
    <div>
      <button
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest transition-colors select-none"
        style={{ color: sectionHasActive ? "rgb(var(--primary))" : "rgb(var(--muted-foreground))" }}
      >
        <span>{label}</span>
        <ChevronDown
          size={13}
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? `${items.length * 44 + 8}px` : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="space-y-0.5 pt-0.5">{links}</div>
      </div>
    </div>
  );
}
