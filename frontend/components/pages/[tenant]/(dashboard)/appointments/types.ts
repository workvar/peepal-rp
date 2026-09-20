// Shared types for the Appointments page (healthcare industry).

export type GqlAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  clinicianId: string;
  clinicianName: string;
  departmentId?: string | null;
  departmentName?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
  reason?: string | null;
  notes?: string | null;
  referredBy?: string | null;
  status: string;
  createdAt?: string | null;
};

export type AppointmentForm = {
  patient_id: string;
  clinician_id: string;
  department_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  referred_by: string;
};

export const emptyAppointmentForm: AppointmentForm = {
  patient_id: "",
  clinician_id: "",
  department_id: "",
  date: "",
  start_time: "",
  end_time: "",
  reason: "",
  referred_by: "",
};

export type PickerPatient = { id: string; mrn: string; firstName: string; lastName?: string | null };
export type PickerClinician = { id: string; designation?: string | null; user?: { name: string } | null };
export type PickerDepartment = { id: string; name: string };
