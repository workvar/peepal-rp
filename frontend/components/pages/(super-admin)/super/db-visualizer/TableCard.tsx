"use client";

import { KeyRound, Link2 } from "lucide-react";
import { Table } from "./schema";
import { NodePos, fkColumns } from "./layout";

interface Props {
  table: Table;
  pos: NodePos;
  color: string;
  active: boolean;
  dimmed: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: () => void;
}

/** A draggable table node. Shows name, module, column count and FK rows. */
export default function TableCard({ table, pos, color, active, dimmed, onPointerDown, onClick }: Props) {
  const fks = fkColumns(table).slice(0, 6);
  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={`absolute rounded-lg border bg-card shadow-sm cursor-grab active:cursor-grabbing select-none transition-shadow ${
        active ? "ring-2 ring-offset-1 shadow-lg" : "hover:shadow-md"
      }`}
      style={{
        left: pos.x, top: pos.y, width: pos.w,
        borderColor: active ? color : "var(--border)",
        opacity: dimmed ? 0.25 : 1,
        ...(active ? ({ "--tw-ring-color": color } as React.CSSProperties) : {}),
      }}
    >
      <div className="px-2.5 py-1.5 rounded-t-lg flex items-center gap-1.5" style={{ background: color + "22" }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-[12px] font-bold text-foreground truncate">{table.name}</span>
      </div>
      <div className="px-2.5 py-1 text-[10px] text-muted-foreground border-b border-border flex justify-between">
        <span>{table.module}</span>
        <span>{table.columns.length} cols</span>
      </div>
      <div className="px-2.5 py-1.5 space-y-0.5">
        {table.columns.some((c) => c.pk) && (
          <div className="flex items-center gap-1 text-[10.5px] text-amber-600 dark:text-amber-400">
            <KeyRound size={10} className="shrink-0" />
            <span className="font-mono truncate">{table.columns.find((c) => c.pk)?.name}</span>
          </div>
        )}
        {fks.map((c) => (
          <div key={c.name} className="flex items-center gap-1 text-[10.5px] text-sky-600 dark:text-sky-400">
            <Link2 size={10} className="shrink-0" />
            <span className="font-mono truncate">{c.name}</span>
          </div>
        ))}
        {fkColumns(table).length > 6 && (
          <div className="text-[10px] text-muted-foreground pl-3.5">+{fkColumns(table).length - 6} more FKs</div>
        )}
      </div>
    </div>
  );
}
