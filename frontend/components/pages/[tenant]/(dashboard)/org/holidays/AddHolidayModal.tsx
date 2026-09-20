"use client";

import Modal from "@/components/ui/Modal";
import type { HolidaysPageState } from "./useHolidaysPage";
import { useTerminology } from "@/store/hooks/useTerminology";
import SearchableSelect from "@/components/ui/SearchableSelect";

// Add Holiday modal with a single-date / date-range toggle.
export default function AddHolidayModal({ s }: { s: HolidaysPageState }) {
  const { showAdd, setShowAdd, isRange, setIsRange, form, setForm, academicYears } = s;
  const t = useTerminology();
  return (
    <Modal
      title="Add Holiday"
      isOpen={showAdd}
      onClose={() => { setShowAdd(false); setIsRange(false); }}
    >
      <form onSubmit={s.handleAdd} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Name</label>
          <input
            className="input-field"
            placeholder="e.g. Independence Day"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        {/* Date / Range toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRange(false)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              !isRange
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Single date
          </button>
          <button
            type="button"
            onClick={() => setIsRange(true)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              isRange
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Date range
          </button>
        </div>

        {!isRange ? (
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Start Date</label>
              <input
                type="date"
                className="input-field"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">End Date</label>
              <input
                type="date"
                className="input-field"
                value={form.end_date}
                min={form.start_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Type</label>
            <select
              className="input-field"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="institutional">Institutional</option>
              <option value="public">Public</option>
              <option value="mandatory">Mandatory</option>
              <option value="optional">Optional</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">{t.year}</label>
            <SearchableSelect
              value={form.academic_year_id}
              onChange={(v) => setForm({ ...form, academic_year_id: v })}
              options={academicYears.map((ay) => ({ value: ay.id, label: ay.name }))}
              placeholder="— All —"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">Add</button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => { setShowAdd(false); setIsRange(false); }}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
