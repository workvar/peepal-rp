// Shared types for the Clinician Schedules page.

export type GqlClinicianSchedule = {
  id: string;
  clinicianId: string;
  clinicianName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  active: boolean;
};

export type ScheduleForm = {
  clinician_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_minutes: string;
  active: boolean;
};

export const emptyScheduleForm: ScheduleForm = {
  clinician_id: "",
  day_of_week: "1",
  start_time: "09:00",
  end_time: "13:00",
  slot_minutes: "15",
  active: true,
};

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
