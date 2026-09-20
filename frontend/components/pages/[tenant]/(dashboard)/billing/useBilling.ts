"use client";

import { useQuery, useMutation } from "@apollo/client";
import {
  LIST_BILLABLE_SERVICES,
  LIST_INVOICES,
  LIST_PATIENT_OPTIONS,
} from "@/graphql/queries/clinical";
import {
  CREATE_BILLABLE_SERVICE,
  UPDATE_BILLABLE_SERVICE,
  DELETE_BILLABLE_SERVICE,
  CREATE_INVOICE,
  CANCEL_INVOICE,
  RECORD_INVOICE_PAYMENT,
} from "@/graphql/mutations/clinical";
import type { GqlBillableService, GqlInvoice } from "./types";
import type { PickerPatient } from "../appointments/types";

const SERVICE_VARS = { includeInactive: true };
const refetchQueries = [
  { query: LIST_BILLABLE_SERVICES, variables: SERVICE_VARS },
  { query: LIST_INVOICES, variables: {} },
];

export function useBilling() {
  const { data: svcData, loading: svcLoading } = useQuery(LIST_BILLABLE_SERVICES, {
    variables: SERVICE_VARS,
  });
  const { data: invData, loading: invLoading } = useQuery(LIST_INVOICES, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });

  const [createServiceMut] = useMutation(CREATE_BILLABLE_SERVICE, { refetchQueries });
  const [updateServiceMut] = useMutation(UPDATE_BILLABLE_SERVICE, { refetchQueries });
  const [deleteServiceMut] = useMutation(DELETE_BILLABLE_SERVICE, { refetchQueries });
  const [createInvoiceMut] = useMutation(CREATE_INVOICE, { refetchQueries });
  const [cancelInvoiceMut] = useMutation(CANCEL_INVOICE, { refetchQueries });
  const [recordPaymentMut] = useMutation(RECORD_INVOICE_PAYMENT, { refetchQueries });

  const services: GqlBillableService[] = svcData?.billableServices ?? [];
  const invoices: GqlInvoice[] = invData?.invoices ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];

  return {
    services, invoices, patients,
    loading: svcLoading || invLoading,
    createServiceMut, updateServiceMut, deleteServiceMut,
    createInvoiceMut, cancelInvoiceMut, recordPaymentMut,
  };
}
