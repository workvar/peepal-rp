import { gql } from "@apollo/client";

export const CREATE_PATIENT = gql`
  mutation CreatePatient($input: CreatePatientInput!) {
    createPatient(input: $input) {
      id
      mrn
    }
  }
`;

export const UPDATE_PATIENT = gql`
  mutation UpdatePatient($id: ID!, $input: UpdatePatientInput!) {
    updatePatient(id: $id, input: $input) {
      id
      mrn
      status
    }
  }
`;

export const DELETE_PATIENT = gql`
  mutation DeletePatient($id: ID!) {
    deletePatient(id: $id)
  }
`;

export const CREATE_APPOINTMENT = gql`
  mutation CreateAppointment($input: CreateAppointmentInput!) {
    createAppointment(input: $input) {
      id
      status
    }
  }
`;

export const UPDATE_APPOINTMENT = gql`
  mutation UpdateAppointment($id: ID!, $input: UpdateAppointmentInput!) {
    updateAppointment(id: $id, input: $input) {
      id
      status
    }
  }
`;

export const DELETE_APPOINTMENT = gql`
  mutation DeleteAppointment($id: ID!) {
    deleteAppointment(id: $id)
  }
`;

export const CREATE_ENCOUNTER = gql`
  mutation CreateEncounter($input: CreateEncounterInput!) {
    createEncounter(input: $input) {
      id
      status
    }
  }
`;

export const UPDATE_ENCOUNTER = gql`
  mutation UpdateEncounter($id: ID!, $input: UpdateEncounterInput!) {
    updateEncounter(id: $id, input: $input) {
      id
      status
    }
  }
`;

export const DELETE_ENCOUNTER = gql`
  mutation DeleteEncounter($id: ID!) {
    deleteEncounter(id: $id)
  }
`;

// ── Phase 2: billing, pharmacy, schedules ──────────────────────────────

export const CREATE_BILLABLE_SERVICE = gql`
  mutation CreateBillableService($input: CreateBillableServiceInput!) {
    createBillableService(input: $input) {
      id
    }
  }
`;

export const UPDATE_BILLABLE_SERVICE = gql`
  mutation UpdateBillableService($id: ID!, $input: UpdateBillableServiceInput!) {
    updateBillableService(id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_BILLABLE_SERVICE = gql`
  mutation DeleteBillableService($id: ID!) {
    deleteBillableService(id: $id)
  }
`;

export const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      id
      invoiceNo
    }
  }
`;

export const CANCEL_INVOICE = gql`
  mutation CancelInvoice($id: ID!) {
    cancelInvoice(id: $id) {
      id
      status
    }
  }
`;

export const RECORD_INVOICE_PAYMENT = gql`
  mutation RecordInvoicePayment($input: RecordInvoicePaymentInput!) {
    recordInvoicePayment(input: $input) {
      id
      amountPaid
      status
    }
  }
`;

export const CREATE_DRUG = gql`
  mutation CreateDrug($input: CreateDrugInput!) {
    createDrug(input: $input) {
      id
    }
  }
`;

export const UPDATE_DRUG = gql`
  mutation UpdateDrug($id: ID!, $input: UpdateDrugInput!) {
    updateDrug(id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_DRUG = gql`
  mutation DeleteDrug($id: ID!) {
    deleteDrug(id: $id)
  }
`;

export const ADJUST_DRUG_STOCK = gql`
  mutation AdjustDrugStock($id: ID!, $delta: Float!) {
    adjustDrugStock(id: $id, delta: $delta) {
      id
      stockQty
    }
  }
`;

export const CREATE_DRUG_BATCH = gql`
  mutation CreateDrugBatch($input: CreateDrugBatchInput!) {
    createDrugBatch(input: $input) {
      id
    }
  }
`;

export const CREATE_DISPENSE = gql`
  mutation CreateDispense($input: CreateDispenseInput!) {
    createDispense(input: $input) {
      id
    }
  }
`;

export const CREATE_CLINICIAN_SCHEDULE = gql`
  mutation CreateClinicianSchedule($input: CreateClinicianScheduleInput!) {
    createClinicianSchedule(input: $input) {
      id
    }
  }
`;

export const UPDATE_CLINICIAN_SCHEDULE = gql`
  mutation UpdateClinicianSchedule($id: ID!, $input: UpdateClinicianScheduleInput!) {
    updateClinicianSchedule(id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_CLINICIAN_SCHEDULE = gql`
  mutation DeleteClinicianSchedule($id: ID!) {
    deleteClinicianSchedule(id: $id)
  }
`;
