"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAppSelector } from "@/store/hooks";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { HostelAllocation, HostelBlock, HostelRoom } from "@/types/general/entities";
import RoomBedModal from "./RoomBedModal";

const money = (n: number) => "₹" + (n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

type Fill = "empty" | "partial" | "full" | "maintenance";

const FILL: Record<Fill, { cell: string; bar: string; label: string }> = {
  empty: { cell: "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20", bar: "bg-emerald-500", label: "Empty / available" },
  partial: { cell: "bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20", bar: "bg-amber-500", label: "Partially filled" },
  full: { cell: "bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20", bar: "bg-rose-500", label: "Full" },
  maintenance: { cell: "bg-slate-500/10 border-slate-500/30 hover:bg-slate-500/20", bar: "bg-slate-400", label: "Maintenance" },
};

function fillOf(room: HostelRoom): Fill {
  if (room.status === "maintenance") return "maintenance";
  if (room.capacity > 0 && room.occupied >= room.capacity) return "full";
  if (room.occupied > 0) return "partial";
  return "empty";
}

// Per-block rollup built in `grouped` below.
interface BlockGroup {
  block: HostelBlock;
  floors: Record<number, HostelRoom[]>;
  floorNums: number[];
  count: number;
  beds: number;
  occ: number;
  dist: Record<Fill, number>;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "empty", label: "Empty" },
  { key: "full", label: "Full" },
];

function matches(room: HostelRoom, filter: string) {
  if (filter === "available") return room.occupied < room.capacity;
  if (filter === "empty") return room.occupied === 0;
  if (filter === "full") return room.capacity > 0 && room.occupied >= room.capacity;
  return true;
}

export default function HostelVisualizer() {
  const { blocks, rooms, allocations, loading } = useAppSelector((s) => s.hostel);
  const [hovered, setHovered] = useState<{ room: HostelRoom; rect: DOMRect } | null>(null);
  const [openRoom, setOpenRoom] = useState<HostelRoom | null>(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name_asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Expand only the first block on first load; the rest start collapsed. A ref
  // guards against re-expanding after the user collapses it (e.g. on refetch).
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && blocks.length > 0) {
      didInit.current = true;
      setExpanded(new Set([blocks[0].id]));
    }
  }, [blocks]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Active allocations grouped by room.
  const allocByRoom = useMemo(() => {
    const m: Record<string, HostelAllocation[]> = {};
    for (const a of allocations) {
      if (a.status !== "active") continue;
      (m[a.roomId] ||= []).push(a);
    }
    return m;
  }, [allocations]);

  // Every student with an active allocation anywhere (one bed per student).
  const allocatedStudentIds = useMemo(() => {
    const s = new Set<string>();
    for (const a of allocations) if (a.status === "active") s.add(a.studentId);
    return s;
  }, [allocations]);

  // Keep the open room's data fresh after allocate/vacate refetches.
  const openRoomLive = openRoom ? rooms.find((r) => r.id === openRoom.id) ?? openRoom : null;

  // blocks -> floors -> rooms, plus per-block summary & distribution.
  const grouped = useMemo(() => {
    return blocks.map((b) => {
      const blockRooms = rooms.filter((r) => r.blockId === b.id);
      const floors: Record<number, HostelRoom[]> = {};
      const dist: Record<Fill, number> = { empty: 0, partial: 0, full: 0, maintenance: 0 };
      for (const r of blockRooms) {
        (floors[r.floor] ||= []).push(r);
        dist[fillOf(r)]++;
      }
      for (const k of Object.keys(floors)) {
        floors[+k].sort((a, z) =>
          String(a.roomNumber).localeCompare(String(z.roomNumber), undefined, { numeric: true })
        );
      }
      const floorNums = Object.keys(floors).map(Number).sort((a, z) => z - a);
      const beds = blockRooms.reduce((s, r) => s + r.capacity, 0);
      const occ = blockRooms.reduce((s, r) => s + r.occupied, 0);
      return { block: b, floors, floorNums, count: blockRooms.length, beds, occ, dist };
    });
  }, [blocks, rooms]);

  // Sorted view of the blocks. Name is the tiebreaker for numeric sorts.
  const sortedGroups = useMemo(() => {
    const g = [...grouped];
    const avail = (x: BlockGroup) => x.beds - x.occ;
    const occPct = (x: BlockGroup) => (x.beds ? x.occ / x.beds : 0);
    const byName = (a: BlockGroup, b: BlockGroup) =>
      String(a.block.name).localeCompare(String(b.block.name), undefined, { numeric: true });
    switch (sort) {
      case "name_desc": g.sort((a, b) => byName(b, a)); break;
      case "avail_desc": g.sort((a, b) => avail(b) - avail(a) || byName(a, b)); break;
      case "avail_asc": g.sort((a, b) => avail(a) - avail(b) || byName(a, b)); break;
      case "occ_desc": g.sort((a, b) => occPct(b) - occPct(a) || byName(a, b)); break;
      case "occ_asc": g.sort((a, b) => occPct(a) - occPct(b) || byName(a, b)); break;
      case "rooms_desc": g.sort((a, b) => b.count - a.count || byName(a, b)); break;
      case "rooms_asc": g.sort((a, b) => a.count - b.count || byName(a, b)); break;
      default: g.sort(byName); // name_asc
    }
    return g;
  }, [grouped, sort]);

  if (loading && blocks.length === 0) return <LoadingSpinner />;
  if (blocks.length === 0)
    return (
      <div className="card p-8 text-center text-muted-foreground">
        No blocks yet. Create blocks and rooms to see the building view.
      </div>
    );

  // Tooltip geometry (flip below the cell when near the top of the viewport).
  let tip: CSSProperties | null = null;
  if (hovered && typeof window !== "undefined") {
    const r = hovered.rect;
    const left = Math.min(Math.max(r.left + r.width / 2, 140), window.innerWidth - 140);
    tip =
      r.top < 280
        ? { top: r.bottom + 10, left, transform: "translateX(-50%)" }
        : { top: r.top - 10, left, transform: "translate(-50%, -100%)" };
  }
  const hAllocs = hovered ? allocByRoom[hovered.room.id] || [] : [];

  return (
    <div className="space-y-5">
      {/* Legend + filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {(["empty", "partial", "full", "maintenance"] as Fill[]).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded ${FILL[k].bar}`} />
              {FILL[k].label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort</span>
          <select
            aria-label="Sort blocks"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-xs rounded-lg border border-border bg-background px-2 py-1.5"
          >
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="avail_desc">Availability (high to low)</option>
            <option value="avail_asc">Availability (low to high)</option>
            <option value="occ_desc">Occupancy (high to low)</option>
            <option value="occ_asc">Occupancy (low to high)</option>
            <option value="rooms_desc">Most rooms</option>
            <option value="rooms_asc">Fewest rooms</option>
          </select>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 text-xs rounded-md transition ${
                  filter === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Blocks */}
      {sortedGroups.map(({ block, floors, floorNums, count, beds, occ, dist }) => {
        const isOpen = expanded.has(block.id);
        return (
        <div key={block.id} className="card p-4">
          <button
            onClick={() => toggle(block.id)}
            aria-expanded={isOpen}
            className="w-full flex flex-wrap items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
              <h3 className="font-semibold text-lg">{block.name}</h3>
              {block.type && <Badge variant="secondary">{cap(block.type)}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              {count} rooms · {occ}/{beds} beds filled · {beds ? Math.round((occ / beds) * 100) : 0}% occupancy
            </div>
          </button>

          <div className="flex items-center gap-3 text-[11px] mt-2 ml-6 mb-1">
            {(["empty", "partial", "full", "maintenance"] as Fill[])
              .filter((k) => dist[k] > 0)
              .map((k) => (
                <span key={k} className="flex items-center gap-1 text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${FILL[k].bar}`} />
                  {dist[k]} {FILL[k].label.split(" ")[0].toLowerCase()}
                </span>
              ))}
          </div>

          {isOpen && (count === 0 ? (
            <div className="text-sm text-muted-foreground ml-6">No rooms in this block yet.</div>
          ) : (
            <div className="space-y-2 mt-3">
              {floorNums.map((fn) => (
                <div key={fn} className="flex items-stretch gap-3">
                  <div className="w-16 shrink-0 flex items-center text-xs font-medium text-muted-foreground">
                    {fn === 0 ? "Ground" : `Floor ${fn}`}
                  </div>
                  <div className="flex flex-wrap gap-2 border-l border-border pl-3 py-1">
                    {floors[fn].map((room) => {
                      const fill = FILL[fillOf(room)];
                      const dim = !matches(room, filter);
                      const pct = room.capacity > 0 ? Math.min(100, (room.occupied / room.capacity) * 100) : 0;
                      return (
                        <div
                          key={room.id}
                          onMouseEnter={(e) => setHovered({ room, rect: e.currentTarget.getBoundingClientRect() })}
                          onMouseLeave={() => setHovered((h) => (h?.room.id === room.id ? null : h))}
                          onClick={() => { setHovered(null); setOpenRoom(room); }}
                          title="Click to manage beds"
                          className={`relative w-[72px] cursor-pointer rounded-lg border px-2 py-1.5 transition ${fill.cell} ${dim ? "opacity-20" : ""}`}
                        >
                          <div className="text-sm font-semibold leading-none">{room.roomNumber}</div>
                          <div className="mt-1 text-[10px] opacity-80">
                            {room.occupied}/{room.capacity} beds
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-foreground/10 overflow-hidden">
                            <div className={`h-full ${fill.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        );
      })}

      {/* Hover tooltip */}
      {hovered && tip && (
        <div
          className="fixed z-50 w-64 rounded-xl border border-border bg-background p-3 shadow-xl pointer-events-none"
          style={tip}
        >
          <div className="text-sm font-semibold">
            {hovered.room.block?.name} · Room {hovered.room.roomNumber}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {hovered.room.floor === 0 ? "Ground floor" : `Floor ${hovered.room.floor}`} · {cap(hovered.room.roomType)}
            {hovered.room.roomClass ? ` · ${hovered.room.roomClass.name}` : ""}
          </div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Occupancy</span>
            <span className="font-medium">
              {hovered.room.occupied}/{hovered.room.capacity} beds
            </span>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-xs space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per semester</span>
              <span className="font-medium">{money(hovered.room.semesterRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per year</span>
              <span>{money(hovered.room.annualRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per month</span>
              <span>{money(hovered.room.monthlyRate)}</span>
            </div>
          </div>
          <div className="mt-2 text-xs">
            <div className="text-muted-foreground mb-1">Allocated ({hAllocs.length})</div>
            {hAllocs.length === 0 ? (
              <div className="italic text-muted-foreground">Empty — available</div>
            ) : (
              <ul className="space-y-0.5 max-h-24 overflow-auto">
                {hAllocs.map((a) => (
                  <li key={a.id} className="truncate">
                    {a.student?.user?.name ?? a.student?.name ?? a.studentId}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Bed-wise allocation modal */}
      {openRoomLive && (
        <RoomBedModal
          room={openRoomLive}
          allocations={allocByRoom[openRoomLive.id] || []}
          allocatedStudentIds={allocatedStudentIds}
          onClose={() => setOpenRoom(null)}
        />
      )}
    </div>
  );
}
