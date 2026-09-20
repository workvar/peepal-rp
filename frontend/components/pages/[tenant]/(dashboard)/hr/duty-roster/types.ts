// Shared types for the Duty Roster page (cross-industry HR).

export type GqlDutyShift = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  shiftName?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

export type PickerEmployee = {
  id: string;
  designation?: string | null;
  user?: { name: string } | null;
  department?: { id: string; name: string } | null;
};

export type RosterForm = {
  employee_id: string;
  date: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
};

export const emptyRosterForm: RosterForm = {
  employee_id: "",
  date: new Date().toISOString().slice(0, 10),
  shift_name: "",
  start_time: "09:00",
  end_time: "17:00",
  location: "",
  notes: "",
};

export const SHIFT_PRESETS = ["Morning", "Evening", "Night"];

export function employeeLabel(e: PickerEmployee): string {
  const name = e.user?.name ?? "Unnamed";
  return e.designation ? `${name} — ${e.designation}` : name;
}
