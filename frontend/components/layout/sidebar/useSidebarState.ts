"use client";

import { useCallback, useEffect, useState } from "react";

const COLLAPSED_KEY = "peepal:sidebar:collapsed";
const SECTIONS_KEY  = "peepal:sidebar:sections";

/**
 * Owns the two persisted bits of state used by the sidebar:
 *   - whether the whole rail is collapsed
 *   - which section accordions are open
 *
 * Persists to localStorage so the layout doesn't jump between visits.
 */
export function useSidebarState(defaultOpenSections: string[]) {
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(defaultOpenSections.map((id) => [id, true])),
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once, on mount.
  useEffect(() => {
    try {
      const c = localStorage.getItem(COLLAPSED_KEY);
      if (c !== null) setCollapsed(c === "1");

      const raw = localStorage.getItem(SECTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setOpenSections((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      /* ignore — localStorage may be unavailable */
    }
    setHydrated(true);
  }, []);

  // Persist collapsed flag
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0"); } catch {/* noop */}
  }, [collapsed, hydrated]);

  // Persist section state
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(openSections)); } catch {/* noop */}
  }, [openSections, hydrated]);

  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isSectionOpen = useCallback(
    (id: string) => openSections[id] ?? false,
    [openSections],
  );

  return { collapsed, toggleCollapsed, isSectionOpen, toggleSection, hydrated };
}
