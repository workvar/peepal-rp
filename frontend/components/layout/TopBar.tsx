"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useTerminology } from "@/store/hooks/useTerminology";
import NotificationBell from "@/components/layout/NotificationBell";
import UserMenu from "@/components/layout/UserMenu";
import GlobalSearch from "@/components/layout/search/GlobalSearch";
import MobileSidebar from "@/components/layout/sidebar/MobileSidebar";
import { Home, ChevronRight, Menu } from "lucide-react";
import { getModuleName } from "@/lib/moduleConfig";

export default function TopBar() {
  const pathname  = usePathname();
  const { tenantSlug } = useAppSelector((s) => s.auth);
  const terminology = useTerminology();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const homeHref = tenantSlug ? `/${tenantSlug}/dashboard` : "/login";
  const isHome   = tenantSlug ? pathname === `/${tenantSlug}/dashboard` : false;
  const modName  = getModuleName(pathname, tenantSlug ?? undefined, terminology);

  return (
    <>
      <header className="shrink-0 flex items-center gap-3 px-4 lg:px-5 py-3 z-40 transition-colors duration-200 topbar-header border-b border-border">
        {/* ── Left: mobile menu + breadcrumb ─────────────────────────── */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu size={20} />
          </button>

          <Link
            href={homeHref}
            className="hidden sm:flex shrink-0 items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-150 bg-primary/10 text-primary hover:bg-primary/15"
          >
            <Home size={12} />
            Home
          </Link>
          {!isHome && (
            <>
              <ChevronRight size={13} className="hidden sm:block shrink-0 text-muted-foreground" />
              <span className="text-sm font-semibold truncate max-w-[120px] sm:max-w-[160px] text-foreground">
                {modName}
              </span>
            </>
          )}
        </div>

        {/* ── Center: global search ──────────────────────────────────── */}
        <div className="flex-1 flex justify-center px-2">
          <GlobalSearch />
        </div>

        {/* ── Right: notifications + avatar ──────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <MobileSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
