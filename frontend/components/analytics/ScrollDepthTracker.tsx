"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackScrollDepth } from "@/lib/analytics/events";

const THRESHOLDS = [25, 50, 75, 100] as const;
type Threshold = (typeof THRESHOLDS)[number];

/**
 * ScrollDepthTracker — fires `scroll_depth` exactly once per threshold
 * (25/50/75/100%) per pathname. Mount it inside any long-form layout
 * (MarketingShell does this for us) and it Just Works.
 *
 * Implementation notes:
 *   - Uses passive scroll listener (no jank).
 *   - Resets the "fired" set when pathname changes so a user reading
 *     /modules/students AND /modules/payroll gets two distinct funnels.
 *   - Skipped on pages shorter than 1.2× the viewport — there's nothing
 *     meaningful to track.
 */
export default function ScrollDepthTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const fired = new Set<Threshold>();

    const measure = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= window.innerHeight * 0.2) return; // page too short
      const pct = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      for (const t of THRESHOLDS) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          trackScrollDepth({ page_path: pathname, percent_scrolled: t });
        }
      }
    };

    // Schedule via rAF so we don't fire mid-paint.
    let pending = false;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        measure();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Run once after mount so a user landing on a short page that's
    // already 100% in view registers the event.
    measure();

    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
