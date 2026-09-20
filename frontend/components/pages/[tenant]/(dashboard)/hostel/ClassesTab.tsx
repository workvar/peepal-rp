"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { money, cap } from "./helpers";
import { SortTh, SelectionBar } from "./TableBits";
import type { HostelPageState } from "./useHostelPage";

// Room classes table with computed per-semester / per-year / per-month rates.
export default function ClassesTab({ s }: { s: HostelPageState }) {
  const { isAdmin, selected, loading, sort, toggleSort, roomClasses } = s;
  return (
    <>
      {isAdmin && selected.size > 0 && (
        <SelectionBar count={selected.size} onClear={() => s.setSelected(new Set())} onDelete={s.handleBulkDelete} />
      )}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                {isAdmin && <th className="table-th w-8"><input type="checkbox" className="rounded" checked={s.allSelected} onChange={s.toggleAll} /></th>}
                <SortTh sortKey="name" label="Name" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="description" label="Description" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="rate" label="Entered Rate" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="semester" label="Per Semester" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="year" label="Per Year" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="month" label="Per Month" sort={sort} onToggle={toggleSort} />
                {isAdmin && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {s.sortedClasses.map((rc) => (
                <tr key={rc.id} className="hover:bg-muted/50">
                  {isAdmin && <td className="table-td"><input type="checkbox" className="rounded" checked={selected.has(rc.id)} onChange={() => s.toggleSelect(rc.id)} /></td>}
                  <td className="table-td font-medium">{rc.name}</td>
                  <td className="table-td text-muted-foreground">{rc.description || "—"}</td>
                  <td className="table-td">{money(rc.rateAmount)} <span className="text-xs text-muted-foreground">/ {cap(rc.rateType)}</span></td>
                  <td className="table-td">{money(rc.semesterRate)}</td>
                  <td className="table-td">{money(rc.annualRate)}</td>
                  <td className="table-td">{money(rc.monthlyRate)}</td>
                  {isAdmin && (
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <button onClick={() => s.openEditClass(rc)} className="text-sm text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => s.handleDeleteClass(rc.id)} className="text-sm text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {roomClasses.length === 0 && (
                <tr><td colSpan={isAdmin ? 8 : 6} className="table-td text-center text-muted-foreground py-8">No room classes yet. Create one, then link rooms to it.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
