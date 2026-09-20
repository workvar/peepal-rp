"use client";

import Modal from "@/components/ui/Modal";
import type { HolidaysPageState } from "./useHolidaysPage";
import { useTerminology } from "@/store/hooks/useTerminology";
import SearchableSelect from "@/components/ui/SearchableSelect";

// Attendance Settings modal (minimum percentage, grace period, lock window).
export function AttendanceSettingsModal({ s }: { s: HolidaysPageState }) {
  const { showSettings, setShowSettings, settingsForm, setSettingsForm } = s;
  return (
    <Modal title="Attendance Settings" isOpen={showSettings} onClose={() => setShowSettings(false)}>
      <form onSubmit={s.handleSaveSettings} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Minimum Attendance %</label>
          <input
            type="number" min="0" max="100" step="5" className="input-field"
            value={settingsForm.min_attendance_pct}
            onChange={(e) => setSettingsForm({ ...settingsForm, min_attendance_pct: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Grace Period (minutes)</label>
          <input
            type="number" min="0" className="input-field"
            value={settingsForm.grace_period_minutes}
            onChange={(e) => setSettingsForm({ ...settingsForm, grace_period_minutes: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Lock Attendance After (hours)</label>
          <input
            type="number" min="1" className="input-field"
            value={settingsForm.lock_after_hours}
            onChange={(e) => setSettingsForm({ ...settingsForm, lock_after_hours: e.target.value })}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">Save</button>
          <button type="button" className="btn-secondary flex-1" onClick={() => setShowSettings(false)}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// Copy selected holidays into another academic year (duplicates skipped).
export function CopyToAcademicYearModal({ s }: { s: HolidaysPageState }) {
  const { showCopyModal, setShowCopyModal, copyTargetAY, setCopyTargetAY, selected, academicYears } = s;
  const t = useTerminology();
  return (
    <Modal
      title={`Copy to ${t.year}`}
      isOpen={showCopyModal}
      onClose={() => { setShowCopyModal(false); setCopyTargetAY(""); }}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Copy {selected.size} selected holiday{selected.size !== 1 ? "s" : ""} to another {t.year.toLowerCase()}.
          Duplicates (same name and date) will be skipped.
        </p>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Target {t.year}
          </label>
          <SearchableSelect
            value={copyTargetAY}
            onChange={setCopyTargetAY}
            options={academicYears.map((ay) => ({ value: ay.id, label: ay.name }))}
            placeholder="— Select year —"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button
            className="btn-primary flex-1"
            disabled={!copyTargetAY}
            onClick={s.handleCopyToAY}
          >
            Copy
          </button>
          <button
            className="btn-secondary flex-1"
            onClick={() => { setShowCopyModal(false); setCopyTargetAY(""); }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
