// Shared types for the Pharmacy page.

export type GqlDrug = {
  id: string;
  name: string;
  genericName?: string | null;
  form: string;
  strength?: string | null;
  unit: string;
  unitPrice: number;
  stockQty: number;
  reorderLevel: number;
  active: boolean;
};

export type GqlDispenseItem = {
  id: string;
  drugId: string;
  drugName: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type GqlDispense = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  encounterId?: string | null;
  date: string;
  items: GqlDispenseItem[];
  totalAmount: number;
  notes?: string | null;
  createdAt?: string | null;
};

export type DrugForm = {
  name: string;
  generic_name: string;
  form: string;
  strength: string;
  unit: string;
  unit_price: string;
  stock_qty: string;
  reorder_level: string;
  active: boolean;
  // Optional initial batch — when a batch no is given, opening stock is recorded
  // as a DrugBatch so it feeds expiry tracking + FEFO.
  batch_no: string;
  expiry_date: string;
};

export const emptyDrugForm: DrugForm = {
  name: "",
  generic_name: "",
  form: "tablet",
  strength: "",
  unit: "unit",
  unit_price: "",
  stock_qty: "",
  reorder_level: "",
  active: true,
  batch_no: "",
  expiry_date: "",
};

// A received lot logged against an existing drug (Add Batch action).
export type BatchForm = {
  batch_no: string;
  expiry_date: string;
  qty: string;
  unit_cost: string;
};

export const emptyBatchForm: BatchForm = {
  batch_no: "",
  expiry_date: "",
  qty: "",
  unit_cost: "",
};

export const DRUG_FORMS = ["tablet", "capsule", "syrup", "injection", "ointment", "drops", "other"];

export type DispenseLineForm = { drug_id: string; qty: string };

export type DispenseForm = {
  patient_id: string;
  date: string;
  notes: string;
  lines: DispenseLineForm[];
};

export const emptyDispenseForm: DispenseForm = {
  patient_id: "",
  date: "",
  notes: "",
  lines: [{ drug_id: "", qty: "1" }],
};
