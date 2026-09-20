"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Options {
  /** When false, all items render at once (lazy loading disabled). Default true. */
  enabled?: boolean;
  /** Rows rendered initially and added per batch. Default 25. */
  pageSize?: number;
}

/**
 * Incrementally reveals a long list as the user scrolls, so large tables stay
 * responsive. Render `visible` instead of the full array, and drop
 * `sentinelRef` on a trailing element (e.g. a final row); when it scrolls into
 * view the next batch is appended.
 *
 * When `enabled` is false it's a no-op pass-through: `visible === items`.
 */
export function useLazyList<T, E extends HTMLElement = HTMLTableRowElement>(
  items: T[],
  opts: Options = {},
) {
  const { enabled = true, pageSize = 25 } = opts;
  const [count, setCount] = useState(pageSize);
  const sentinelRef = useRef<E | null>(null);

  // Reset the window whenever the list identity or size changes (filtering,
  // refetch, search) so we never show a stale slice.
  useEffect(() => {
    setCount(pageSize);
  }, [items, pageSize]);

  const hasMore = enabled && count < items.length;

  useEffect(() => {
    if (!enabled || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setCount((c) => Math.min(c + pageSize, items.length));
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, hasMore, pageSize, items.length]);

  const visible = useMemo(
    () => (enabled ? items.slice(0, count) : items),
    [enabled, items, count],
  );

  return { visible, sentinelRef, hasMore, shown: visible.length, total: items.length };
}
