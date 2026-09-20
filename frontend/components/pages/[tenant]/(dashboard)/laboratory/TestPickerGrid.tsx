"use client";

// Test picker for the New Lab Order modal: a searchable grid of selectable
// test cards grouped by category (body part), with inline add/edit/remove.

import { useMemo, useState } from "react";
import Can from "@/components/access/Can";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import type { GqlLabTest } from "./types";

const UNCATEGORIZED = "Other";

// Group active tests by category, alphabetically, with "Other" last.
function groupByCategory(tests: GqlLabTest[]) {
  const groups = new Map<string, GqlLabTest[]>();
  for (const t of tests) {
    const key = (t.category ?? "").trim() || UNCATEGORIZED;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b);
  });
}

export default function TestPickerGrid({
  tests, picked, onToggle, onAdd, onEdit, onDelete,
}: {
  tests: GqlLabTest[];
  picked: string[];
  onToggle: (id: string) => void;
  onAdd: () => void;
  onEdit: (t: GqlLabTest) => void;
  onDelete: (t: GqlLabTest) => void;
}) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const q = search.trim().toLowerCase();

  const toggleCollapse = (category: string) =>
    setCollapsed((c) => ({ ...c, [category]: !c[category] }));

  const groups = useMemo(() => {
    const active = tests
      .filter((t) => t.active)
      .filter((t) => !q || [t.name, t.code, t.category].some((v) => String(v ?? "").toLowerCase().includes(q)));
    return groupByCategory(active);
  }, [tests, q]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <input className="input-field flex-1" placeholder="Search test or code…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <Can module="laboratory" action="create">
          <button type="button" className="btn-secondary text-sm flex items-center gap-1 whitespace-nowrap"
            onClick={onAdd}>
            <Plus size={14} /> Add Test
          </button>
        </Can>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-lg border border-border/60 p-2 space-y-4">
        {groups.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground/70">No tests match.</div>
        ) : (
          groups.map(([category, items]) => {
            const isOpen = !collapsed[category];
            const pickedCount = items.filter((t) => picked.includes(t.id)).length;
            return (
              <div key={category}>
                <button type="button" onClick={() => toggleCollapse(category)}
                  className="mb-1.5 flex w-full items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 hover:text-foreground">
                  <ChevronRight size={14} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  {category}
                  <span className="font-normal">({items.length}{pickedCount ? `, ${pickedCount} selected` : ""})</span>
                </button>
                {isOpen && (
                  <div className="space-y-2">
                    {items.map((t) => {
                      const isPicked = picked.includes(t.id);
                      return (
                        <div key={t.id}
                          className={`group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                            isPicked ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/40"
                          }`}>
                          <label className="flex flex-1 items-center gap-2 cursor-pointer min-w-0">
                            <input type="checkbox" checked={isPicked} onChange={() => onToggle(t.id)} />
                            <span className="font-mono text-xs text-muted-foreground shrink-0">{t.code}</span>
                            <span className="flex-1">{t.name}</span>
                            <span className="font-mono text-xs shrink-0">{t.price.toFixed(2)}</span>
                          </label>
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Can module="laboratory" action="edit">
                              <button type="button" className="p-1 text-blue-600 hover:text-blue-700"
                                aria-label={`Edit ${t.name}`} onClick={() => onEdit(t)}>
                                <Pencil size={13} />
                              </button>
                            </Can>
                            <Can module="laboratory" action="delete">
                              <button type="button" className="p-1 text-red-500 hover:text-red-700"
                                aria-label={`Delete ${t.name}`} onClick={() => onDelete(t)}>
                                <Trash2 size={13} />
                              </button>
                            </Can>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
