"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

export interface RevealProps {
  children: ReactNode;
  delay?: number;     // seconds
  distance?: number;  // px translate-y while hidden
  duration?: number;  // seconds
  as?: ElementType;
  className?: string;
}

/**
 * Reveal — fade + translate-up when the element scrolls into view.
 *
 * Previously implemented with framer-motion's <motion.div whileInView>.
 * Framer Motion ships ~50 KB gzip and was pulled into every marketing
 * page just to animate opacity and a 12 px y-offset. IntersectionObserver
 * plus a single CSS transition produces the same effect with zero deps.
 */
export default function Reveal({
  children,
  delay = 0,
  distance = 12,
  duration = 0.4,
  as: Comp = "div",
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour prefers-reduced-motion: render in final state immediately.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "-12% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: React.CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : `translateY(${distance}px)`,
    transition: `opacity ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
    willChange: "opacity, transform",
  };

  return (
    <Comp ref={ref as React.Ref<HTMLElement>} className={className} style={style}>
      {children}
    </Comp>
  );
}
