import { gql } from "@apollo/client";

// Patient portal queries — scoped server-side to the logged-in patient.

export const MY_PATIENT_SUMMARY = gql`
  query MyPatientSummary {
    myPatientProfile {
      id mrn firstName lastName gender bloodGroup phone email allergies chronicConditions status
    }
    myPatientSummary {
      upcomingAppointments visits labOrders activeReferrals
    }
  }
`;

export const MY_PATIENT_APPOINTMENTS = gql`
  query MyPatientAppointments {
    myPatientAppointments { id clinicianName departmentName date startTime endTime reason status }
  }
`;

export const MY_PATIENT_VISITS = gql`
  query MyPatientVisits {
    myPatientVisits { id clinicianName visitType visitDate chiefComplaint diagnosis prescription followUpDate status }
  }
`;

export const MY_PATIENT_LAB_ORDERS = gql`
  query MyPatientLabOrders {
    myPatientLabOrders {
      id orderDate status
      items { id testName resultValue unit flag refText }
    }
  }
`;

export const MY_PATIENT_RADIOLOGY = gql`
  query MyPatientRadiology {
    myPatientRadiologyOrders { id studyName modality orderDate status impression reportedByName }
  }
`;

export const MY_PATIENT_REFERRALS = gql`
  query MyPatientReferrals {
    myPatientReferrals { id referredTo specialty urgency referralDate status }
  }
`;

export const MY_PATIENT_TELECONSULTS = gql`
  query MyPatientTeleConsults {
    myPatientTeleConsults { id clinicianName scheduledAt meetingLink status reason }
  }
`;
