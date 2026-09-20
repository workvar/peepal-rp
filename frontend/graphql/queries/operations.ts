import { gql } from "@apollo/client";

// Queries for Phase 4 — nursing, claims, inventory, OT, triage.

// ── Nursing ──────────────────────────────────────────────────────────────────
export const LIST_VITALS = gql`
  query ListVitals($admissionId: String!) {
    vitalsRecords(admissionId: $admissionId) {
      id
      recordedByName
      recordedAt
      tempC
      pulse
      respRate
      bpSystolic
      bpDiastolic
      spo2
      painScore
      notes
    }
  }
`;

export const LIST_MEDICATION_ORDERS = gql`
  query ListMedicationOrders($admissionId: String!, $includeDiscontinued: Boolean) {
    medicationOrders(admissionId: $admissionId, includeDiscontinued: $includeDiscontinued) {
      id
      drugName
      dose
      route
      frequency
      orderedByName
      startDate
      endDate
      status
      notes
      administrations {
        id
        administeredByName
        administeredAt
        status
        notes
      }
    }
  }
`;

// ── Claims ───────────────────────────────────────────────────────────────────
export const LIST_INSURANCE_PAYERS = gql`
  query ListInsurancePayers($includeInactive: Boolean) {
    insurancePayers(includeInactive: $includeInactive) {
      id
      code
      name
      payerType
      contactName
      phone
      email
      active
    }
  }
`;

export const LIST_INSURANCE_CLAIMS = gql`
  query ListInsuranceClaims($status: String, $payerId: String) {
    insuranceClaims(status: $status, payerId: $payerId) {
      id
      claimNumber
      patientId
      patientName
      patientMrn
      payerId
      payerName
      policyNumber
      diagnosis
      claimAmount
      approvedAmount
      status
      notes
      submittedAt
      settledAt
      createdAt
    }
  }
`;

// ── Inventory ────────────────────────────────────────────────────────────────
export const LIST_INVENTORY_ITEMS = gql`
  query ListInventoryItems($search: String, $category: String, $includeInactive: Boolean) {
    inventoryItems(search: $search, category: $category, includeInactive: $includeInactive) {
      id
      code
      name
      category
      unit
      stockQty
      reorderLevel
      unitCost
      linkedDrugId
      linkedDrugName
      active
    }
  }
`;

export const LIST_STOCK_TRANSACTIONS = gql`
  query ListStockTransactions($itemId: String!) {
    stockTransactions(itemId: $itemId) {
      id
      kind
      qty
      reason
      byName
      date
    }
  }
`;

// ── OT ───────────────────────────────────────────────────────────────────────
export const LIST_OPERATION_THEATRES = gql`
  query ListOperationTheatres($includeInactive: Boolean) {
    operationTheatres(includeInactive: $includeInactive) {
      id
      code
      name
      location
      active
    }
  }
`;

export const LIST_SURGERIES = gql`
  query ListSurgeries($date: String, $theatreId: String, $status: String) {
    surgeries(date: $date, theatreId: $theatreId, status: $status) {
      id
      patientId
      patientName
      patientMrn
      theatreId
      theatreName
      surgeonId
      surgeonName
      procedureName
      anesthesiaType
      scheduledDate
      startTime
      endTime
      status
      notes
    }
  }
`;

// ── Triage ───────────────────────────────────────────────────────────────────
export const LIST_TRIAGE_CASES = gql`
  query ListTriageCases($status: String, $date: String) {
    triageCases(status: $status, date: $date) {
      id
      patientId
      patientName
      patientMrn
      arrivalTime
      chiefComplaint
      triageLevel
      vitals
      assignedClinicianId
      assignedClinicianName
      status
      disposition
      notes
    }
  }
`;
