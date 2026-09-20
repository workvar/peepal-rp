// Shared types for the OPD Visits (encounters) page.

export type GqlEncounter = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientAllergies?: string | null;
  clinicianId: string;
  clinicianName: string;
  appointmentId?: string | null;
  crNumber?: string | null;
  visitType: string;
  visitDate: string;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  vitals?: string | null; // JSON string: { bp, pulse, temp_c, spo2, weight_kg }
  prescription?: string | null;
  notes?: string | null;
  followUpDate?: string | null;
  status: string;
  createdAt?: string | null;
};

export type Vitals = {
  bp: string;
  pulse: string;
  temp_c: string;
  spo2: string;
  weight_kg: string;
};

export const emptyVitals: Vitals = { bp: "", pulse: "", temp_c: "", spo2: "", weight_kg: "" };

export type EncounterForm = {
  patient_id: string;
  clinician_id: string;
  visit_date: string;
  chief_complaint: string;
  diagnosis: string;
  vitals: Vitals;
  prescription: string;
  notes: string;
  follow_up_date: string;
  status: string;
};

export const emptyEncounterForm: EncounterForm = {
  patient_id: "",
  clinician_id: "",
  visit_date: "",
  chief_complaint: "",
  diagnosis: "",
  vitals: emptyVitals,
  prescription: "",
  notes: "",
  follow_up_date: "",
  status: "open",
};

export function parseVitals(json?: string | null): Vitals {
  if (!json) return emptyVitals;
  try {
    const v = JSON.parse(json);
    return {
      bp: String(v.bp ?? ""),
      pulse: String(v.pulse ?? ""),
      temp_c: String(v.temp_c ?? ""),
      spo2: String(v.spo2 ?? ""),
      weight_kg: String(v.weight_kg ?? ""),
    };
  } catch {
    return emptyVitals;
  }
}

export function serializeVitals(v: Vitals): string | null {
  const entries = Object.entries(v).filter(([, val]) => val !== "");
  if (entries.length === 0) return null;
  return JSON.stringify(Object.fromEntries(entries));
}
