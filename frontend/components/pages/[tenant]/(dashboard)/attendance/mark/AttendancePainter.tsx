"use client";

import toast from "react-hot-toast";
import StatusModeToggle from "./StatusModeToggle";
import AttendanceMonthCalendar from "./AttendanceMonthCalendar";
import { useMarkAttendance } from "./useMarkAttendance";
import type { EntityType } from "./types";

interface Props {
  entityType: EntityType;
  entityId: string;
  onSaved: () => void;
}

// The actual calendar workspace for one selected person. Mounted with a key of
// the entity id (see MarkAttendanceModal) so its state resets per person.
export default function AttendancePainter({ entityType, entityId, onSaved }: Props) {
  const cal = useMarkAttendance(entityType, entityId);

  async function handleSave() {
    try {
      await cal.save();
      toast.success(
        cal.total > 0 ? `Saved ${cal.total} day${cal.total === 1 ? "" : "s"}` : "Attendance saved"
      );
      onSaved();
    } catch {
      toast.error("Failed to save attendance");
    }
  }

  return (
    <div className="space-y-4">
      <StatusModeToggle value={cal.mode} onChange={cal.setMode} />

      <AttendanceMonthCalendar
        year={cal.cursor.year}
        month={cal.cursor.month}
        marks={cal.marks}
        today={cal.today}
        onToggleDay={cal.toggleDay}
        onPrev={() => cal.goToMonth(-1)}
        onNext={() => cal.goToMonth(1)}
      />

      {/* Selection summary */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <Tally color="bg-emerald-500" label="Present" n={cal.counts.present} />
        <Tally color="bg-red-500" label="Absent" n={cal.counts.absent} />
        <Tally color="bg-amber-500" label="Late" n={cal.counts.late} />
        <span className="ml-auto text-muted-foreground">
          {cal.total} day{cal.total === 1 ? "" : "s"} marked
        </span>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          className="btn-primary flex-1 disabled:opacity-60"
          onClick={handleSave}
          disabled={cal.saving || cal.total === 0}
        >
          {cal.saving ? "Saving…" : "Save Attendance"}
        </button>
      </div>
    </div>
  );
}

function Tally({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm ${color}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{n}</span>
    </span>
  );
}
