"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useLogout } from "@/store/hooks/useLogout";
import { useTheme } from "@/context/ThemeContext";
import { resolvePhotoUrl } from "@/api/services/uploads";
import { User as UserIcon, LogOut, Sun, Moon, KeyRound } from "lucide-react";

/**
 * UserMenu — circular avatar in the top-right that opens a small dropdown
 * with quick actions: edit profile, change password, theme toggle, logout.
 *
 * Works for both tenant and super-admin contexts. Profile/password links
 * route into the tenant dashboard's profile page when a tenant slug is
 * available; super-admin contexts only get the theme toggle + logout.
 */
export default function UserMenu() {
  const { user, tenantSlug } = useAppSelector((s) => s.auth);
  const { theme, mounted, toggleTheme } = useTheme();
  const logout = useLogout();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!user) return null;

  const photo = resolvePhotoUrl(user.photo_url);
  const initial = user.name?.charAt(0).toUpperCase() ?? "?";
  const profileHref = tenantSlug ? `/${tenantSlug}/profile` : null;

  const handleLogout = () => {
    // Super admins return to their own login; tenant users to the org finder.
    logout(user.role === "super_admin" ? "/super/login" : "/login");
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label="Open user menu"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-all flex items-center justify-center text-white font-bold text-sm"
        style={{ background: photo ? "transparent" : "var(--color-category-violet)" }}
      >
        {photo ? (
          // unoptimized: avatar URLs are user uploads served by our backend
          <Image src={photo} alt={user.name} width={36} height={36} unoptimized className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl shadow-lg border border-border bg-popover text-popover-foreground z-50 overflow-hidden"
          role="menu"
        >
          {/* Header — user identity */}
          <div className="flex items-center gap-3 p-3 border-b border-border">
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: photo ? "transparent" : "var(--color-category-violet)" }}
            >
              {photo ? (
                <Image src={photo} alt={user.name} width={40} height={40} unoptimized className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Items */}
          <div className="py-1">
            {profileHref && (
              <>
                <MenuLink href={profileHref} icon={<UserIcon size={14} />} onSelect={() => setOpen(false)}>
                  Edit profile
                </MenuLink>
                <MenuLink
                  href={`${profileHref}#password`}
                  icon={<KeyRound size={14} />}
                  onSelect={() => setOpen(false)}
                >
                  Change password
                </MenuLink>
              </>
            )}

            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                role="menuitem"
              >
                <span className="flex items-center gap-2">
                  {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                  {theme === "dark" ? "Dark mode" : "Light mode"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Switch to {theme === "dark" ? "light" : "dark"}
                </span>
              </button>
            )}

            <div className="border-t border-border my-1" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              role="menuitem"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onSelect,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
      role="menuitem"
    >
      {icon}
      {children}
    </Link>
  );
}
