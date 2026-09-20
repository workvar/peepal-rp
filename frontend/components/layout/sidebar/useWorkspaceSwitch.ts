"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { authAPI } from "@/lib/api";
import { workspaceHome } from "@/lib/workspaces";

/**
 * Switching workspaces re-mints the httpOnly auth cookie with a different
 * active role, which invalidates everything the app has cached: the Apollo
 * store, myAccess, the nav tree, every list scoped to the old role.
 *
 * Rather than trying to invalidate each of those, we do a hard navigation to
 * the new workspace's home page. The app reboots against the new cookie, so
 * there is no window in which stale role-scoped data can be rendered.
 */
export function useWorkspaceSwitch() {
  const pathname = usePathname();
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // First URL segment is the tenant slug, e.g. /acme/dashboard → "acme".
  const tenant = pathname.split("/").filter(Boolean)[0] ?? "";

  const switchTo = async (role: string) => {
    if (switching) return;
    setSwitching(role);
    setError(null);
    try {
      await authAPI.switchWorkspace(role);
      const home = workspaceHome(role);
      window.location.href = tenant ? `/${tenant}${home}` : home;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "Could not switch workspace");
      setSwitching(null);
    }
  };

  return { switchTo, switching, error };
}
