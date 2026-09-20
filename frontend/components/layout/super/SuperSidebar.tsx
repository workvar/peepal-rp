"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { useLogout } from "@/store/hooks/useLogout";
import { useTheme } from "@/context/ThemeContext";
import { Logo } from "@/components/ui/Logo";
import Switch from "@/components/ui/switch";
import { LogOut, Sun } from "lucide-react";
import { SUPER_NAV } from "./superNav";

// Super-admin sidebar styled to match the tenant dashboard (light theme, Logo,
// user chip, footer with theme toggle + logout). Flat nav — the console has a
// small, fixed set of destinations.
export default function SuperSidebar() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const { theme, mounted, toggleTheme } = useTheme();
  const logout = useLogout();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      aria-label="Super admin navigation"
      className="flex h-screen w-64 flex-col shrink-0 overflow-hidden"
      style={{ background: "rgb(var(--secondary))", borderRight: "1px solid rgb(var(--border))" }}
    >
      {/* Logo */}
      <div className="flex items-center border-b border-border px-5 py-4">
        <div>
          <Logo withText size={30} />
          <p className="text-[10px] text-muted-foreground mt-1 ml-[38px] leading-none font-medium tracking-wide">
            Super Admin Console
          </p>
        </div>
      </div>

      {/* User chip */}
      {user && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-card border border-border">
          <p className="text-sm font-semibold truncate leading-tight text-foreground">{user.name}</p>
          <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium capitalize bg-primary/10 text-primary">
            {user.role.replace("_", " ")}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-1">
        {SUPER_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: theme + logout */}
      <div className="px-3 py-3 space-y-1 border-t border-border">
        {mounted && (
          <div className="flex items-center justify-between px-1 py-2">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sun size={14} className="shrink-0" /> Dark Mode
            </span>
            <Switch checked={theme === "dark"} onChange={toggleTheme} size="sm" />
          </div>
        )}
        <button
          onClick={() => logout("/super/login")}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut size={15} className="shrink-0" /> Logout
        </button>
      </div>
    </aside>
  );
}
