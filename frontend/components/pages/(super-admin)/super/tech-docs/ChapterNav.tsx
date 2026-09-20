"use client";

import { CHAPTERS } from "./chapters";

interface Props {
  active: number;
  onSelect: (i: number) => void;
}

/** Left rail listing every chapter with a number badge. */
export default function ChapterNav({ active, onSelect }: Props) {
  return (
    <nav className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground px-3 mb-2">
        Chapters
      </div>
      {CHAPTERS.map((c, i) => {
        const on = i === active;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(i)}
            className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
              on ? "border-primary/30 bg-primary/10" : "border-transparent hover:bg-muted/60"
            }`}
          >
            <span className={`shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
              on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block text-[13px] font-semibold leading-tight ${on ? "text-primary" : "text-foreground"}`}>
                {c.title}
              </span>
              <span className="block text-[11px] text-muted-foreground truncate">{c.blurb}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
