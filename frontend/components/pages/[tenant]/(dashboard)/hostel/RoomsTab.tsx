"use client";

import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { money, cap } from "./helpers";
import { SortTh, SelectionBar } from "./TableBits";
import type { HostelPageState } from "./useHostelPage";

// Sortable rooms table with per-row edit for admins.
export default function RoomsTab({ s }: { s: HostelPageState }) {
  const { isAdmin, selected, loading, sort, toggleSort } = s;
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
                <SortTh sortKey="block" label="Block" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="room" label="Room" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="floor" label="Floor" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="type" label="Type" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="class" label="Class" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="occupied" label="Occupied" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="status" label="Status" sort={sort} onToggle={toggleSort} />
                <SortTh sortKey="rate" label="Rate" sort={sort} onToggle={toggleSort} />
                {isAdmin && <th className="table-th">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {s.sortedRooms.map((room) => (
                <tr key={room.id} className="hover:bg-muted/50">
                  {isAdmin && <td className="table-td"><input type="checkbox" className="rounded" checked={selected.has(room.id)} onChange={() => s.toggleSelect(room.id)} /></td>}
                  <td className="table-td">{room.block?.name}</td>
                  <td className="table-td font-medium">{room.roomNumber}</td>
                  <td className="table-td">{room.floor}</td>
                  <td className="table-td capitalize">{room.roomType}</td>
                  <td className="table-td">{room.roomClass?.name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="table-td">{room.occupied}/{room.capacity}</td>
                  <td className="table-td">
                    <Badge variant={room.occupied === room.capacity ? "destructive" : "secondary"}>
                      {room.occupied === room.capacity ? "Full" : "Available"}
                    </Badge>
                  </td>
                  <td className="table-td">
                    <div className="font-medium">{money(room.semesterRate)}<span className="text-xs text-muted-foreground">/sem</span></div>
                    <div className="text-xs text-muted-foreground">{money(room.annualRate)}/yr • {cap(room.effectiveRateType)}</div>
                  </td>
                  {isAdmin && (
                    <td className="table-td">
                      <button onClick={() => s.openEditRoom(room)} className="text-sm text-blue-600 hover:underline">Edit</button>
                    </td>
                  )}
                </tr>
              ))}
              {s.filteredRooms.length === 0 && (
                <tr><td colSpan={isAdmin ? 10 : 8} className="table-td text-center text-muted-foreground py-8">No rooms yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
