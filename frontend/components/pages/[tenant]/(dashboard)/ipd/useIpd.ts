"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_WARDS, LIST_ADMISSIONS } from "@/graphql/queries/diagnostics";
import { LIST_PATIENT_OPTIONS, LIST_CLINICIANS } from "@/graphql/queries/clinical";
import {
  CREATE_ADMISSION,
  TRANSFER_ADMISSION,
  DISCHARGE_ADMISSION,
} from "@/graphql/mutations/diagnostics";
import type { GqlWard, GqlAdmission } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";

export function useIpd() {
  // "current" toggles between admitted-only and full history.
  const [showDischarged, setShowDischarged] = useState(false);
  const admissionVars = showDischarged ? { status: "discharged" } : {};

  const wardVars = { includeInactive: false };
  const refetchQueries = [
    { query: LIST_WARDS, variables: wardVars },
    { query: LIST_ADMISSIONS, variables: {} },
    { query: LIST_ADMISSIONS, variables: { status: "discharged" } },
  ];

  const { data: wardData, loading: wardsLoading } = useQuery(LIST_WARDS, { variables: wardVars });
  const { data: admData, loading: admLoading } = useQuery(LIST_ADMISSIONS, { variables: admissionVars });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const [admitMut] = useMutation(CREATE_ADMISSION, { refetchQueries });
  const [transferMut] = useMutation(TRANSFER_ADMISSION, { refetchQueries });
  const [dischargeMut] = useMutation(DISCHARGE_ADMISSION, { refetchQueries });

  const wards: GqlWard[] = wardData?.wards ?? [];
  const admissions: GqlAdmission[] = admData?.admissions ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  return {
    wards, admissions, patients, clinicians,
    loading: wardsLoading || admLoading,
    showDischarged, setShowDischarged,
    admitMut, transferMut, dischargeMut,
  };
}
