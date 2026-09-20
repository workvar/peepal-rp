// Shared types for the printable OPD slip and its configurator.
//
// The whole design is one JSON blob stored per tenant (GraphQL
// opdSlipConfig / updateOpdSlipConfig). Keeping it as JSON means adding a new
// slip option never needs a backend migration.

/** One printed row on the slip. */
export type SlipField = {
  /** Built-in key (see fields.ts) or "custom:<uuid>" for admin-added rows. */
  key: string;
  /** Printed label, editable by the admin (e.g. "MaxId" instead of "MRN"). */
  label: string;
  /** Unticked fields are simply not printed. */
  enabled: boolean;
  /**
   * auto  — value filled from the appointment/patient/org record.
   * blank — printed as an empty ruled line for the front desk or doctor to
   *         fill by hand.
   * fixed — always prints `value` (e.g. a ward name or a standing note).
   */
  source: "auto" | "blank" | "fixed";
  /** Used when source is "fixed". */
  value?: string;
};

export type OpdSlipConfig = {
  /** Paper the slip is laid out for. */
  paperSize: "A4" | "A5";
  /** Header branding. */
  showLogo: boolean;
  logoUrl: string;
  /** Blank falls back to the org profile name. */
  hospitalName: string;
  addressLines: string[];
  /** Right-hand header block (doctor name + credentials, booking phone…). */
  showDoctorBlock: boolean;
  doctorBlockLines: string[];
  accentColor: string;
  /** Ordered field rows printed in the two-column identity grid. */
  fields: SlipField[];
  /** Blank space the doctor writes in. */
  showNotes: boolean;
  notesLabel: string;
  /** Height of the writing space in millimetres. */
  notesHeightMm: number;
  /** Codes printed for scanning at the counter. */
  showQr: boolean;
  showBarcode: boolean;
  /** Footer. */
  showFooter: boolean;
  footerLines: string[];
  showSignatureLine: boolean;
  signatureLabel: string;
};

/** Everything the slip can print, gathered by the print page. */
export type SlipAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  clinicianName: string;
  departmentName?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
  reason?: string | null;
  referredBy?: string | null;
  status: string;
};

export type SlipPatient = {
  id: string;
  mrn: string;
  uhid?: string | null;
  firstName: string;
  lastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
};

export type SlipOrg = {
  name: string;
  logoUrl: string;
  tagline: string;
  accreditation: string;
};

export type SlipData = {
  appointment: SlipAppointment;
  patient?: SlipPatient | null;
  org?: SlipOrg | null;
};
