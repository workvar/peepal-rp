"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Code2, Users as UsersIcon, BookOpen } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

/** Left rail nav for the /docs section. Stays visible across dev / users pages. */
export default function SideNav() {
  const pathname = usePathname();
  const params = useParams();
  const tenant = params.tenant as string;

  const items: NavItem[] = [
    { href: `/${tenant}/docs`,       label: "Overview",     icon: BookOpen,  description: "Welcome & roadmap" },
    { href: `/${tenant}/docs/users`, label: "User Guide",   icon: UsersIcon, description: "How to use each feature" },
    { href: `/${tenant}/docs/dev`,   label: "Developer",    icon: Code2,     description: "Architecture & internals" },
  ];

  return (
    <nav className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground px-3 mb-2">
        Documentation
      </div>
      {items.map((it) => {
        const active = pathname === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
              active
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-transparent hover:bg-muted/60 text-foreground"
            }`}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{it.label}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {it.description}
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
