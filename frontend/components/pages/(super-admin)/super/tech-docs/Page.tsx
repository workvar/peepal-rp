"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { CHAPTERS } from "./chapters";
import ChapterNav from "./ChapterNav";

/** Super-admin Technical Docs: a chapter-by-chapter developer onboarding read. */
export default function TechDocsPage() {
  const [active, setActive] = useState(0);
  const topRef = useRef<HTMLDivElement | null>(null);
  const Current = CHAPTERS[active].Component;

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  return (
    <div className="max-w-7xl mx-auto" ref={topRef}>
      <PageHeader
        title="Technical Documentation"
        subtitle={`Chapter ${active + 1} of ${CHAPTERS.length} · ${CHAPTERS[active].title}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-2">
            <ChapterNav active={active} onSelect={setActive} />
          </div>
        </aside>

        <div className="min-w-0">
          {/* Mobile chapter picker */}
          <select
            value={active}
            onChange={(e) => setActive(Number(e.target.value))}
            className="lg:hidden mb-5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {CHAPTERS.map((c, i) => (
              <option key={c.id} value={i}>{i + 1}. {c.title}</option>
            ))}
          </select>

          <Current />

          <div className="flex items-center justify-between gap-3 border-t border-border pt-5 mt-4">
            <NavBtn
              dir="prev"
              disabled={active === 0}
              label={active > 0 ? CHAPTERS[active - 1].title : ""}
              onClick={() => setActive((i) => Math.max(0, i - 1))}
            />
            <NavBtn
              dir="next"
              disabled={active === CHAPTERS.length - 1}
              label={active < CHAPTERS.length - 1 ? CHAPTERS[active + 1].title : ""}
              onClick={() => setActive((i) => Math.min(CHAPTERS.length - 1, i + 1))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ dir, disabled, label, onClick }: { dir: "prev" | "next"; disabled: boolean; label: string; onClick: () => void }) {
  if (disabled) return <span />;
  const isPrev = dir === "prev";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm hover:bg-muted transition-colors ${isPrev ? "" : "ml-auto text-right flex-row-reverse"}`}
    >
      {isPrev ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{isPrev ? "Previous" : "Next"}</span>
        <span className="block font-semibold text-foreground truncate max-w-[180px]">{label}</span>
      </span>
    </button>
  );
}
