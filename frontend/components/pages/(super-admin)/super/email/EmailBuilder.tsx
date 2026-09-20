"use client";

// Visual drag-and-drop email builder. Palette blocks (left) drag into the
// canvas (middle); existing blocks reorder by dragging onto the slots between
// them. The canvas renders the real compiled HTML with sample values, so it
// doubles as the live preview. The selected block is edited in the inspector
// (right). State is lifted: the parent owns the block list.

import { useState } from "react";
import {
  PALETTE,
  newBlock,
  renderBlockInner,
  type Block,
  type BlockType,
} from "@/lib/builderBlocks";
import { substituteVars } from "@/lib/emailTemplate";
import type { TemplateVar } from "@/lib/emailTemplate";
import BlockInspector from "./BlockInspector";
import { GripVertical, Plus } from "lucide-react";

interface Props {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  vars: TemplateVar[];
  sample: Record<string, string>;
}

type Drag = { kind: "new"; type: BlockType } | { kind: "move"; id: string } | null;

export default function EmailBuilder({ blocks, onChange, vars, sample }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [overSlot, setOverSlot] = useState<number | null>(null);

  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  function dropAt(slot: number) {
    if (!drag) return;
    if (drag.kind === "new") {
      const nb = newBlock(drag.type);
      const next = blocks.slice();
      next.splice(slot, 0, nb);
      onChange(next);
      setSelectedId(nb.id);
    } else {
      const from = blocks.findIndex((b) => b.id === drag.id);
      if (from >= 0) {
        const next = blocks.slice();
        const [moved] = next.splice(from, 1);
        const target = Math.max(0, Math.min(next.length, from < slot ? slot - 1 : slot));
        next.splice(target, 0, moved);
        onChange(next);
      }
    }
    setDrag(null);
    setOverSlot(null);
  }

  function patchSelected(patch: Partial<Block>) {
    if (!selected) return;
    onChange(blocks.map((b) => (b.id === selected.id ? { ...b, ...patch } : b)));
  }

  function deleteSelected() {
    if (!selected) return;
    onChange(blocks.filter((b) => b.id !== selected.id));
    setSelectedId(null);
  }

  function appendNew(type: BlockType) {
    const nb = newBlock(type);
    onChange([...blocks, nb]);
    setSelectedId(nb.id);
  }

  const Slot = ({ index }: { index: number }) => (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOverSlot(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dropAt(index);
      }}
      className={`transition-all ${
        overSlot === index && drag ? "h-10 my-1 rounded-md border-2 border-dashed border-indigo-400 bg-indigo-50" : "h-2"
      }`}
    />
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[130px_1fr_280px] gap-4">
      {/* Palette */}
      <aside className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground mb-1">Blocks</p>
        {PALETTE.map((p) => (
          <button
            key={p.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "copy";
              e.dataTransfer.setData("text/plain", p.type);
              setDrag({ kind: "new", type: p.type });
            }}
            onDragEnd={() => {
              setDrag(null);
              setOverSlot(null);
            }}
            onClick={() => appendNew(p.type)}
            className="w-full flex items-center gap-1.5 text-sm rounded-lg border border-border px-2.5 py-2 bg-card hover:bg-muted/40 cursor-grab active:cursor-grabbing"
            title={`Drag in or click to add a ${p.label.toLowerCase()}`}
          >
            <Plus size={13} className="text-muted-foreground" />
            {p.label}
          </button>
        ))}
      </aside>

      {/* Canvas (doubles as preview) */}
      <div className="rounded-lg border border-border bg-[#f5f6f8] p-4 min-h-[460px]">
        <div className="mx-auto max-w-[520px] bg-white rounded-[14px] border border-[#e6e8eb] p-6">
          {blocks.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOverSlot(0);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dropAt(0);
              }}
              className={`flex items-center justify-center text-sm text-muted-foreground rounded-lg border-2 border-dashed p-10 ${
                overSlot === 0 && drag ? "border-indigo-400 bg-indigo-50" : "border-border"
              }`}
            >
              Drag blocks here to start building
            </div>
          ) : (
            <>
              <Slot index={0} />
              {blocks.map((b, i) => (
                <div key={b.id}>
                  <div
                    draggable
                    onDragStart={() => setDrag({ kind: "move", id: b.id })}
                    onDragEnd={() => {
                      setDrag(null);
                      setOverSlot(null);
                    }}
                    onClick={() => setSelectedId(b.id)}
                    className={`group relative rounded-md cursor-pointer ${
                      selectedId === b.id ? "ring-2 ring-indigo-400" : "ring-1 ring-transparent hover:ring-indigo-200"
                    }`}
                  >
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground cursor-grab active:cursor-grabbing">
                      <GripVertical size={14} />
                    </span>
                    <div
                      className="pointer-events-none select-none p-1"
                      dangerouslySetInnerHTML={{ __html: substituteVars(renderBlockInner(b), sample) }}
                    />
                  </div>
                  <Slot index={i + 1} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Inspector */}
      <aside>
        <BlockInspector block={selected} vars={vars} onChange={patchSelected} onDelete={deleteSelected} />
      </aside>
    </div>
  );
}
