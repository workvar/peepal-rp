// Shared types for the Radiology page.

export type GqlRadStudy = {
  id: string;
  code: string;
  name: string;
  modality: string;
  bodyPart?: string | null;
  price: number;
  active: boolean;
};

export type GqlRadOrder = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  orderedByName?: string | null;
  studyId: string;
  studyCode: string;
  studyName: string;
  modality: string;
  bodyPart?: string | null;
  price: number;
  orderDate: string;
  status: string;
  notes?: string | null;
  findings?: string | null;
  impression?: string | null;
  reportedByName?: string | null;
  reportedAt?: string | null;
};

export const MODALITIES = ["xray", "ct", "mri", "ultrasound", "mammography", "other"];

export type RadStudyForm = {
  code: string;
  name: string;
  modality: string;
  body_part: string;
  price: string;
  active: boolean;
};

export const emptyRadStudyForm: RadStudyForm = {
  code: "",
  name: "",
  modality: "xray",
  body_part: "",
  price: "",
  active: true,
};

export const radStatusVariant = (s: string): "green" | "blue" | "yellow" | "gray" =>
  s === "reported" ? "green" : s === "completed" ? "blue" : s === "cancelled" ? "gray" : "yellow";
