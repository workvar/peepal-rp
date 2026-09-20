"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { Search, CornerDownLeft } from "lucide-react";
import { useGlobalSearch, type ScoredEntry } from "./useGlobalSearch";

function categoryVar(): string {
  return "rgb(var(--primary))";
}

export default function GlobalSearch() {
  const router = useRouter();
  const { user, tenantSlug } = useAppSelector((s) => s.auth);
  const role = user?.role ?? "";
  const slug = tenantSlug ?? "";

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useGlobalSearch(query, role, slug);

  // Cmd/Ctrl+K to focus, Escape to close.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reset highlight whenever the result set changes.
  useEffect(() => setActiveIdx(0), [query]);

  const go = (entry: ScoredEntry) => {
    router.push(entry.href);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIdx]);
    }
  };

  // Group results by category for the dropdown.
  const grouped = results.reduce<Record<string, ScoredEntry[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  let runningIdx = -1; // maps flat highlight index across grouped render

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors"
        style={{
          background: "rgb(var(--muted))",
          borderColor: open ? "rgb(var(--primary))" : "rgb(var(--border))",
        }}
      >
        <Search size={15} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search modules, settings, options…"
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-border text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
          style={{
            background: "rgb(var(--popover))",
            border: "1px solid rgb(var(--border))",
            boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          }}
        >
          {results.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8 px-4">
              No matches for &quot;{query}&quot;
            </p>
          ) : (
            <div className="py-2">
              {!query && (
                <p className="px-4 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Quick access
                </p>
              )}
              {Object.entries(grouped).map(([cat, entries]) => (
                <div key={cat} className="mb-1 last:mb-0">
                  {query && (
                    <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {cat}
                    </p>
                  )}
                  <div className="px-2">
                    {entries.map((entry) => {
                      runningIdx += 1;
                      const idx = runningIdx;
                      const Icon = entry.icon;
                      const active = idx === activeIdx;
                      return (
                        <button
                          key={entry.id}
                          onClick={() => go(entry)}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className="flex w-full items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors"
                          style={{ background: active ? "rgb(var(--muted))" : "transparent" }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "rgb(var(--primary) / 0.10)", color: categoryVar() }}
                          >
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{entry.title}</p>
                            {entry.description && (
                              <p className="text-[11px] text-muted-foreground truncate">{entry.description}</p>
                            )}
                          </div>
                          {active && (
                            <CornerDownLeft size={13} className="text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
