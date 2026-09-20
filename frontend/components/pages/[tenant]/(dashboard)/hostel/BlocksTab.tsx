"use client";

import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Users, Home } from "lucide-react";
import { SelectionBar } from "./TableBits";
import type { HostelPageState } from "./useHostelPage";

// Expandable list of blocks; expanding a block shows its rooms inline.
export default function BlocksTab({ s }: { s: HostelPageState }) {
  const { blocks, rooms, loading, isAdmin, selected, setSelected, expandedBlock, setExpandedBlock } = s;
  return (
    <div className="space-y-3">
      {isAdmin && selected.size > 0 && (
        <SelectionBar
          count={selected.size}
          label={`${selected.size} block${selected.size > 1 ? "s" : ""} selected`}
          onClear={() => setSelected(new Set())}
          onDelete={s.handleBulkDelete}
          className=""
        />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {isAdmin && blocks.length > 0 && (
            <label className="flex items-center gap-2 px-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" className="rounded" checked={s.allSelected} onChange={s.toggleAll} />
              Select all
            </label>
          )}

          {blocks.map((block) => {
            const blockRooms = rooms.filter((r) => r.blockId === block.id);
            return (
              <div key={block.id} className="card p-4">
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <input
                      type="checkbox"
                      className="rounded shrink-0"
                      checked={selected.has(block.id)}
                      onChange={() => s.toggleSelect(block.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <button
                    onClick={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}
                    className="flex-1 text-left flex items-center justify-between hover:bg-muted/50 p-2 rounded transition"
                  >
                    <div>
                      <p className="font-semibold">{block.name}</p>
                      <p className="text-xs text-muted-foreground">{block.floors} floors • {blockRooms.length} rooms</p>
                    </div>
                    <Home size={18} className="text-muted-foreground" />
                  </button>
                </div>
                {expandedBlock === block.id && (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="space-y-2">
                      {blockRooms.map((room) => (
                        <div key={room.id} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                          <div>
                            <span className="font-medium">Room {room.roomNumber}</span>
                            <span className="text-xs text-muted-foreground ml-2">Floor {room.floor}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs">
                              <Users size={14} className="inline mr-1" />
                              {room.occupied}/{room.capacity}
                            </span>
                            <Badge variant={room.occupied === room.capacity ? "destructive" : "secondary"}>
                              {room.occupied === room.capacity ? "Full" : "Available"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
