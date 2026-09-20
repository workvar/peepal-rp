"use client";

import { useCallback, useEffect, useState } from "react";

// Key is scoped to tenant + user so every org sees it on first login and
// every admin within that org sees it once.
function storageKey(tenantSlug: string, userId: string | number) {
  return `peepal:onboarding:completed:${tenantSlug || "default"}:${userId || "anon"}`;
}

export function useOnboarding(params: {
  tenantSlug: string;
  userId: string | number | undefined;
  role: string;
  // Only tenant admins get the guided journey; other roles can still open it
  // manually but don't see it pop up.
  autoStart?: boolean;
}) {
  const { tenantSlug, userId, role, autoStart = true } = params;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!autoStart) return;
    if (typeof window === "undefined") return;
    if (!userId) return;
    if (role !== "admin") return;
    const seen = localStorage.getItem(storageKey(tenantSlug, userId));
    if (!seen) {
      // Small delay so the dashboard mounts first; feels less jarring.
      const t = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [autoStart, tenantSlug, userId, role]);

  const markComplete = useCallback(() => {
    if (typeof window === "undefined" || !userId) return;
    localStorage.setItem(storageKey(tenantSlug, userId), new Date().toISOString());
  }, [tenantSlug, userId]);

  const close = useCallback(() => {
    markComplete();
    setOpen(false);
  }, [markComplete]);

  const start = useCallback(() => setOpen(true), []);

  return { open, start, close };
}
