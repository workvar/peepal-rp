"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_OPERATION_THEATRES, LIST_SURGERIES } from "@/graphql/queries/operations";
import { LIST_PATIENT_OPTIONS, LIST_CLINICIANS } from "@/graphql/queries/clinical";
import {
  CREATE_OPERATION_THEATRE, UPDATE_OPERATION_THEATRE, DELETE_OPERATION_THEATRE,
  SCHEDULE_SURGERY, SET_SURGERY_STATUS, CANCEL_SURGERY,
} from "@/graphql/mutations/operations";
import type { GqlTheatre, GqlSurgery } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";

const THEATRE_VARS = { includeInactive: true };
const refetchQueries = [
  { query: LIST_OPERATION_THEATRES, variables: THEATRE_VARS },
  { query: LIST_SURGERIES, variables: {} },
];

export function useOt() {
  const { data: theatreData, loading: theatresLoading, refetch: refetchTheatres } = useQuery(LIST_OPERATION_THEATRES, { variables: THEATRE_VARS });
  const { data: surgeryData, loading: surgeriesLoading } = useQuery(LIST_SURGERIES, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const [createTheatreMut] = useMutation(CREATE_OPERATION_THEATRE, { refetchQueries });
  const [updateTheatreMut] = useMutation(UPDATE_OPERATION_THEATRE, { refetchQueries });
  const [deleteTheatreMut] = useMutation(DELETE_OPERATION_THEATRE, { refetchQueries });
  const [scheduleMut] = useMutation(SCHEDULE_SURGERY, { refetchQueries });
  const [setStatusMut] = useMutation(SET_SURGERY_STATUS, { refetchQueries });
  const [cancelMut] = useMutation(CANCEL_SURGERY, { refetchQueries });

  const theatres: GqlTheatre[] = theatreData?.operationTheatres ?? [];
  const surgeries: GqlSurgery[] = surgeryData?.surgeries ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  return {
    theatres, surgeries, patients, clinicians, refetchTheatres,
    loading: theatresLoading || surgeriesLoading,
    createTheatreMut, updateTheatreMut, deleteTheatreMut, scheduleMut, setStatusMut, cancelMut,
  };
}
