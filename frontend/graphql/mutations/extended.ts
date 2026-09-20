import { gql } from "@apollo/client";

// Mutations for Phase 5 — blood bank, ambulance, dietary, telemedicine,
// referrals, patient login.

// Blood bank
export const ADD_BLOOD_UNIT = gql`mutation AddBloodUnit($input: CreateBloodUnitInput!) { addBloodUnit(input: $input) { id } }`;
export const UPDATE_BLOOD_UNIT_STATUS = gql`mutation UpdateBloodUnitStatus($id: ID!, $status: String!) { updateBloodUnitStatus(id: $id, status: $status) { id status } }`;
export const ISSUE_BLOOD_UNIT = gql`mutation IssueBloodUnit($id: ID!, $patientId: String!) { issueBloodUnit(id: $id, patientId: $patientId) { id status } }`;
export const DELETE_BLOOD_UNIT = gql`mutation DeleteBloodUnit($id: ID!) { deleteBloodUnit(id: $id) }`;
export const CREATE_BLOOD_REQUEST = gql`mutation CreateBloodRequest($input: CreateBloodRequestInput!) { createBloodRequest(input: $input) { id } }`;
export const FULFILL_BLOOD_REQUEST = gql`mutation FulfillBloodRequest($id: ID!) { fulfillBloodRequest(id: $id) { id status } }`;
export const CANCEL_BLOOD_REQUEST = gql`mutation CancelBloodRequest($id: ID!) { cancelBloodRequest(id: $id) { id status } }`;

// Ambulance
export const CREATE_AMBULANCE = gql`mutation CreateAmbulance($input: CreateAmbulanceInput!) { createAmbulance(input: $input) { id } }`;
export const UPDATE_AMBULANCE = gql`mutation UpdateAmbulance($id: ID!, $input: UpdateAmbulanceInput!) { updateAmbulance(id: $id, input: $input) { id } }`;
export const DELETE_AMBULANCE = gql`mutation DeleteAmbulance($id: ID!) { deleteAmbulance(id: $id) }`;
export const DISPATCH_AMBULANCE = gql`mutation DispatchAmbulance($input: DispatchAmbulanceInput!) { dispatchAmbulance(input: $input) { id } }`;
export const COMPLETE_AMBULANCE_TRIP = gql`mutation CompleteAmbulanceTrip($id: ID!) { completeAmbulanceTrip(id: $id) { id status } }`;
export const CANCEL_AMBULANCE_TRIP = gql`mutation CancelAmbulanceTrip($id: ID!) { cancelAmbulanceTrip(id: $id) { id status } }`;

// Dietary
export const CREATE_DIET_PLAN = gql`mutation CreateDietPlan($input: CreateDietPlanInput!) { createDietPlan(input: $input) { id } }`;
export const UPDATE_DIET_PLAN = gql`mutation UpdateDietPlan($id: ID!, $input: UpdateDietPlanInput!) { updateDietPlan(id: $id, input: $input) { id } }`;
export const DISCONTINUE_DIET_PLAN = gql`mutation DiscontinueDietPlan($id: ID!) { discontinueDietPlan(id: $id) { id status } }`;
export const RECORD_MEAL_SERVING = gql`mutation RecordMealServing($input: RecordMealServingInput!) { recordMealServing(input: $input) { id } }`;

// Telemedicine
export const SCHEDULE_TELE_CONSULT = gql`mutation ScheduleTeleConsult($input: ScheduleTeleConsultInput!) { scheduleTeleConsult(input: $input) { id } }`;
export const UPDATE_TELE_CONSULT = gql`mutation UpdateTeleConsult($id: ID!, $input: UpdateTeleConsultInput!) { updateTeleConsult(id: $id, input: $input) { id status } }`;
export const CANCEL_TELE_CONSULT = gql`mutation CancelTeleConsult($id: ID!) { cancelTeleConsult(id: $id) { id status } }`;

// Referrals
export const CREATE_REFERRAL = gql`mutation CreateReferral($input: CreateReferralInput!) { createReferral(input: $input) { id } }`;
export const SET_REFERRAL_STATUS = gql`mutation SetReferralStatus($id: ID!, $status: String!) { setReferralStatus(id: $id, status: $status) { id status } }`;
export const DELETE_REFERRAL = gql`mutation DeleteReferral($id: ID!) { deleteReferral(id: $id) }`;
export const SET_REFERRAL_COMMISSION = gql`
  mutation SetReferralCommission($id: ID!, $input: SetReferralCommissionInput!) {
    setReferralCommission(id: $id, input: $input) {
      id commissionType commissionValue commissionBase commissionAmount
      payeeType payeeName payeeEmployeeId payeeEmployeeName settlementStatus
    }
  }
`;
export const SETTLE_REFERRAL = gql`
  mutation SettleReferral($id: ID!) {
    settleReferral(id: $id) { id settlementStatus settledOn commissionAmount }
  }
`;

// Patient portal login
export const CREATE_PATIENT_LOGIN = gql`mutation CreatePatientLogin($patientId: ID!, $email: String!, $password: String) { createPatientLogin(patientId: $patientId, email: $email, password: $password) { id } }`;
