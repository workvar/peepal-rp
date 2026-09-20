"use client";

import { useEffect } from "react";

/**
 * SmoothScroll — initialises lenis after first paint via a dynamic import.
 *
 * Native browser scrolling works fine without lenis; the library only
 * adds inertia/easing. By loading it lazily we keep its bytes off the
 * critical path: the marketing page renders, becomes interactive, and
 * lenis is fetched and started afterwards.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let raf = 0;
    let lenisInstance: { raf(t: number): void; destroy(): void } | null = null;
    let cancelled = false;

    // Skip smooth scroll entirely if the user prefers reduced motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenisInstance = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.2,
      });

      const tick = (time: number) => {
        lenisInstance?.raf(time);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenisInstance?.destroy();
    };
  }, []);

  return <>{children}</>;
}
