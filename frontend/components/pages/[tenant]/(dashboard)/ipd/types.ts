// Shared types for IPD — wards, beds, and admissions. Used by both the Wards
// management page and the Admissions page.

export type GqlBed = {
  id: string;
  wardId: string;
  bedNumber: string;
  bay?: string | null;
  status: string; // available | occupied | maintenance
  dailyCharge: number;
  patientId?: string | null;
  patientName?: string | null;
  admissionId?: string | null;
};

export type GqlWard = {
  id: string;
  code: string;
  name: string;
  wardType: string;
  gender: string;
  floor?: string | null;
  active: boolean;
  bedCount: number;
  occupiedCount: number;
  beds: GqlBed[];
};

export type GqlTransfer = {
  id: string;
  fromBedNumber?: string | null;
  toBedNumber?: string | null;
  fromWardName?: string | null;
  toWardName?: string | null;
  transferDate?: string | null;
  reason?: string | null;
};

export type GqlAdmission = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  encounterId?: string | null;
  clinicianId?: string | null;
  clinicianName?: string | null;
  wardId?: string | null;
  wardName?: string | null;
  bedId?: string | null;
  bedNumber?: string | null;
  admissionDate: string;
  reason?: string | null;
  status: string; // admitted | discharged
  dischargeDate?: string | null;
  dischargeDiagnosis?: string | null;
  treatmentGiven?: string | null;
  conditionOnDischarge?: string | null;
  followUpInstructions?: string | null;
  transfers: GqlTransfer[];
};

export const WARD_TYPES = ["general", "icu", "hdu", "maternity", "pediatric", "private", "isolation"];
export const WARD_GENDERS = ["any", "male", "female"];

export const bedStatusVariant = (s: string): "green" | "red" | "yellow" =>
  s === "available" ? "green" : s === "occupied" ? "red" : "yellow";
