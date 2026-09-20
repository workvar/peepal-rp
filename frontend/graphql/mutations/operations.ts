import { gql } from "@apollo/client";

// Mutations for Phase 4 — nursing, claims, inventory, OT, triage.

// ── Nursing ──────────────────────────────────────────────────────────────────
export const RECORD_VITALS = gql`
  mutation RecordVitals($input: RecordVitalsInput!) { recordVitals(input: $input) { id } }
`;
export const CREATE_MEDICATION_ORDER = gql`
  mutation CreateMedicationOrder($input: CreateMedicationOrderInput!) {
    createMedicationOrder(input: $input) { id }
  }
`;
export const DISCONTINUE_MEDICATION_ORDER = gql`
  mutation DiscontinueMedicationOrder($id: ID!) { discontinueMedicationOrder(id: $id) { id status } }
`;
export const RECORD_ADMINISTRATION = gql`
  mutation RecordMedicationAdministration($input: RecordAdministrationInput!) {
    recordMedicationAdministration(input: $input) { id }
  }
`;

// ── Claims ───────────────────────────────────────────────────────────────────
export const CREATE_INSURANCE_PAYER = gql`
  mutation CreateInsurancePayer($input: CreateInsurancePayerInput!) { createInsurancePayer(input: $input) { id } }
`;
export const UPDATE_INSURANCE_PAYER = gql`
  mutation UpdateInsurancePayer($id: ID!, $input: UpdateInsurancePayerInput!) { updateInsurancePayer(id: $id, input: $input) { id } }
`;
export const DELETE_INSURANCE_PAYER = gql`
  mutation DeleteInsurancePayer($id: ID!) { deleteInsurancePayer(id: $id) }
`;
export const CREATE_INSURANCE_CLAIM = gql`
  mutation CreateInsuranceClaim($input: CreateInsuranceClaimInput!) { createInsuranceClaim(input: $input) { id } }
`;
export const UPDATE_INSURANCE_CLAIM = gql`
  mutation UpdateInsuranceClaim($id: ID!, $input: UpdateInsuranceClaimInput!) { updateInsuranceClaim(id: $id, input: $input) { id } }
`;
export const DELETE_INSURANCE_CLAIM = gql`
  mutation DeleteInsuranceClaim($id: ID!) { deleteInsuranceClaim(id: $id) }
`;
export const SETTLE_INSURANCE_CLAIM = gql`
  mutation SettleInsuranceClaim($id: ID!, $approvedAmount: Float) { settleInsuranceClaim(id: $id, approvedAmount: $approvedAmount) { id status } }
`;

// ── Inventory ────────────────────────────────────────────────────────────────
export const CREATE_INVENTORY_ITEM = gql`
  mutation CreateInventoryItem($input: CreateInventoryItemInput!) { createInventoryItem(input: $input) { id } }
`;
export const UPDATE_INVENTORY_ITEM = gql`
  mutation UpdateInventoryItem($id: ID!, $input: UpdateInventoryItemInput!) { updateInventoryItem(id: $id, input: $input) { id } }
`;
export const DELETE_INVENTORY_ITEM = gql`
  mutation DeleteInventoryItem($id: ID!) { deleteInventoryItem(id: $id) }
`;
export const RECEIVE_STOCK = gql`
  mutation ReceiveStock($itemId: ID!, $qty: Float!, $reason: String) { receiveStock(itemId: $itemId, qty: $qty, reason: $reason) { id stockQty } }
`;
export const ADJUST_INVENTORY_STOCK = gql`
  mutation AdjustInventoryStock($itemId: ID!, $delta: Float!, $reason: String) { adjustInventoryStock(itemId: $itemId, delta: $delta, reason: $reason) { id stockQty } }
`;
export const ISSUE_TO_PHARMACY = gql`
  mutation IssueToPharmacy($itemId: ID!, $qty: Float!) { issueToPharmacy(itemId: $itemId, qty: $qty) { id stockQty } }
`;

// ── OT ───────────────────────────────────────────────────────────────────────
export const CREATE_OPERATION_THEATRE = gql`
  mutation CreateOperationTheatre($input: CreateOperationTheatreInput!) { createOperationTheatre(input: $input) { id } }
`;
export const UPDATE_OPERATION_THEATRE = gql`
  mutation UpdateOperationTheatre($id: ID!, $input: UpdateOperationTheatreInput!) { updateOperationTheatre(id: $id, input: $input) { id } }
`;
export const DELETE_OPERATION_THEATRE = gql`
  mutation DeleteOperationTheatre($id: ID!) { deleteOperationTheatre(id: $id) }
`;
export const SCHEDULE_SURGERY = gql`
  mutation ScheduleSurgery($input: ScheduleSurgeryInput!) { scheduleSurgery(input: $input) { id } }
`;
export const SET_SURGERY_STATUS = gql`
  mutation SetSurgeryStatus($id: ID!, $status: String!) { setSurgeryStatus(id: $id, status: $status) { id status } }
`;
export const CANCEL_SURGERY = gql`
  mutation CancelSurgery($id: ID!) { cancelSurgery(id: $id) { id status } }
`;

// ── Triage ───────────────────────────────────────────────────────────────────
export const CREATE_TRIAGE_CASE = gql`
  mutation CreateTriageCase($input: CreateTriageCaseInput!) { createTriageCase(input: $input) { id } }
`;
export const UPDATE_TRIAGE_CASE = gql`
  mutation UpdateTriageCase($id: ID!, $input: UpdateTriageCaseInput!) { updateTriageCase(id: $id, input: $input) { id } }
`;
