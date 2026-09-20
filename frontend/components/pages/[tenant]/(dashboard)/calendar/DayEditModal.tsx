"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { CalendarDay, CalendarDayType } from "@/types";
import { DAY_TYPE_LABEL, formatDateLong } from "./helpers";

interface Props {
  day: CalendarDay | null;
  onClose: () => void;
  onSave: (data: { date: string; type: CalendarDayType; name: string }) => Promise<void> | void;
  canEdit: boolean;
}

// The admin clicks a day on the calendar → this modal lets them mark it as a
// working day or any flavour of holiday, and give it a label.
const TYPES: CalendarDayType[] = [
  "working",
  "public",
  "institutional",
  "mandatory",
  "optional",
  "half_day",
  "weekend",
];

export default function DayEditModal({ day, onClose, onSave, canEdit }: Props) {
  const [type, setType] = useState<CalendarDayType>("working");
  const [name, setName] = useState("");

  useEffect(() => {
    if (day) {
      setType(day.type);
      setName(day.name);
    }
  }, [day]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!day) return;
    await onSave({ date: day.date, type, name });
    onClose();
  };

  return (
    <Modal title={day ? formatDateLong(day.date) : ""} isOpen={!!day} onClose={onClose}>
      {day && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Day Type
            </label>
            <select
              className="input-field"
              value={type}
              onChange={(e) => setType(e.target.value as CalendarDayType)}
              disabled={!canEdit}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {DAY_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          {type !== "working" && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Label
              </label>
              <input
                className="input-field"
                placeholder="e.g. Diwali, Sports Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          )}

          {day.auto_gen && (
            <p className="text-xs text-muted-foreground">
              Auto-generated from your weekend rules. Saving here will convert it
              into a manual entry.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            {canEdit ? (
              <>
                <button type="submit" className="btn-primary flex-1">Save</button>
                <button type="button" className="btn-secondary flex-1" onClick={onClose}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="btn-secondary w-full" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
