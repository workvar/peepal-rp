"use client";

// OrgTabs — slim horizontal nav rendered by the /org layout. Each tab is
// a real route (e.g. /org/roles) so URLs stay bookmarkable and the browser
// back button works as expected.

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Settings, Building, Calendar, Shield, CalendarX,
} from "lucide-react";
import { useTenantType } from "@/store/hooks/useTerminology";
import { moduleAllowedForIndustry } from "@/lib/access";

// `module` ties a tab to a BASE_MODULES id so it can be industry-gated the same
// way the sidebar is (e.g. Academic Years is education-only, hidden for hospitals).
type Tab = { label: string; slug: string; icon: React.ElementType; module?: string };

const TABS: Tab[] = [
  { label: "Profile",        slug: "profile",        icon: Settings },
  { label: "Departments",    slug: "departments",    icon: Building },
  { label: "Academic Years", slug: "academic-years", icon: Calendar, module: "academic-years" },
  { label: "Roles",          slug: "roles",          icon: Shield },
  { label: "Holidays",       slug: "holidays",       icon: CalendarX },
];

// Some pages live under /org/* for historical URL reasons but aren't
// Organisation-settings pages (e.g. Vendors is a procurement/inventory module).
// They shouldn't show the org settings tab bar.
const HIDE_ON = ["/org/vendors"];

export default function OrgTabs() {
  const pathname = usePathname() || "";
  const params   = useParams();
  const tenant   = (params?.tenant as string) || "";
  const tenantType = useTenantType();

  if (HIDE_ON.some((p) => pathname.includes(p))) return null;

  const tabs = TABS.filter(
    (t) => !t.module || moduleAllowedForIndustry(t.module, tenantType),
  );

  return (
    <nav className="border-b border-border mb-6 -mt-2 overflow-x-auto">
      <ul className="flex gap-1 min-w-max">
        {tabs.map(({ label, slug, icon: Icon }) => {
          const href   = `/${tenant}/org/${slug}`;
          const active = pathname.endsWith(`/org/${slug}`);
          return (
            <li key={slug}>
              <Link
                href={href}
                className={[
                  "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium",
                  "border-b-2 -mb-px transition-colors whitespace-nowrap",
                  active
                    ? "border-primary-600 text-primary-700 dark:text-primary-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                ].join(" ")}
              >
                <Icon size={15} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
