'use client'

import { useState } from 'react'
import { GripVertical, Inbox } from 'lucide-react'
import type { ModuleConfigState } from './useModuleConfig'
import type { ModulePageItem } from '@/types'

const CORE = ''                       // always-on
const UNASSIGNED = '__unassigned__'   // hidden until mapped (matches backend sentinel)

// Drag-and-drop board. Each subscription module (and a Core bucket) is a drop
// box; an "Unassigned" buffer holds pages that are hidden from all tenants until
// mapped. Pages are draggable chips.
export default function PageMappingSection({ cfg }: { cfg: ModuleConfigState }) {
  const { modules, pages, setPageMapping } = cfg
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)

  const pagesFor = (key: string) => pages.filter((p) => p.module_key === key)
  const unassigned = pagesFor(UNASSIGNED)

  const moduleBoxes = [
    ...modules.map((m) => ({ key: m.key, label: m.label, core: false })),
    { key: CORE, label: 'Core (always on)', core: true },
  ]

  const handleDrop = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || draggingId
    if (id) setPageMapping(id, key)
    setDraggingId(null)
    setOverKey(null)
  }
  const dragProps = (key: string) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); if (overKey !== key) setOverKey(key) },
    onDrop: (e: React.DragEvent) => handleDrop(e, key),
  })
  const chipStart = (id: string) => setDraggingId(id)
  const chipEnd = () => { setDraggingId(null); setOverKey(null) }

  return (
    <section className="bg-card rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground mb-1">Page to Module Mapping</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Drag a page into a module to gate it there, or onto Core to keep it always available. Pages left in the buffer are hidden from every tenant until mapped.
      </p>

      {/* Unassigned buffer */}
      <div
        {...dragProps(UNASSIGNED)}
        className={`rounded-xl border border-dashed p-3 mb-4 transition-colors ${
          overKey === UNASSIGNED
            ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-200'
            : 'border-amber-300/70 bg-amber-50/30'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Inbox size={14} className="text-amber-500 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Unassigned buffer</span>
          <span className="hidden sm:inline text-[10px] text-amber-600/80">hidden from tenants until mapped</span>
          <span className="ml-auto text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5">
            {unassigned.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
          {unassigned.length === 0 ? (
            <span className="text-[11px] text-amber-600/60 italic py-0.5">Drag pages here to hide them platform-wide</span>
          ) : (
            unassigned.map((p) => (
              <PageChip key={p.id} page={p} tone="muted" dragging={draggingId === p.id} onStart={() => chipStart(p.id)} onEnd={chipEnd} />
            ))
          )}
        </div>
      </div>

      {/* Module + Core boxes */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {moduleBoxes.map((box) => {
          const boxPages = pagesFor(box.key)
          const over = overKey === box.key
          return (
            <div
              key={box.key || '__core__'}
              {...dragProps(box.key)}
              className={`rounded-xl border p-3 min-h-[104px] transition-colors ${
                over
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                  : box.core
                    ? 'border-dashed border-border bg-muted/20'
                    : 'border-border bg-muted/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-foreground/80 truncate">{box.label}</span>
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-card border border-border rounded-full px-1.5">
                  {boxPages.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {boxPages.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground/60 italic py-1">Drop pages here</span>
                ) : (
                  boxPages.map((p) => (
                    <PageChip key={p.id} page={p} tone="active" dragging={draggingId === p.id} onStart={() => chipStart(p.id)} onEnd={chipEnd} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function PageChip({
  page, tone, dragging, onStart, onEnd,
}: {
  page: ModulePageItem
  tone: 'active' | 'muted'
  dragging: boolean
  onStart: () => void
  onEnd: () => void
}) {
  const toneCls = tone === 'muted'
    ? 'text-muted-foreground border-border bg-muted/40 hover:bg-muted/70'
    : 'text-primary border-primary/30 bg-primary/10 hover:bg-primary/20 hover:border-primary/50'
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', page.id)
        onStart()
      }}
      onDragEnd={onEnd}
      title={`${page.label} · ${page.group}`}
      className={`inline-flex items-center gap-1 cursor-grab active:cursor-grabbing select-none rounded-lg border px-2 py-1 text-xs font-medium transition-all ${
        dragging ? 'opacity-50 border-primary bg-primary/20 text-primary' : toneCls
      }`}
    >
      <GripVertical size={11} className="opacity-50 shrink-0" />
      <span>{page.label}</span>
    </div>
  )
}
