"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_INSURANCE_PAYERS, LIST_INSURANCE_CLAIMS } from "@/graphql/queries/operations";
import { LIST_PATIENT_OPTIONS } from "@/graphql/queries/clinical";
import {
  CREATE_INSURANCE_PAYER, UPDATE_INSURANCE_PAYER, DELETE_INSURANCE_PAYER,
  CREATE_INSURANCE_CLAIM, UPDATE_INSURANCE_CLAIM, DELETE_INSURANCE_CLAIM, SETTLE_INSURANCE_CLAIM,
} from "@/graphql/mutations/operations";
import type { GqlPayer, GqlClaim } from "./types";
import type { PickerPatient } from "../appointments/types";

const PAYER_VARS = { includeInactive: true };
const refetchQueries = [
  { query: LIST_INSURANCE_PAYERS, variables: PAYER_VARS },
  { query: LIST_INSURANCE_CLAIMS, variables: {} },
];

export function useClaims() {
  const { data: payerData, loading: payersLoading, refetch: refetchPayers } = useQuery(LIST_INSURANCE_PAYERS, { variables: PAYER_VARS });
  const { data: claimData, loading: claimsLoading, refetch: refetchClaims } = useQuery(LIST_INSURANCE_CLAIMS, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });

  const [createPayerMut] = useMutation(CREATE_INSURANCE_PAYER, { refetchQueries });
  const [updatePayerMut] = useMutation(UPDATE_INSURANCE_PAYER, { refetchQueries });
  const [deletePayerMut] = useMutation(DELETE_INSURANCE_PAYER, { refetchQueries });
  const [createClaimMut] = useMutation(CREATE_INSURANCE_CLAIM, { refetchQueries });
  const [updateClaimMut] = useMutation(UPDATE_INSURANCE_CLAIM, { refetchQueries });
  const [deleteClaimMut] = useMutation(DELETE_INSURANCE_CLAIM, { refetchQueries });
  const [settleClaimMut] = useMutation(SETTLE_INSURANCE_CLAIM, { refetchQueries });

  const payers: GqlPayer[] = payerData?.insurancePayers ?? [];
  const claims: GqlClaim[] = claimData?.insuranceClaims ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];

  return {
    payers, claims, patients,
    loading: payersLoading || claimsLoading,
    refetchPayers, refetchClaims,
    createPayerMut, updatePayerMut, deletePayerMut,
    createClaimMut, updateClaimMut, deleteClaimMut, settleClaimMut,
  };
}
