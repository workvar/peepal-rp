"use client";

import { useQuery, useMutation } from "@apollo/client";
import {
  LIST_ENCOUNTERS,
  LIST_CLINICIANS,
  LIST_PATIENT_OPTIONS,
} from "@/graphql/queries/clinical";
import {
  CREATE_ENCOUNTER,
  UPDATE_ENCOUNTER,
  DELETE_ENCOUNTER,
} from "@/graphql/mutations/clinical";
import type { GqlEncounter } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";

const refetchQueries = [{ query: LIST_ENCOUNTERS, variables: {} }];

export function useEncounters() {
  const { data, loading, refetch } = useQuery(LIST_ENCOUNTERS, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const [createMut] = useMutation(CREATE_ENCOUNTER, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_ENCOUNTER, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_ENCOUNTER, { refetchQueries });

  const encounters: GqlEncounter[] = data?.encounters ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  return { encounters, patients, clinicians, loading, refetch, createMut, updateMut, deleteMut };
}
