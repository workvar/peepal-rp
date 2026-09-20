// Built-in slip fields: what an admin can tick on, and how each value is
// pulled from the appointment / patient / org records at print time.
//
// Add a new printable data point by adding one entry here — the configurator
// picks it up automatically.

import type { SlipData } from "./types";

export type BuiltinField = {
  key: string;
  /** Default printed label; the admin may rename it per tenant. */
  label: string;
  /** Grouping shown in the configurator. */
  group: "Patient" | "Visit" | "Clinician";
  /** Pulls the printed value, or "" when the record has nothing. */
  read: (d: SlipData) => string;
};

/** Age in whole years from a YYYY-MM-DD date of birth. */
export function ageFromDob(dob?: string | null): string {
  if (!dob) return "";
  const born = new Date(dob + "T00:00:00");
  if (Number.isNaN(born.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) years -= 1;
  return years >= 0 ? `${years} year(s)` : "";
}

/** "37 year(s) / Male" — the age/sex line hospitals print as one cell. */
function ageSex(d: SlipData): string {
  const age = ageFromDob(d.patient?.dateOfBirth);
  const sex = d.patient?.gender ?? "";
  return [age, sex].filter(Boolean).join(" / ");
}

/** Human date: 14-Sep-2024, matching the printed slips clerks are used to. */
export function prettyDate(iso: string): string {
  if (!iso) return "";
  const dt = new Date(iso + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(dt.getDate()).padStart(2, "0")}-${months[dt.getMonth()]}-${dt.getFullYear()}`;
}

/** "09:30 AM" from a 24h HH:MM slot time. */
export function prettyTime(hhmm: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

/** Short, human-quotable slip number derived from the appointment id. */
export function slipNumber(appointmentId: string): string {
  return appointmentId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export const BUILTIN_FIELDS: BuiltinField[] = [
  { key: "patientName", label: "Patient Name", group: "Patient",
    read: (d) => d.appointment.patientName },
  { key: "patientMrn", label: "MRN / Patient ID", group: "Patient",
    read: (d) => d.appointment.patientMrn },
  { key: "patientUhid", label: "UHID", group: "Patient",
    read: (d) => d.patient?.uhid ?? "" },
  { key: "ageSex", label: "Age / Sex", group: "Patient", read: ageSex },
  { key: "bloodGroup", label: "Blood Group", group: "Patient",
    read: (d) => d.patient?.bloodGroup ?? "" },
  { key: "phone", label: "Contact No", group: "Patient",
    read: (d) => d.patient?.phone ?? "" },
  { key: "address", label: "Address", group: "Patient",
    read: (d) => [d.patient?.address, d.patient?.city].filter(Boolean).join(", ") },
  { key: "allergies", label: "Allergy", group: "Patient",
    read: (d) => d.patient?.allergies || "No Known Allergy" },
  { key: "chronicConditions", label: "Known Conditions", group: "Patient",
    read: (d) => d.patient?.chronicConditions ?? "" },

  { key: "slipNo", label: "Slip No", group: "Visit",
    read: (d) => slipNumber(d.appointment.id) },
  { key: "date", label: "Date", group: "Visit",
    read: (d) => prettyDate(d.appointment.date) },
  { key: "time", label: "Time", group: "Visit",
    read: (d) => prettyTime(d.appointment.startTime) },
  { key: "reason", label: "Reason for Visit", group: "Visit",
    read: (d) => d.appointment.reason ?? "" },
  { key: "referredBy", label: "Referred By", group: "Visit",
    read: (d) => d.appointment.referredBy || "SELF" },
  { key: "location", label: "Location", group: "Visit",
    read: (d) => d.org?.name ?? "" },

  { key: "clinicianName", label: "Doctor Name", group: "Clinician",
    read: (d) => d.appointment.clinicianName },
  { key: "department", label: "Department", group: "Clinician",
    read: (d) => d.appointment.departmentName ?? "" },
];

const BY_KEY = new Map(BUILTIN_FIELDS.map((f) => [f.key, f]));

/** Default label for a key, used when the configurator adds a field. */
export function builtinLabel(key: string): string {
  return BY_KEY.get(key)?.label ?? key;
}

/** Whether a field key is admin-defined rather than built in. */
export function isCustomKey(key: string): boolean {
  return key.startsWith("custom:");
}

/**
 * The value to print for one configured field. Blank/fixed/custom rows never
 * read the record; auto rows read their built-in reader.
 */
export function readFieldValue(
  field: { key: string; source: string; value?: string },
  data: SlipData,
): string {
  if (field.source === "blank") return "";
  if (field.source === "fixed") return field.value ?? "";
  return BY_KEY.get(field.key)?.read(data) ?? "";
}
