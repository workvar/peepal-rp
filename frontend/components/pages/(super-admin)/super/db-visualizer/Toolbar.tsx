"use client";

import { Search, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { MODULES, TABLES } from "./schema";

interface Props {
  query: string;
  setQuery: (q: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  activeModule: string | null;
  setActiveFilter: (m: string | null) => void;
}

/** Search box, module legend (click to filter) and zoom controls. */
export default function Toolbar({ query, setQuery, onZoomIn, onZoomOut, onFit, onReset, activeModule, setActiveFilter }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tables…"
          className="pl-8 pr-3 py-1.5 w-52 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <IconBtn onClick={onZoomOut} label="Zoom out"><ZoomOut size={15} /></IconBtn>
        <IconBtn onClick={onZoomIn} label="Zoom in"><ZoomIn size={15} /></IconBtn>
        <IconBtn onClick={onFit} label="Fit to screen"><Maximize2 size={15} /></IconBtn>
        <IconBtn onClick={onReset} label="Reset layout"><RotateCcw size={15} /></IconBtn>
      </div>

      <div className="w-full flex flex-wrap gap-1.5 mt-1">
        {MODULES.map((m) => {
          const count = TABLES.filter((t) => t.module === m.name).length;
          const on = activeModule === m.name;
          return (
            <button
              key={m.name}
              onClick={() => setActiveFilter(on ? null : m.name)}
              onMouseDown={(e) => e.preventDefault()}
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border transition-colors ${on ? "border-current" : "border-border hover:bg-muted"}`}
              style={on ? { color: m.color, background: m.color + "14" } : undefined}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
              {m.name}
              <span className="text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground">
      {children}
    </button>
  );
}
