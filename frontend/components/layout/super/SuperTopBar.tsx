"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChevronRight } from "lucide-react";
import UserMenu from "@/components/layout/UserMenu";
import SuperSearch from "./SuperSearch";
import { SUPER_NAV } from "./superNav";

// Super-admin top bar: breadcrumb + settings search + user menu, mirroring the
// tenant TopBar so both consoles feel the same.
export default function SuperTopBar() {
  const pathname = usePathname();
  const current = SUPER_NAV.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
  );
  const isHome = pathname === "/super/dashboard";

  return (
    <header className="shrink-0 flex items-center gap-3 px-4 lg:px-5 py-3 z-40 topbar-header border-b border-border">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <Link
          href="/super/dashboard"
          className="hidden sm:flex shrink-0 items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-all duration-150"
        >
          <Home size={12} /> Home
        </Link>
        {!isHome && current && (
          <>
            <ChevronRight size={13} className="hidden sm:block shrink-0 text-muted-foreground" />
            <span className="text-sm font-semibold truncate max-w-[160px] text-foreground">
              {current.label}
            </span>
          </>
        )}
      </div>

      {/* Center: search */}
      <div className="flex-1 flex justify-center px-2">
        <SuperSearch />
      </div>

      {/* Right: user menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <UserMenu />
      </div>
    </header>
  );
}
