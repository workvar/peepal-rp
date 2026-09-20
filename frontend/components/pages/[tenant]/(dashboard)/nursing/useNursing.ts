"use client";

import { useQuery } from "@apollo/client";
import { LIST_ADMISSIONS } from "@/graphql/queries/diagnostics";
import { LIST_CLINICIANS } from "@/graphql/queries/clinical";
import type { GqlAdmission } from "../ipd/types";
import type { PickerClinician } from "../appointments/types";

// Nursing works on currently-admitted patients; it reuses the IPD admissions
// query (default = admitted) to build the patient list.
export function useNursing() {
  const { data, loading } = useQuery(LIST_ADMISSIONS, { variables: {} });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const admissions: GqlAdmission[] = data?.admissions ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  return { admissions, clinicians, loading };
}
