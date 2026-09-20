"use client";

import { X, KeyRound, Link2, ArrowRight, ArrowLeft } from "lucide-react";
import { TABLES, EDGES, Table } from "./schema";

interface Props {
  table: Table | null;
  color: string;
  onClose: () => void;
  onJump: (name: string) => void;
}

/** Right drawer with the full description, columns and relationships of a table. */
export default function DetailsPanel({ table, color, onClose, onJump }: Props) {
  if (!table) return null;
  const outgoing = EDGES.filter((e) => e.child === table.name); // this -> parent (FK here)
  const incoming = EDGES.filter((e) => e.parent === table.name); // children -> this

  return (
    <div className="absolute top-0 right-0 h-full w-[340px] bg-card border-l border-border shadow-xl flex flex-col z-20">
      <div className="px-4 py-3 border-b border-border flex items-start justify-between" style={{ background: color + "18" }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <h3 className="text-base font-bold text-foreground">{table.name}</h3>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{table.module} · {table.file}</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        <p className="text-foreground/85 leading-relaxed">{table.desc}</p>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Columns ({table.columns.length})
          </div>
          <div className="space-y-1">
            {table.columns.map((c) => (
              <div key={c.name} className="flex items-start gap-2 py-1 border-b border-border/50 last:border-0">
                <span className="shrink-0 mt-0.5">
                  {c.pk ? <KeyRound size={12} className="text-amber-500" /> : c.fk ? <Link2 size={12} className="text-sky-500" /> : <span className="w-3 inline-block" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[11.5px] text-foreground">{c.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{c.type}</span>
                    {c.req && <span className="text-[9px] px-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400">required</span>}
                    {c.ref && (
                      <button onClick={() => onJump(c.ref!)} className="text-[10px] px-1 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:underline">
                        → {c.ref}
                      </button>
                    )}
                  </div>
                  {c.note && <div className="text-[10.5px] text-muted-foreground mt-0.5">{c.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {outgoing.length > 0 && (
          <RelList title="References (FK out)" icon={<ArrowRight size={11} />} items={outgoing.map((e) => ({ name: e.parent, via: e.fk }))} onJump={onJump} />
        )}
        {incoming.length > 0 && (
          <RelList title="Referenced by (FK in)" icon={<ArrowLeft size={11} />} items={incoming.map((e) => ({ name: e.child, via: e.fk }))} onJump={onJump} />
        )}
      </div>
    </div>
  );
}

function RelList({ title, icon, items, onJump }: { title: string; icon: React.ReactNode; items: { name: string; via: string }[]; onJump: (n: string) => void }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
        {icon} {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <button key={i} onClick={() => onJump(it.name)} className="text-[11px] px-2 py-1 rounded-md border border-border hover:border-sky-500 hover:text-sky-500 transition-colors">
            {it.name}{it.via ? <span className="text-muted-foreground"> ·{it.via}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
