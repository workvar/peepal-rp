import type { SelectOption } from "@/components/ui/SearchableSelect";
import type { PickerClinician } from "../appointments/types";

/** Clinicians as SearchableSelect options (name + designation as sublabel). */
export function clinicianOptions(clinicians: PickerClinician[]): SelectOption[] {
  return clinicians.map((c) => ({
    value: c.id,
    label: c.user?.name ?? "Unknown",
    sublabel: c.designation ?? undefined,
  }));
}

/** Same list shaped for the bulk-upload dialog's dropdown cells. */
export function clinicianBulkOptions(clinicians: PickerClinician[]) {
  return clinicians.map((c) => ({
    value: c.id,
    label: c.user?.name ?? "Unknown",
  }));
}

export const DAY_BULK_OPTIONS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
].map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }));
