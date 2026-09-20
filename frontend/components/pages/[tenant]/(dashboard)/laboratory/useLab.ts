"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_LAB_TESTS, LIST_LAB_ORDERS } from "@/graphql/queries/diagnostics";
import { LIST_PATIENT_OPTIONS, LIST_CLINICIANS } from "@/graphql/queries/clinical";
import {
  CREATE_LAB_TEST,
  UPDATE_LAB_TEST,
  DELETE_LAB_TEST,
  CREATE_LAB_ORDER,
  ENTER_LAB_RESULTS,
  CANCEL_LAB_ORDER,
} from "@/graphql/mutations/diagnostics";
import type { GqlLabTest, GqlLabOrder } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";

const TEST_VARS = { includeInactive: true };
const refetchQueries = [
  { query: LIST_LAB_TESTS, variables: TEST_VARS },
  { query: LIST_LAB_ORDERS, variables: {} },
];

export function useLab() {
  const { data: testData, loading: testsLoading, refetch: refetchTests } = useQuery(LIST_LAB_TESTS, { variables: TEST_VARS });
  const { data: orderData, loading: ordersLoading } = useQuery(LIST_LAB_ORDERS, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const [createTestMut] = useMutation(CREATE_LAB_TEST, { refetchQueries });
  const [updateTestMut] = useMutation(UPDATE_LAB_TEST, { refetchQueries });
  const [deleteTestMut] = useMutation(DELETE_LAB_TEST, { refetchQueries });
  const [createOrderMut] = useMutation(CREATE_LAB_ORDER, { refetchQueries });
  const [enterResultsMut] = useMutation(ENTER_LAB_RESULTS, { refetchQueries });
  const [cancelOrderMut] = useMutation(CANCEL_LAB_ORDER, { refetchQueries });

  const tests: GqlLabTest[] = testData?.labTests ?? [];
  const orders: GqlLabOrder[] = orderData?.labOrders ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  return {
    tests, orders, patients, clinicians,
    loading: testsLoading || ordersLoading,
    refetchTests,
    createTestMut, updateTestMut, deleteTestMut,
    createOrderMut, enterResultsMut, cancelOrderMut,
  };
}
