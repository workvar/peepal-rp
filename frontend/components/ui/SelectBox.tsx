"use client";

// SelectBox — opinionated dropdown that matches .input-field styling and
// escapes scrollable modal parents via fixed-position rendering.
//
// Why not the existing <Select>? That one uses `absolute` positioning
// which gets clipped by any ancestor with overflow:hidden/auto — common
// in our scrolling DialogBody. SelectBox computes absolute viewport
// coords from the trigger rect and renders the menu with position:fixed
// so it always floats on top.

import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional secondary line shown under the label (e.g. email). */
  hint?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Optional search box inside the menu — turn on for long lists. */
  searchable?: boolean;
  /** Max height of the open menu in px. Default 280. */
  maxMenuHeight?: number;
  /** Accessible name for the trigger. */
  ariaLabel?: string;
}

export default function SelectBox({
  value, onChange, options, placeholder = "Select…", disabled,
  required, className, searchable = false, maxMenuHeight = 280, ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query, searchable]);

  // Compute fixed-position coords for the menu.
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; flipUp: boolean }>({
    top: 0, left: 0, width: 0, flipUp: false,
  });

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const flipUp = spaceBelow < maxMenuHeight + 16 && spaceAbove > spaceBelow;
    setCoords({
      top: flipUp ? r.top - 6 : r.bottom + 6,
      left: r.left,
      width: r.width,
      flipUp,
    });
  }, [maxMenuHeight]);

  useLayoutEffect(() => { if (open) reposition(); }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => reposition();
    const onResize = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, reposition]);

  // Outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus search when opening if searchable.
  useEffect(() => {
    if (open && searchable) {
      setQuery("");
      setActiveIdx(Math.max(0, filtered.findIndex((o) => o.value === value)));
      setTimeout(() => searchRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchable]);

  // Keep activeIdx within filtered bounds.
  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIdx]);

  const commit = (opt: SelectOption) => {
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIdx];
      if (opt) commit(opt);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        data-required={required || undefined}
        className={cn(
          "input-field flex items-center justify-between text-left",
          !selected && "text-muted-foreground",
          open && "border-primary/50 ring-2 ring-ring/50",
          className,
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={15}
          className={cn(
            "ml-2 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open && typeof window !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          className="fixed z-[60] animate-in fade-in slide-in-from-top-1 duration-100"
          style={{
            top: coords.flipUp ? undefined : coords.top,
            bottom: coords.flipUp ? window.innerHeight - coords.top : undefined,
            left: coords.left,
            width: coords.width,
          }}
        >
          <div
            className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)" }}
          >
            {searchable && (
              <div className="border-b border-border/60 p-2">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
                  onKeyDown={onKeyDown}
                  placeholder="Search…"
                  className="input-field h-9"
                />
              </div>
            )}

            <div className="overflow-y-auto p-1" style={{ maxHeight: maxMenuHeight }}>
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No matches
                </div>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => commit(opt)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        isActive ? "bg-primary/10 text-foreground" : "text-foreground/90 hover:bg-muted/60",
                        isSelected && "font-medium",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{opt.label}</div>
                        {opt.hint && (
                          <div className="truncate text-[11px] text-muted-foreground">{opt.hint}</div>
                        )}
                      </div>
                      {isSelected && <Check size={14} className="mt-0.5 shrink-0 text-primary" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
