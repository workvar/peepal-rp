"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Check } from "lucide-react";

// Presentational searchable multi-select over a list of people. Data-source
// agnostic: callers pass already-fetched options. Used by StudentMultiSelect
// and StaffMultiSelect. Matches on both the name and the secondary label (roll
// number / employee id).
export interface PersonOption {
  id: string;
  name: string;
  sub?: string;
}

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  options: PersonOption[];
  loading?: boolean;
  placeholder?: string;
}

const labelFor = (o?: PersonOption) => (o ? (o.sub ? `${o.name} · ${o.sub}` : o.name) : "");

export default function PeopleMultiSelect({ value, onChange, options, loading = false, placeholder = "Search…" }: Props) {
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

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  return (
    <div ref={boxRef} className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs rounded-full pl-2 pr-1 py-0.5">
              {labelFor(byId[id]) || id}
              <button type="button" onClick={() => remove(id)} className="hover:bg-primary/20 rounded-full p-0.5" aria-label="Remove">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

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
        <div className="mt-1 w-full max-h-52 overflow-auto rounded-lg border border-border bg-background shadow-sm">
          {loading && options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
          ) : (
            filtered.map((o) => {
              const selected = value.includes(o.id);
              return (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50 ${selected ? "bg-primary/5" : ""}`}
                >
                  <span className="min-w-0 truncate text-sm">
                    <span className="font-medium">{o.name}</span>
                    {o.sub && <span className="text-xs text-muted-foreground ml-2">{o.sub}</span>}
                  </span>
                  {selected && <Check size={14} className="text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
