"use client";

import { DAYS } from "@/store/slices/timetableSlice";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Plus, Edit2, Trash2, Clock, LayoutGrid } from "lucide-react";
import { type TimetableSlot, DAY_COLORS, DAY_TEXT, formatTime } from "./types";
import Can from "@/components/access/Can";
import type { TimetablePageState } from "./useTimetablePage";

// ── SlotCard ───────────────────────────────────────────────────────────────

function SlotCard({
  slot, onEdit, onDelete, isAdmin,
}: {
  slot: TimetableSlot;
  onEdit: (s: TimetableSlot) => void;
  onDelete: (s: TimetableSlot) => void;
  isAdmin: boolean;
}) {
  const day = slot.dayOfWeek;
  return (
    <div
      className="group relative rounded-2xl p-3 text-sm transition-all duration-150 hover:-translate-y-0.5"
      style={{
        background: DAY_COLORS[day],
        border: `1px solid ${DAY_TEXT[day]}22`,
      }}
    >
      {/* Actions */}
      {isAdmin && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Can module="timetable" action="edit">
            <button
              onClick={() => onEdit(slot)}
              className="w-6 h-6 rounded-lg flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 size={11} />
            </button>
          </Can>
          <Can module="timetable" action="delete">
            <button
              onClick={() => onDelete(slot)}
              className="w-6 h-6 rounded-lg flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 size={11} />
            </button>
          </Can>
        </div>
      )}

      <p className="font-semibold text-foreground text-xs leading-tight pr-12 truncate">
        {slot.subject?.name ?? "—"}
      </p>
      {slot.subject?.code && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{slot.subject.code}</p>
      )}
      <div className="flex items-center gap-1 mt-2">
        <Clock size={10} style={{ color: DAY_TEXT[day] }} />
        <span className="text-[10px]" style={{ color: DAY_TEXT[day] }}>
          {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
        </span>
      </div>
      {slot.room && (
        <p className="text-[10px] text-muted-foreground mt-0.5">Room: {slot.room}</p>
      )}
    </div>
  );
}

// ── Weekly grid ────────────────────────────────────────────────────────────

export default function TimetableGrid({ page }: { page: TimetablePageState }) {
  const { courseId, loading, slotsByDay, canEdit, openCreate, openEdit, handleDelete } = page;

  if (!courseId) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <LayoutGrid size={40} className="text-muted-foreground opacity-30 mb-3" />
        <p className="text-muted-foreground text-sm font-medium">Select a course to view the timetable</p>
      </div>
    );
  }

  if (loading) {
    return <div className="card"><LoadingSpinner text="Loading timetable…" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
      {DAYS.map((day) => {
        const daySlots = slotsByDay[day] ?? [];
        return (
          <div
            key={day}
            className="card p-0 overflow-hidden"
          >
            {/* Day header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{
                background: DAY_COLORS[day],
                borderBottom: `1px solid ${DAY_TEXT[day]}22`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-bold"
                  style={{ color: DAY_TEXT[day] }}
                >
                  {day}
                </span>
                <span className="badge badge-ghost text-[10px]">
                  {daySlots.length} {daySlots.length === 1 ? "class" : "classes"}
                </span>
              </div>
              {canEdit && (
                <Can module="timetable" action="create">
                  <button
                    onClick={() => openCreate(day)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                </Can>
              )}
            </div>

            {/* Slots */}
            <div className="p-3 space-y-2 min-h-[80px]">
              {daySlots.length === 0 ? (
                <div className="flex items-center justify-center h-12 text-xs text-muted-foreground opacity-50">
                  No classes scheduled
                </div>
              ) : (
                daySlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    isAdmin={canEdit}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
