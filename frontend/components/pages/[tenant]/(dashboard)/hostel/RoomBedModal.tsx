"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { LIST_STUDENTS } from "@/graphql/queries/students";
import { useAppDispatch } from "@/store/hooks";
import { allocateRoom, vacateRoom, fetchRooms, fetchAllocations } from "@/store/slices/hostelSlice";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { cap, genderAllowed } from "./helpers";
import type { HostelAllocation, HostelRoom } from "@/types/general/entities";

interface StudentRow {
  id: string;
  rollNumber: string;
  gender?: string;
  user?: { name: string } | null;
  course?: { name: string } | null;
}

// Bed-wise allocation for one room. Each bed slot is clickable: an empty bed
// can be assigned a single eligible student; an occupied bed shows its
// occupant and can be vacated. Only students whose gender matches the block
// and who have no active allocation are offered.
export default function RoomBedModal({
  room,
  allocations,
  allocatedStudentIds,
  onClose,
}: {
  room: HostelRoom;
  allocations: HostelAllocation[]; // active allocations for THIS room
  allocatedStudentIds: Set<string>; // students with any active allocation
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const today = new Date().toISOString().split("T")[0];
  const [selectedBed, setSelectedBed] = useState<number | null>(null);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);

  const blockType = room.block?.type ?? "";

  const { data } = useQuery(LIST_STUDENTS);
  const students: StudentRow[] = data?.students ?? [];

  // Map each bed number to its occupant. Allocations missing a bed number
  // (legacy rows) fill the lowest free slots so the grid still reads sensibly.
  const bedMap = useMemo(() => {
    const m = new Map<number, HostelAllocation>();
    const legacy: HostelAllocation[] = [];
    for (const a of allocations) {
      if (a.bedNumber && a.bedNumber > 0) m.set(a.bedNumber, a);
      else legacy.push(a);
    }
    let slot = 1;
    for (const a of legacy) {
      while (m.has(slot) && slot <= room.capacity) slot++;
      if (slot <= room.capacity) m.set(slot, a);
    }
    return m;
  }, [allocations, room.capacity]);

  // Eligible students: gender matches the block and no active allocation.
  const eligible = useMemo(
    () =>
      students
        .filter((st) => !allocatedStudentIds.has(st.id))
        .filter((st) => genderAllowed(blockType, st.gender))
        .map((st) => ({
          value: st.id,
          label: st.user?.name ?? st.rollNumber,
          sublabel: `${st.rollNumber}${st.course?.name ? ` · ${st.course.name}` : ""}`,
        })),
    [students, allocatedStudentIds, blockType],
  );

  async function assign() {
    if (!selectedBed || !studentId) return;
    setBusy(true);
    const res = await dispatch(allocateRoom({ studentId, roomId: room.id, allocDate: today, bedNumber: selectedBed }));
    setBusy(false);
    if (allocateRoom.fulfilled.match(res)) {
      toast.success(`Assigned to bed ${selectedBed}`);
      setSelectedBed(null);
      setStudentId("");
      dispatch(fetchRooms());
      dispatch(fetchAllocations());
    } else {
      toast.error((res.payload as string) || "Could not assign bed");
    }
  }

  async function vacate(a: HostelAllocation) {
    if (!confirm("Vacate this bed?")) return;
    setBusy(true);
    const res = await dispatch(vacateRoom({ id: a.id, input: { vacateDate: today } }));
    setBusy(false);
    if (vacateRoom.fulfilled.match(res)) {
      toast.success("Bed vacated");
      dispatch(fetchRooms());
      dispatch(fetchAllocations());
    } else {
      toast.error((res.payload as string) || "Could not vacate");
    }
  }

  const beds = Array.from({ length: room.capacity }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-semibold">
            {room.block?.name} · Room {room.roomNumber}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {blockType ? <span className="capitalize">{cap(blockType)} block</span> : "Block"} ·{" "}
          {room.occupied}/{room.capacity} beds filled
          {blockType && blockType.toLowerCase() !== "mixed" && (
            <span> · only {blockType.toLowerCase().startsWith("g") ? "female" : "male"} students eligible</span>
          )}
        </p>

        {/* Bed grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {beds.map((n) => {
            const occ = bedMap.get(n);
            const selected = selectedBed === n;
            if (occ) {
              return (
                <div key={n} className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Bed {n}</span>
                    <button onClick={() => vacate(occ)} disabled={busy} className="text-rose-600 hover:underline">vacate</button>
                  </div>
                  <p className="mt-1 truncate font-medium text-foreground">
                    {occ.student?.user?.name ?? occ.student?.rollNumber ?? "Occupied"}
                  </p>
                  {occ.student?.rollNumber && <p className="text-muted-foreground truncate">{occ.student.rollNumber}</p>}
                </div>
              );
            }
            return (
              <button
                key={n}
                onClick={() => { setSelectedBed(n); setStudentId(""); }}
                className={`rounded-lg border p-2 text-xs text-left transition ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                }`}
              >
                <span className="font-semibold">Bed {n}</span>
                <p className="mt-1 text-muted-foreground">{selected ? "Selected" : "Empty · assign"}</p>
              </button>
            );
          })}
        </div>

        {/* Assign panel */}
        {selectedBed !== null && (
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-sm font-medium">Assign a student to bed {selectedBed}</p>
            <SearchableSelect
              options={eligible}
              value={studentId}
              onChange={setStudentId}
              placeholder="Select eligible student"
              searchPlaceholder="Search students…"
            />
            {eligible.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No eligible unallocated students for this block.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedBed(null)} className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button onClick={assign} disabled={busy || !studentId}
                className="btn-primary text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {busy ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
