// Shared types for the Patients page (healthcare industry).

export type GqlPatient = {
  id: string;
  mrn: string;
  uhid?: string | null;
  firstName: string;
  lastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  status: string;
  registeredAt?: string | null;
  createdAt?: string | null;
};

export type PatientForm = {
  mrn: string; // "" = auto-generate
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  blood_group: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  emergency_name: string;
  emergency_phone: string;
  allergies: string;
  chronic_conditions: string;
  status: string;
};

export const emptyPatientForm: PatientForm = {
  mrn: "",
  first_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  blood_group: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  emergency_name: "",
  emergency_phone: "",
  allergies: "",
  chronic_conditions: "",
  status: "active",
};

export function patientName(p: { firstName: string; lastName?: string | null }): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}
