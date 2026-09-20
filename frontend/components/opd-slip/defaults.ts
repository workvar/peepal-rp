// Default OPD slip design — what a hospital gets before an admin customises
// anything. Modelled on a standard Indian OPD consultation slip: branding
// block, two-column identity grid, blank space for the doctor's notes.

import type { OpdSlipConfig, SlipField } from "./types";
import { builtinLabel } from "./fields";

/** Helper so the default list stays readable. */
const auto = (key: string, label?: string): SlipField => ({
  key,
  label: label ?? builtinLabel(key),
  enabled: true,
  source: "auto",
});

const off = (key: string): SlipField => ({ ...auto(key), enabled: false });

export const DEFAULT_SLIP_CONFIG: OpdSlipConfig = {
  paperSize: "A4",
  showLogo: true,
  logoUrl: "",
  hospitalName: "",
  addressLines: [],
  showDoctorBlock: true,
  doctorBlockLines: [],
  accentColor: "#1d4ed8",
  fields: [
    auto("patientName"),
    auto("patientMrn"),
    auto("ageSex"),
    auto("date"),
    auto("time"),
    auto("clinicianName"),
    auto("department"),
    auto("referredBy"),
    auto("slipNo"),
    auto("allergies"),
    off("patientUhid"),
    off("bloodGroup"),
    off("phone"),
    off("address"),
    off("chronicConditions"),
    off("reason"),
    off("location"),
  ],
  showNotes: true,
  notesLabel: "Doctor's Notes / Rx",
  notesHeightMm: 110,
  showQr: true,
  showBarcode: true,
  showFooter: true,
  footerLines: ["This slip must be carried on every visit."],
  showSignatureLine: true,
  signatureLabel: "Doctor's Signature",
};

/**
 * Parses a stored config, filling in anything a newer app version added and
 * dropping nothing the admin saved. Bad JSON falls back to the defaults so the
 * print page always renders something.
 */
export function parseSlipConfig(raw?: string | null): OpdSlipConfig {
  if (!raw) return DEFAULT_SLIP_CONFIG;
  try {
    const saved = JSON.parse(raw) as Partial<OpdSlipConfig>;
    return {
      ...DEFAULT_SLIP_CONFIG,
      ...saved,
      fields: mergeFields(saved.fields),
    };
  } catch {
    return DEFAULT_SLIP_CONFIG;
  }
}

/**
 * Keeps the admin's saved order and choices, then appends any built-in field
 * added by a later release (disabled, so nothing changes without a decision).
 */
function mergeFields(saved?: SlipField[]): SlipField[] {
  if (!saved || saved.length === 0) return DEFAULT_SLIP_CONFIG.fields;
  const seen = new Set(saved.map((f) => f.key));
  const added = DEFAULT_SLIP_CONFIG.fields
    .filter((f) => !seen.has(f.key))
    .map((f) => ({ ...f, enabled: false }));
  return [...saved, ...added];
}
