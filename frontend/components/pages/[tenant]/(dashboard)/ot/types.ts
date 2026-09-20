// Shared types for the OT scheduling page.

export type GqlTheatre = {
  id: string;
  code: string;
  name: string;
  location?: string | null;
  active: boolean;
};

export type GqlSurgery = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  theatreId: string;
  theatreName: string;
  surgeonId?: string | null;
  surgeonName?: string | null;
  procedureName: string;
  anesthesiaType?: string | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string | null;
};

export type TheatreForm = { code: string; name: string; location: string; active: boolean };
export const emptyTheatreForm: TheatreForm = { code: "", name: "", location: "", active: true };

export type SurgeryForm = {
  patient_id: string; theatre_id: string; surgeon_id: string; procedure_name: string;
  anesthesia_type: string; scheduled_date: string; start_time: string; end_time: string; notes: string;
};

export const emptySurgeryForm: SurgeryForm = {
  patient_id: "", theatre_id: "", surgeon_id: "", procedure_name: "",
  anesthesia_type: "", scheduled_date: "", start_time: "", end_time: "", notes: "",
};

export const surgeryStatusVariant = (s: string): "blue" | "yellow" | "green" | "gray" =>
  s === "completed" ? "green" : s === "in_progress" ? "yellow" : s === "cancelled" ? "gray" : "blue";
