"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_RADIOLOGY_STUDIES, LIST_RADIOLOGY_ORDERS } from "@/graphql/queries/diagnostics";
import { LIST_PATIENT_OPTIONS, LIST_CLINICIANS } from "@/graphql/queries/clinical";
import {
  CREATE_RADIOLOGY_STUDY,
  UPDATE_RADIOLOGY_STUDY,
  DELETE_RADIOLOGY_STUDY,
  CREATE_RADIOLOGY_ORDER,
  SET_RADIOLOGY_ORDER_STATUS,
  REPORT_RADIOLOGY_ORDER,
} from "@/graphql/mutations/diagnostics";
import type { GqlRadStudy, GqlRadOrder } from "./types";
import type { PickerPatient, PickerClinician } from "../appointments/types";

const STUDY_VARS = { includeInactive: true };
const refetchQueries = [
  { query: LIST_RADIOLOGY_STUDIES, variables: STUDY_VARS },
  { query: LIST_RADIOLOGY_ORDERS, variables: {} },
];

export function useRadiology() {
  const { data: studyData, loading: studiesLoading } = useQuery(LIST_RADIOLOGY_STUDIES, { variables: STUDY_VARS });
  const { data: orderData, loading: ordersLoading } = useQuery(LIST_RADIOLOGY_ORDERS, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });
  const { data: clinicianData } = useQuery(LIST_CLINICIANS);

  const [createStudyMut] = useMutation(CREATE_RADIOLOGY_STUDY, { refetchQueries });
  const [updateStudyMut] = useMutation(UPDATE_RADIOLOGY_STUDY, { refetchQueries });
  const [deleteStudyMut] = useMutation(DELETE_RADIOLOGY_STUDY, { refetchQueries });
  const [createOrderMut] = useMutation(CREATE_RADIOLOGY_ORDER, { refetchQueries });
  const [setStatusMut] = useMutation(SET_RADIOLOGY_ORDER_STATUS, { refetchQueries });
  const [reportMut] = useMutation(REPORT_RADIOLOGY_ORDER, { refetchQueries });

  const studies: GqlRadStudy[] = studyData?.radiologyStudies ?? [];
  const orders: GqlRadOrder[] = orderData?.radiologyOrders ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];
  const clinicians: PickerClinician[] = clinicianData?.employees ?? [];

  return {
    studies, orders, patients, clinicians,
    loading: studiesLoading || ordersLoading,
    createStudyMut, updateStudyMut, deleteStudyMut,
    createOrderMut, setStatusMut, reportMut,
  };
}
