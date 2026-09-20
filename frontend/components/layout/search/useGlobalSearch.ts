"use client";

import { useMemo } from "react";
import type { Role } from "@/types";
import { useAppSelector } from "@/store/hooks";
import { moduleAllowedForIndustry } from "@/lib/access";
import { buildSearchIndex, type SearchEntry } from "./searchIndex";

export type ScoredEntry = SearchEntry & { href: string; score: number };

// Lightweight relevance scoring. Higher is better. 0 = no match.
function scoreEntry(entry: SearchEntry, q: string): number {
  const title = entry.title.toLowerCase();
  const desc = (entry.description ?? "").toLowerCase();
  const cat = entry.category.toLowerCase();
  const kw = entry.keywords.join(" ").toLowerCase();

  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  if (entry.keywords.some((k) => k.toLowerCase().startsWith(q))) return 45;
  if (kw.includes(q)) return 35;
  if (desc.includes(q)) return 25;
  if (cat.includes(q)) return 15;
  return 0;
}

/**
 * Filters + ranks the search index for the given query and role, returning
 * tenant-aware hrefs. Empty query yields an empty list (the dropdown then
 * shows a "recent / suggestions" view chosen by the caller).
 */
export function useGlobalSearch(query: string, role: Role | "", tenantSlug: string) {
  const index = useMemo(() => buildSearchIndex(), []);
  // Effective per-module access (subscription gating + role matrix). Drives the
  // same hide logic the sidebar uses so search never surfaces a module the org
  // isn't subscribed to.
  const access = useAppSelector((s) => s.access.myAccess);
  const accessLoaded = useAppSelector((s) => s.access.myAccessLoaded);
  const tenantType = useAppSelector((s) => s.terminology.type);

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    // Hide entries the user can't view. Once myAccess has loaded it is
    // authoritative (a gated module reports canView=false); before then, fall
    // back to the entry's static role list so nothing flashes hidden.
    const allowed = index.filter((e) => {
      // Modules from another industry never surface, matrix or not.
      if (!moduleAllowedForIndustry(e.id, tenantType)) return false;
      if (accessLoaded && access[e.id]) return access[e.id].canView;
      return e.roles.includes(role as Role);
    });

    const withHref = (e: SearchEntry, score: number): ScoredEntry => ({
      ...e,
      score,
      href: tenantSlug ? `/${tenantSlug}${e.baseHref}` : e.baseHref,
    });

    if (!q) {
      // Suggestions when empty: a curated handful of common destinations.
      return allowed.slice(0, 6).map((e) => withHref(e, 0));
    }

    return allowed
      .map((e) => withHref(e, scoreEntry(e, q)))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [index, query, role, tenantSlug, access, accessLoaded, tenantType]);
}
