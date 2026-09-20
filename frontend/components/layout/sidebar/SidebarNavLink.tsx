"use client";

import Link from "next/link";

export default function SidebarNavLink({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={`group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 ${
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
      }`}
      style={
        active
          ? { background: "rgb(var(--primary) / 0.10)", color: "rgb(var(--primary))" }
          : { color: "rgb(var(--muted-foreground))" }
      }
    >
      <Icon
        size={collapsed ? 18 : 16}
        className="shrink-0"
        style={{ color: active ? "rgb(var(--primary))" : undefined }}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
