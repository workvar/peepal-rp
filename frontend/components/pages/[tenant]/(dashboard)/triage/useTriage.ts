"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { LIST_TRIAGE_CASES } from "@/graphql/queries/operations";
import { LIST_PATIENT_OPTIONS, LIST_CLINICIANS } from "@/graphql/queries/clinical";
import { CREATE_TRIAGE_CASE, UPDATE_TRIAGE_CASE } from "@/graphql/mutations/operations";
import type { GqlTriageCase } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";

export function useTriage() {
  const [showDisposed, setShowDisposed] = useState(false);
  const vars = showDisposed ? { status: "disposed" } : {};
  const refetchQueries = [
    { query: LIST_TRIAGE_CASES, variables: {} },
    { query: LIST_TRIAGE_CASES, variables: { status: "disposed" } },
  ];

  const { data, loading } = useQuery(LIST_TRIAGE_CASES, { variables: vars });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const [createMut] = useMutation(CREATE_TRIAGE_CASE, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_TRIAGE_CASE, { refetchQueries });

  const cases: GqlTriageCase[] = data?.triageCases ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  return { cases, patients, clinicians, loading, showDisposed, setShowDisposed, createMut, updateMut };
}
