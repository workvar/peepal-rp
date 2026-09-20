'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import type { ModuleConfigState } from './useModuleConfig'

// Manage the coarse subscription modules: add, rename, delete.
export default function ModuleCatalogSection({ cfg }: { cfg: ModuleConfigState }) {
  const { modules, pages, addModule, renameModule, deleteModule } = cfg
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const countFor = (key: string) => pages.filter((p) => p.module_key === key).length

  const submitAdd = async () => {
    const label = newLabel.trim()
    if (!label) return
    setAdding(true)
    const ok = await addModule(label)
    setAdding(false)
    if (ok) setNewLabel('')
  }

  const startEdit = (key: string, label: string) => { setEditKey(key); setEditLabel(label) }
  const saveEdit = async () => {
    if (editKey && editLabel.trim()) await renameModule(editKey, editLabel.trim())
    setEditKey(null)
  }

  const confirmDelete = (key: string) => {
    const n = countFor(key)
    const msg = n > 0
      ? `Delete this module? ${n} page(s) mapped to it will become Core (always on).`
      : 'Delete this module?'
    if (window.confirm(msg)) deleteModule(key)
  }

  return (
    <section className="bg-card rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Subscription Modules</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {modules.map((m) => (
          <div key={m.key} className="flex items-center gap-2 border border-border rounded-lg px-2 py-1.5 bg-muted/30">
            {editKey === m.key ? (
              <>
                <input
                  autoFocus
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditKey(null) }}
                  className="w-32 border border-border rounded px-1.5 py-0.5 text-sm bg-card"
                />
                <button onClick={saveEdit} aria-label="Save" className="text-green-600 hover:text-green-700"><Check size={14} /></button>
                <button onClick={() => setEditKey(null)} aria-label="Cancel" className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">{m.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{m.key}</span>
                <button onClick={() => startEdit(m.key, m.label)} aria-label="Rename" className="text-muted-foreground hover:text-blue-600"><Pencil size={12} /></button>
                <button onClick={() => confirmDelete(m.key)} aria-label="Delete" className="text-muted-foreground hover:text-red-600"><Trash2 size={12} /></button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitAdd() }}
          placeholder="New module name (e.g. Telemedicine)"
          className="flex-1 max-w-xs border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={submitAdd}
          disabled={adding || !newLabel.trim()}
          className="btn-primary text-white rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50"
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </section>
  )
}
