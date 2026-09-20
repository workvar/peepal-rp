"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy } from "lucide-react";
import type { HolidaysPageState } from "./useHolidaysPage";
import { useTerminology } from "@/store/hooks/useTerminology";

// Bulk-action bar plus the month-grouped holiday list with per-month and
// per-row selection checkboxes.
export default function HolidayList({ s }: { s: HolidaysPageState }) {
  const { selected, setSelected, displayedHolidays, loading, byMonth, filterAYID } = s;
  const t = useTerminology();
  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-primary/8 border border-primary/20 rounded-lg">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-primary cursor-pointer"
            checked={selected.size === displayedHolidays.length}
            onChange={s.toggleSelectAll}
          />
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={() => s.setShowCopyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
          >
            <Copy size={13} /> Copy to {t.year}
          </button>
          <button
            onClick={s.handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} /> Delete {selected.size}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {Object.keys(byMonth).length === 0 && (
            <div className="card text-center py-12 text-muted-foreground/70">
              No holidays found.
              {filterAYID && (
                <p className="text-xs mt-1">
                  Try selecting a different {t.year.toLowerCase()} or "All".
                </p>
              )}
            </div>
          )}
          {Object.entries(byMonth).map(([month, items]) => (
            <div key={month}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                  checked={items.every((h) => selected.has(h.id))}
                  onChange={() => {
                    const allSelected = items.every((h) => selected.has(h.id));
                    setSelected((prev) => {
                      const next = new Set(prev);
                      items.forEach((h) => allSelected ? next.delete(h.id) : next.add(h.id));
                      return next;
                    });
                  }}
                />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {month}
                </h3>
              </div>
              <div className="card divide-y divide-border/60 p-0">
                {items.map((h) => (
                  <div
                    key={h.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${selected.has(h.id) ? "bg-primary/5" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                      checked={selected.has(h.id)}
                      onChange={() => s.toggleSelect(h.id)}
                    />
                    <div className="w-10 text-center shrink-0">
                      <p className="text-xl font-bold text-foreground/90">
                        {new Date(h.date).getDate()}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {new Date(h.date).toLocaleString("default", { weekday: "short" })}
                      </p>
                    </div>
                    <p className="font-medium text-foreground flex-1">{h.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge label={h.type} variant={h.type === "public" ? "green" : "blue"} />
                      <button onClick={() => s.handleDelete(h.id)} className="text-red-400 hover:text-red-600 ml-1">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
