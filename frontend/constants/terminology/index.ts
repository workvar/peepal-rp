import type { TenantType } from "@/types/general/entities";
import { corporateTerminology } from "./corporate";
import { educationTerminology } from "./education";
import { healthcareTerminology } from "./healthcare";
import { nonprofitTerminology } from "./nonprofit";
import type { Terminology } from "./types";

export type { Terminology } from "./types";

// Map each (possibly legacy) TenantType to its canonical label bundle.
// Kept as a small lookup so callers never have to touch the aliasing rules.
export function getTerminology(type: TenantType | null | undefined): Terminology {
  switch (type) {
    case "corporate":
    case "enterprise":
      return corporateTerminology;
    case "healthcare":
      return healthcareTerminology;
    case "nonprofit":
      return nonprofitTerminology;
    case "education":
    case "college":
    default:
      return educationTerminology;
  }
}
