"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_DUTY_ROSTER, LIST_EMPLOYEE_OPTIONS } from "@/graphql/queries/hr";
import { CREATE_DUTY_ROSTER, UPDATE_DUTY_ROSTER, DELETE_DUTY_ROSTER } from "@/graphql/mutations/hr";
import type { GqlDutyShift, PickerEmployee } from "./types";

export function useDutyRoster(from: string, to: string) {
  const variables = { from, to };
  const refetchQueries = [{ query: LIST_DUTY_ROSTER, variables }];

  const { data, loading, refetch } = useQuery(LIST_DUTY_ROSTER, { variables });
  const { data: employeeData } = useQuery(LIST_EMPLOYEE_OPTIONS);

  const [createMut] = useMutation(CREATE_DUTY_ROSTER, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_DUTY_ROSTER, { refetchQueries });
  const [deleteMut] = useMutation(DELETE_DUTY_ROSTER, { refetchQueries });

  const shifts: GqlDutyShift[] = data?.dutyRoster ?? [];
  const employees: PickerEmployee[] = employeeData?.employees ?? [];

  return { shifts, employees, loading, refetch, createMut, updateMut, deleteMut };
}
