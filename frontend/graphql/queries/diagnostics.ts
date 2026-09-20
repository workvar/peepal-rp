import { gql } from "@apollo/client";

// Queries for Phase 3 — Laboratory, Radiology, and IPD (wards/beds/admissions).

// ── Laboratory ───────────────────────────────────────────────────────────────
export const LIST_LAB_TESTS = gql`
  query ListLabTests($search: String, $includeInactive: Boolean) {
    labTests(search: $search, includeInactive: $includeInactive) {
      id
      code
      name
      category
      panel
      method
      sampleType
      unit
      refLow
      refHigh
      refText
      price
      active
    }
  }
`;

export const LIST_LAB_ORDERS = gql`
  query ListLabOrders($patientId: String, $status: String, $date: String) {
    labOrders(patientId: $patientId, status: $status, date: $date) {
      id
      patientId
      patientName
      patientMrn
      encounterId
      orderedById
      orderedByName
      orderDate
      status
      notes
      totalPrice
      items {
        id
        testId
        testCode
        testName
        unit
        refLow
        refHigh
        refText
        price
        resultValue
        flag
        resultedAt
      }
    }
  }
`;

// ── Radiology ────────────────────────────────────────────────────────────────
export const LIST_RADIOLOGY_STUDIES = gql`
  query ListRadiologyStudies($search: String, $includeInactive: Boolean) {
    radiologyStudies(search: $search, includeInactive: $includeInactive) {
      id
      code
      name
      modality
      bodyPart
      price
      active
    }
  }
`;

export const LIST_RADIOLOGY_ORDERS = gql`
  query ListRadiologyOrders($patientId: String, $status: String, $date: String) {
    radiologyOrders(patientId: $patientId, status: $status, date: $date) {
      id
      patientId
      patientName
      patientMrn
      orderedByName
      studyId
      studyCode
      studyName
      modality
      bodyPart
      price
      orderDate
      status
      notes
      findings
      impression
      reportedByName
      reportedAt
    }
  }
`;

// ── IPD: wards, beds, admissions ─────────────────────────────────────────────
export const LIST_WARDS = gql`
  query ListWards($includeInactive: Boolean) {
    wards(includeInactive: $includeInactive) {
      id
      code
      name
      wardType
      gender
      floor
      active
      bedCount
      occupiedCount
      beds {
        id
        wardId
        bedNumber
        bay
        status
        dailyCharge
        patientId
        patientName
        admissionId
      }
    }
  }
`;

export const LIST_ADMISSIONS = gql`
  query ListAdmissions($patientId: String, $wardId: String, $status: String) {
    admissions(patientId: $patientId, wardId: $wardId, status: $status) {
      id
      patientId
      patientName
      patientMrn
      encounterId
      clinicianId
      clinicianName
      wardId
      wardName
      bedId
      bedNumber
      admissionDate
      reason
      status
      dischargeDate
      dischargeDiagnosis
      treatmentGiven
      conditionOnDischarge
      followUpInstructions
      transfers {
        id
        fromBedNumber
        toBedNumber
        fromWardName
        toWardName
        transferDate
        reason
      }
    }
  }
`;
