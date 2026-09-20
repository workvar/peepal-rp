"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_CLINICIAN_SCHEDULES, LIST_CLINICIANS } from "@/graphql/queries/clinical";
import {
  CREATE_CLINICIAN_SCHEDULE,
  UPDATE_CLINICIAN_SCHEDULE,
  DELETE_CLINICIAN_SCHEDULE,
} from "@/graphql/mutations/clinical";
import type { GqlClinicianSchedule } from "./types";
import type { PickerClinician } from "../appointments/types";

const refetchQueries = [{ query: LIST_CLINICIAN_SCHEDULES, variables: {} }];

export function useSchedules() {
  const { data, loading, refetch } = useQuery(LIST_CLINICIAN_SCHEDULES, { variables: {} });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const [createMut] = useMutation(CREATE_CLINICIAN_SCHEDULE, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_CLINICIAN_SCHEDULE, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_CLINICIAN_SCHEDULE, { refetchQueries });

  const schedules: GqlClinicianSchedule[] = data?.clinicianSchedules ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  return { schedules, clinicians, loading, refetch, createMut, updateMut, deleteMut };
}
