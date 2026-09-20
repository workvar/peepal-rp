import { gql } from "@apollo/client";

// Queries for Phase 5 — blood bank, ambulance, dietary, telemedicine,
// referrals, audit.

export const LIST_BLOOD_UNITS = gql`
  query ListBloodUnits($bloodGroup: String, $status: String, $component: String) {
    bloodUnits(bloodGroup: $bloodGroup, status: $status, component: $component) {
      id bagNumber bloodGroup component volumeMl donorName collectedDate expiryDate
      status issuedToId issuedToName issuedDate
    }
  }
`;

export const LIST_BLOOD_REQUESTS = gql`
  query ListBloodRequests($status: String) {
    bloodRequests(status: $status) {
      id patientId patientName patientMrn bloodGroup component unitsRequired
      requestedByName requestDate status notes
    }
  }
`;

export const LIST_AMBULANCES = gql`
  query ListAmbulances($includeInactive: Boolean) {
    ambulances(includeInactive: $includeInactive) {
      id code registration vehicleType driverName driverPhone status active
    }
  }
`;

export const LIST_AMBULANCE_TRIPS = gql`
  query ListAmbulanceTrips($status: String, $date: String) {
    ambulanceTrips(status: $status, date: $date) {
      id ambulanceId ambulanceCode patientId patientName tripType origin destination
      dispatchTime returnTime status notes
    }
  }
`;

export const LIST_DIET_PLANS = gql`
  query ListDietPlans($admissionId: String!, $includeDiscontinued: Boolean) {
    dietPlans(admissionId: $admissionId, includeDiscontinued: $includeDiscontinued) {
      id admissionId patientId dietType calories restrictions notes status
      servings { id mealType servedAt status notes }
    }
  }
`;

export const LIST_TELE_CONSULTS = gql`
  query ListTeleConsults($status: String, $date: String) {
    teleConsults(status: $status, date: $date) {
      id patientId patientName patientMrn clinicianId clinicianName
      scheduledAt meetingLink status reason notes
    }
  }
`;

export const LIST_REFERRALS = gql`
  query ListReferrals($status: String, $settlementStatus: String) {
    referrals(status: $status, settlementStatus: $settlementStatus) {
      id patientId patientName patientMrn fromClinicianId fromClinicianName
      referredTo specialty reason urgency referralDate status notes
      commissionType commissionValue commissionBase commissionAmount
      payeeType payeeName payeeEmployeeId payeeEmployeeName
      settlementStatus settledOn
    }
  }
`;

export const LIST_AUDIT_LOGS = gql`
  query ListAuditLogs($action: String, $module: String, $limit: Int) {
    auditLogs(action: $action, module: $module, limit: $limit) {
      id actorName actorRole action module operation entityId detail ip createdAt
    }
  }
`;
