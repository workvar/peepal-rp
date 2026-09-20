"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Check } from "lucide-react";
import type { PersonOption } from "./PeopleMultiSelect";

// Single-select searchable dropdown. Mirrors PeopleMultiSelect's look and its
// name + secondary-label matching, but holds a single value. Used to pick a book
// or a borrower in the library issue form. Data-source agnostic: the caller
// passes already-fetched options.
interface Props {
  value: string;
  onChange: (id: string) => void;
  options: PersonOption[];
  loading?: boolean;
  placeholder?: string;
}

export default function SearchSelect({
  value, onChange, options, loading = false, placeholder = "Search…",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const byId = useMemo(() => {
    const m: Record<string, PersonOption> = {};
    for (const o of options) m[o.id] = o;
    return m;
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? options.filter((o) => o.name.toLowerCase().includes(q) || (o.sub ?? "").toLowerCase().includes(q))
      : options;
    return base.slice(0, 50);
  }, [options, query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selected = value ? byId[value] : undefined;

  // Show the current pick as a compact row with a clear button. Clicking clear
  // reopens the search.
  if (selected && !open) {
    return (
      <div ref={boxRef} className="relative">
        <div className="flex items-center justify-between gap-2 w-full px-3 py-2 border border-border rounded-lg text-sm">
          <span className="min-w-0 truncate">
            <span className="font-medium">{selected.name}</span>
            {selected.sub && <span className="text-xs text-muted-foreground ml-2">{selected.sub}</span>}
          </span>
          <button
            type="button"
            onClick={() => { onChange(""); setQuery(""); setOpen(true); }}
            className="hover:bg-muted rounded p-0.5 shrink-0"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-sm"
        />
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-border bg-background shadow-sm">
          {loading && options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
          ) : (
            filtered.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => { onChange(o.id); setOpen(false); setQuery(""); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50 ${o.id === value ? "bg-primary/5" : ""}`}
              >
                <span className="min-w-0 truncate text-sm">
                  <span className="font-medium">{o.name}</span>
                  {o.sub && <span className="text-xs text-muted-foreground ml-2">{o.sub}</span>}
                </span>
                {o.id === value && <Check size={14} className="text-primary shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
