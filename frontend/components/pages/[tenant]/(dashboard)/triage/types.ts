// Shared types for the Emergency / Triage page.

export type GqlTriageCase = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  arrivalTime: string;
  chiefComplaint?: string | null;
  triageLevel: number;
  vitals?: string | null;
  assignedClinicianId?: string | null;
  assignedClinicianName?: string | null;
  status: string;
  disposition?: string | null;
  notes?: string | null;
};

export const TRIAGE_LEVELS = [
  { level: 1, label: "1 · Resuscitation", variant: "red" as const },
  { level: 2, label: "2 · Emergent", variant: "pink" as const },
  { level: 3, label: "3 · Urgent", variant: "yellow" as const },
  { level: 4, label: "4 · Less urgent", variant: "green" as const },
  { level: 5, label: "5 · Non-urgent", variant: "blue" as const },
];

export const DISPOSITIONS = ["admitted", "discharged", "referred", "lwbs", "deceased"];

export const levelVariant = (level: number): "red" | "pink" | "yellow" | "green" | "blue" =>
  TRIAGE_LEVELS.find((l) => l.level === level)?.variant ?? "yellow";

export const statusVariant = (s: string): "blue" | "yellow" | "gray" =>
  s === "in_treatment" ? "yellow" : s === "disposed" ? "gray" : "blue";

export type TriageForm = {
  patient_id: string; chief_complaint: string; triage_level: string;
  assigned_clinician_id: string; notes: string;
};

export const emptyTriageForm: TriageForm = {
  patient_id: "", chief_complaint: "", triage_level: "3", assigned_clinician_id: "", notes: "",
};
