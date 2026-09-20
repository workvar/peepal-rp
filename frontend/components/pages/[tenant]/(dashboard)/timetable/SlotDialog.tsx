"use client";

import { DAYS, type DayOfWeek } from "@/store/slices/timetableSlice";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogDivider, DialogBody,
  DialogFooter, DialogField,
} from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import type { TimetablePageState } from "./useTimetablePage";

// Add / edit slot dialog.
export default function SlotDialog({ page }: { page: TimetablePageState }) {
  const {
    dialogOpen, setDialogOpen, editingSlot,
    form, setForm, saving, subjects, handleSave,
  } = page;

  return (
    <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false); }}>
      <DialogContent size="sm" accent={editingSlot ? "cyan" : "violet"} onClose={() => setDialogOpen(false)}>
        <DialogHeader icon={<Clock size={16} style={{ color: editingSlot ? "#0891b2" : "#1f5d36" }} />}>
          <DialogTitle>{editingSlot ? "Edit Slot" : "Add Slot"}</DialogTitle>
          <DialogDescription>
            {editingSlot ? "Update this timetable entry." : "Schedule a new class period."}
          </DialogDescription>
        </DialogHeader>
        <DialogDivider />

        <form onSubmit={handleSave}>
          <DialogBody className="space-y-4">
            {/* Day */}
            <DialogField label="Day of Week" required>
              <select
                className="input-field"
                value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value as DayOfWeek })}
              >
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </DialogField>

            {/* Subject */}
            <DialogField label="Subject" required>
              <select
                className="input-field"
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </DialogField>

            {/* Time row */}
            <div className="grid grid-cols-2 gap-3">
              <DialogField label="Start Time" required>
                <input
                  type="time"
                  className="input-field"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </DialogField>
              <DialogField label="End Time" required>
                <input
                  type="time"
                  className="input-field"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </DialogField>
            </div>

            {/* Period & Room */}
            <div className="grid grid-cols-2 gap-3">
              <DialogField label="Period #">
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="input-field"
                  value={form.periodNumber}
                  onChange={(e) => setForm({ ...form, periodNumber: e.target.value })}
                />
              </DialogField>
              <DialogField label="Room / Lab">
                <input
                  className="input-field"
                  placeholder="e.g. 201, Lab-A"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                />
              </DialogField>
            </div>
          </DialogBody>

          <DialogFooter>
            <button type="button" onClick={() => setDialogOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : editingSlot ? "Update Slot" : "Add Slot"
              }
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
