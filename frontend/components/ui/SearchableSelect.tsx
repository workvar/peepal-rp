"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchPlaceholder?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  required = false,
  searchPlaceholder = "Search...",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // The dropdown renders in a portal so it is never clipped by a scrolling
  // ancestor (e.g. a modal with overflow-y-auto). We position it with fixed
  // coordinates derived from the trigger, flipping up when there's no room.
  const [menu, setMenu] = useState<{ left: number; top: number; width: number; maxH: number; up: boolean } | null>(null);

  const reposition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const below = window.innerHeight - r.bottom - margin;
    const above = r.top - margin;
    const up = below < 240 && above > below;
    const maxH = Math.min(320, Math.max(160, up ? above : below));
    setMenu({ left: r.left, top: up ? r.top : r.bottom, width: r.width, maxH, up });
  }, []);

  const selected = options.find((o) => o.value === value);

  const filtered = search.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.sublabel ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // Close on outside click (the dropdown is portaled, so check it too).
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(t) &&
        dropdownRef.current && !dropdownRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when opening; reposition while open on scroll/resize.
  useEffect(() => {
    if (open) {
      reposition();
      setTimeout(() => searchRef.current?.focus(), 0);
      window.addEventListener("scroll", reposition, true);
      window.addEventListener("resize", reposition);
      return () => {
        window.removeEventListener("scroll", reposition, true);
        window.removeEventListener("resize", reposition);
      };
    }
    setSearch("");
  }, [open, reposition]);

  function select(optValue: string) {
    onChange(optValue);
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`input-field flex items-center justify-between w-full text-left ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground/60"}>
          {selected ? (
            <span>
              {selected.label}
              {selected.sublabel && (
                <span className="ml-1 text-xs text-muted-foreground/60">
                  {selected.sublabel}
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <span
              onClick={clear}
              className="text-muted-foreground/60 hover:text-foreground"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-muted-foreground/60 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {/* Hidden native select for required validation */}
      {required && (
        <select
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none"
          aria-hidden
        >
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value} />
          ))}
        </select>
      )}

      {/* Dropdown — portaled to <body> with fixed positioning so it is never
          clipped by a scrolling ancestor, and flips up when room is tight. */}
      {open && menu && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: menu.left,
              width: menu.width,
              ...(menu.up
                ? { bottom: window.innerHeight - menu.top + 4 }
                : { top: menu.top + 4 }),
              maxHeight: menu.maxH,
            }}
            className="z-[60] flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-border shrink-0">
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  ref={searchRef}
                  className="input-field py-1.5 pl-7 text-sm w-full"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Options */}
            <ul className="flex-1 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground/60">No results</li>
              ) : (
                filtered.map((o) => (
                  <li
                    key={o.value}
                    onClick={() => select(o.value)}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/60 flex items-center justify-between ${
                      o.value === value ? "bg-muted/40 font-medium" : ""
                    }`}
                  >
                    <span>{o.label}</span>
                    {o.sublabel && (
                      <span className="text-xs text-muted-foreground/60 ml-2">{o.sublabel}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
