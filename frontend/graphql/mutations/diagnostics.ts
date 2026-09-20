import { gql } from "@apollo/client";

// Mutations for Phase 3 — Laboratory, Radiology, and IPD (wards/beds/admissions).

// ── Laboratory ───────────────────────────────────────────────────────────────
export const CREATE_LAB_TEST = gql`
  mutation CreateLabTest($input: CreateLabTestInput!) {
    createLabTest(input: $input) { id }
  }
`;
export const UPDATE_LAB_TEST = gql`
  mutation UpdateLabTest($id: ID!, $input: UpdateLabTestInput!) {
    updateLabTest(id: $id, input: $input) { id }
  }
`;
export const DELETE_LAB_TEST = gql`
  mutation DeleteLabTest($id: ID!) { deleteLabTest(id: $id) }
`;
export const CREATE_LAB_ORDER = gql`
  mutation CreateLabOrder($input: CreateLabOrderInput!) {
    createLabOrder(input: $input) { id }
  }
`;
export const ENTER_LAB_RESULTS = gql`
  mutation EnterLabResults($orderId: ID!, $results: [LabResultInput!]!) {
    enterLabResults(orderId: $orderId, results: $results) { id status }
  }
`;
export const CANCEL_LAB_ORDER = gql`
  mutation CancelLabOrder($id: ID!) { cancelLabOrder(id: $id) { id status } }
`;

// ── Radiology ────────────────────────────────────────────────────────────────
export const CREATE_RADIOLOGY_STUDY = gql`
  mutation CreateRadiologyStudy($input: CreateRadiologyStudyInput!) {
    createRadiologyStudy(input: $input) { id }
  }
`;
export const UPDATE_RADIOLOGY_STUDY = gql`
  mutation UpdateRadiologyStudy($id: ID!, $input: UpdateRadiologyStudyInput!) {
    updateRadiologyStudy(id: $id, input: $input) { id }
  }
`;
export const DELETE_RADIOLOGY_STUDY = gql`
  mutation DeleteRadiologyStudy($id: ID!) { deleteRadiologyStudy(id: $id) }
`;
export const CREATE_RADIOLOGY_ORDER = gql`
  mutation CreateRadiologyOrder($input: CreateRadiologyOrderInput!) {
    createRadiologyOrder(input: $input) { id }
  }
`;
export const SET_RADIOLOGY_ORDER_STATUS = gql`
  mutation SetRadiologyOrderStatus($id: ID!, $status: String!) {
    setRadiologyOrderStatus(id: $id, status: $status) { id status }
  }
`;
export const REPORT_RADIOLOGY_ORDER = gql`
  mutation ReportRadiologyOrder($id: ID!, $input: RadiologyReportInput!) {
    reportRadiologyOrder(id: $id, input: $input) { id status }
  }
`;

// ── IPD: wards, beds, admissions ─────────────────────────────────────────────
export const CREATE_WARD = gql`
  mutation CreateWard($input: CreateWardInput!) { createWard(input: $input) { id } }
`;
export const UPDATE_WARD = gql`
  mutation UpdateWard($id: ID!, $input: UpdateWardInput!) { updateWard(id: $id, input: $input) { id } }
`;
export const DELETE_WARD = gql`
  mutation DeleteWard($id: ID!) { deleteWard(id: $id) }
`;
export const CREATE_BED = gql`
  mutation CreateBed($input: CreateBedInput!) { createBed(input: $input) { id } }
`;
export const UPDATE_BED = gql`
  mutation UpdateBed($id: ID!, $input: UpdateBedInput!) { updateBed(id: $id, input: $input) { id } }
`;
export const DELETE_BED = gql`
  mutation DeleteBed($id: ID!) { deleteBed(id: $id) }
`;
export const CREATE_ADMISSION = gql`
  mutation CreateAdmission($input: CreateAdmissionInput!) { createAdmission(input: $input) { id } }
`;
export const TRANSFER_ADMISSION = gql`
  mutation TransferAdmission($input: TransferAdmissionInput!) { transferAdmission(input: $input) { id } }
`;
export const DISCHARGE_ADMISSION = gql`
  mutation DischargeAdmission($input: DischargeAdmissionInput!) { dischargeAdmission(input: $input) { id status } }
`;
