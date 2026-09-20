"use client";

import { useQuery, useMutation } from "@apollo/client";
import {
  LIST_APPOINTMENTS,
  LIST_CLINICIANS,
  LIST_PATIENT_OPTIONS,
} from "@/graphql/queries/clinical";
import { LIST_DEPARTMENTS } from "@/graphql/queries/employees";
import {
  CREATE_APPOINTMENT,
  UPDATE_APPOINTMENT,
  DELETE_APPOINTMENT,
} from "@/graphql/mutations/clinical";
import type {
  GqlAppointment,
  PickerPatient,
  PickerClinician,
  PickerDepartment,
} from "./types";

const refetchQueries = [{ query: LIST_APPOINTMENTS, variables: {} }];

export function useAppointments() {
  const { data, loading, refetch } = useQuery(LIST_APPOINTMENTS, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);
  const { data: deptData } = useQuery(LIST_DEPARTMENTS);

  const [createMut] = useMutation(CREATE_APPOINTMENT, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_APPOINTMENT, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_APPOINTMENT, { refetchQueries });

  const appointments: GqlAppointment[] = data?.appointments ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];
  const departments: PickerDepartment[] = deptData?.departments ?? [];

  return {
    appointments, patients, clinicians, departments,
    loading, refetch, createMut, updateMut, deleteMut,
  };
}
