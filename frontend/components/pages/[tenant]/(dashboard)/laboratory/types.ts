// Shared types for the Laboratory (LIS) page.

export type GqlLabTest = {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  panel?: string | null;
  method?: string | null;
  sampleType: string;
  unit?: string | null;
  refLow: number;
  refHigh: number;
  refText?: string | null;
  price: number;
  active: boolean;
};

export type GqlLabItem = {
  id: string;
  testId: string;
  testCode: string;
  testName: string;
  unit?: string | null;
  refLow: number;
  refHigh: number;
  refText?: string | null;
  price: number;
  resultValue?: string | null;
  flag?: string | null;
  resultedAt?: string | null;
};

export type GqlLabOrder = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  encounterId?: string | null;
  orderedById?: string | null;
  orderedByName?: string | null;
  orderDate: string;
  status: string;
  notes?: string | null;
  totalPrice: number;
  items: GqlLabItem[];
};

export const SAMPLE_TYPES = ["blood", "urine", "stool", "swab", "other"];

export type LabTestForm = {
  code: string;
  name: string;
  category: string;
  panel: string;
  method: string;
  sample_type: string;
  unit: string;
  ref_low: string;
  ref_high: string;
  ref_text: string;
  price: string;
  active: boolean;
};

export const emptyLabTestForm: LabTestForm = {
  code: "",
  name: "",
  category: "",
  panel: "",
  method: "",
  sample_type: "blood",
  unit: "",
  ref_low: "",
  ref_high: "",
  ref_text: "",
  price: "",
  active: true,
};

// Flag → badge colour.
export const flagVariant = (flag?: string | null): "green" | "red" | "yellow" | "gray" => {
  if (flag === "normal") return "green";
  if (flag === "high" || flag === "low") return "red";
  if (flag === "abnormal") return "yellow";
  return "gray";
};
