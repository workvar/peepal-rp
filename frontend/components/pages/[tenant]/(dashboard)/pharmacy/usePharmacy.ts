"use client";

import { useQuery, useMutation } from "@apollo/client";
import { LIST_DRUGS, LIST_DISPENSES, LIST_PATIENT_OPTIONS } from "@/graphql/queries/clinical";
import { EXPIRING_DRUGS } from "@/graphql/queries/procurement";
import {
  CREATE_DRUG,
  UPDATE_DRUG,
  DELETE_DRUG,
  ADJUST_DRUG_STOCK,
  CREATE_DRUG_BATCH,
  CREATE_DISPENSE,
} from "@/graphql/mutations/clinical";
import type { GqlDrug, GqlDispense } from "./types";
import type { PickerPatient } from "../appointments/types";

const DRUG_VARS = { includeInactive: true };
const refetchQueries = [
  { query: LIST_DRUGS, variables: DRUG_VARS },
  { query: LIST_DISPENSES, variables: {} },
];
// Batch/opening-stock changes also affect the Expiring panel (days=90, see Page).
const batchRefetch = [
  { query: LIST_DRUGS, variables: DRUG_VARS },
  { query: EXPIRING_DRUGS, variables: { days: 90 } },
];

export function usePharmacy() {
  const { data: drugData, loading: drugsLoading, refetch: refetchDrugs } = useQuery(LIST_DRUGS, { variables: DRUG_VARS });
  const { data: dispData, loading: dispLoading } = useQuery(LIST_DISPENSES, { variables: {} });
  const { data: patientData } = useQuery(LIST_PATIENT_OPTIONS, { variables: { limit: 500 } });

  const [createDrugMut] = useMutation(CREATE_DRUG, { refetchQueries: batchRefetch });
  const [updateDrugMut] = useMutation(UPDATE_DRUG, { refetchQueries });
  const [deleteDrugMut] = useMutation(DELETE_DRUG, { refetchQueries });
  const [adjustStockMut] = useMutation(ADJUST_DRUG_STOCK, { refetchQueries });
  const [createDrugBatchMut] = useMutation(CREATE_DRUG_BATCH, { refetchQueries: batchRefetch });
  const [createDispenseMut] = useMutation(CREATE_DISPENSE, { refetchQueries });

  const drugs: GqlDrug[] = drugData?.drugs ?? [];
  const dispenses: GqlDispense[] = dispData?.dispenses ?? [];
  const patients: PickerPatient[] = patientData?.patients ?? [];

  return {
    drugs, dispenses, patients,
    loading: drugsLoading || dispLoading,
    createDrugMut, updateDrugMut, deleteDrugMut, adjustStockMut, createDrugBatchMut, createDispenseMut,
    refetchDrugs,
  };
}
