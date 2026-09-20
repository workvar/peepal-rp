"use client";

import { useEffect, useRef } from "react";
import { trackFilterApply, trackSearch } from "./events";
import type { FilterParams, SearchParams } from "./types";

/**
 * Debounce-fire a `search` event whenever a query value settles. Wire
 * this into existing search inputs without changing their behaviour:
 *
 *   const [q, setQ] = useState("");
 *   useTrackedSearch({ query: q, location: "students_list" });
 *
 * The hook only fires after the user has stopped typing for `delay`
 * ms (default 700) and skips empty/cleared queries so we don't flood
 * GA with one event per keystroke.
 */
export function useTrackedSearch(opts: {
  query: string;
  location: string;
  resultCount?: number;
  delay?: number;
}): void {
  const { query, location, resultCount, delay = 700 } = opts;
  const lastFired = useRef<string>("");

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed === lastFired.current) return;
    const t = window.setTimeout(() => {
      const params: SearchParams = {
        search_term: trimmed,
        location,
        ...(typeof resultCount === "number" ? { result_count: resultCount } : {}),
      };
      trackSearch(params);
      lastFired.current = trimmed;
    }, delay);
    return () => window.clearTimeout(t);
  }, [query, location, resultCount, delay]);
}

/**
 * Fire a `filter_apply` event whenever a filter dict changes. Pass the
 * current filters object; the hook diffs it against the previous render
 * and emits one event per changed key.
 */
export function useTrackedFilters(opts: {
  filters: Record<string, string | number | boolean | null | undefined>;
  location: string;
}): void {
  const { filters, location } = opts;
  const prev = useRef<typeof filters>({});

  useEffect(() => {
    for (const key of Object.keys(filters)) {
      if (prev.current[key] !== filters[key]) {
        const v = filters[key];
        if (v === null || v === undefined || v === "") continue;
        const params: FilterParams = {
          location,
          filter_name: key,
          filter_value: String(v),
        };
        trackFilterApply(params);
      }
    }
    prev.current = { ...filters };
  }, [filters, location]);
}
