"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// A collapsible card. When `fill` is set and the card is open, it grows to take
// the remaining height of its flex parent (lg+) so its body can scroll instead
// of pushing the column taller than the calendar beside it.
export default function AccordionCard({
  title,
  count,
  defaultOpen = false,
  fill = false,
  bodyClassName = "",
  children,
}: {
  title: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  fill?: boolean;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`card p-0 overflow-hidden flex flex-col ${
        open && fill ? "lg:flex-1 lg:min-h-0" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left select-none shrink-0"
      >
        <span className="flex items-center gap-2 text-lg font-bold">
          {title}
          {typeof count === "number" && (
            <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          className="text-muted-foreground transition-transform duration-200 shrink-0"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>

      {open && (
        <div
          className={`overflow-y-auto px-5 pb-5 ${
            fill ? "flex-1 min-h-0" : ""
          } ${bodyClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
