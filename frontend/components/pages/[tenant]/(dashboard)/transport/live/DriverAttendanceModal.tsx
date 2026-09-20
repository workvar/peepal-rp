"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import type { GqlLiveVehicle } from "./types";
import SearchableSelect from "@/components/ui/SearchableSelect";

export type DriverForm = {
  employee_id: string;
  vehicle_id: string;
  date: string;
  check_in_at: string;
  check_out_at: string;
  status: string;
};

export type PickerEmployee = { id: string; user?: { name: string } | null; designation?: string | null };

export default function DriverAttendanceModal({
  isOpen,
  date,
  employees,
  vehicles,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  date: string;
  employees: PickerEmployee[];
  vehicles: GqlLiveVehicle[];
  onClose: () => void;
  onSave: (form: DriverForm) => Promise<void>;
}) {
  const [form, setForm] = useState<DriverForm>({
    employee_id: "", vehicle_id: "", date, check_in_at: "", check_out_at: "", status: "present",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ employee_id: "", vehicle_id: "", date, check_in_at: "", check_out_at: "", status: "present" });
  }, [isOpen, date]);

  const set = (patch: Partial<DriverForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record Driver Attendance" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">Driver</label>
          <SearchableSelect
            required
            value={form.employee_id}
            onChange={(v) => set({ employee_id: v })}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.user?.name ?? "Unnamed"}${e.designation ? ` — ${e.designation}` : ""}`,
            }))}
            placeholder="Select employee…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Vehicle</label>
            <SearchableSelect
              value={form.vehicle_id}
              onChange={(v) => set({ vehicle_id: v })}
              options={vehicles.map((v) => ({ value: v.id, label: v.vehicleNumber }))}
              placeholder="None"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
            <input type="date" className="input-field" required value={form.date}
              onChange={(e) => set({ date: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Check In</label>
            <input type="time" className="input-field" value={form.check_in_at}
              onChange={(e) => set({ check_in_at: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Check Out</label>
            <input type="time" className="input-field" value={form.check_out_at}
              onChange={(e) => set({ check_out_at: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Status</label>
            <select className="input-field" value={form.status}
              onChange={(e) => set({ status: e.target.value })}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
