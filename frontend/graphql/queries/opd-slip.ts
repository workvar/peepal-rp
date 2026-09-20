import { gql } from "@apollo/client";

// The tenant's OPD slip design as a JSON string (null until an admin saves one).
export const OPD_SLIP_CONFIG = gql`
  query OpdSlipConfig {
    opdSlipConfig
  }
`;

// One booking plus the patient details the slip prints. Used by the print
// page, which is opened by URL and has no list cache to read from.
export const GET_APPOINTMENT_FOR_SLIP = gql`
  query GetAppointmentForSlip($id: ID!) {
    appointment(id: $id) {
      id
      patientId
      patientName
      patientMrn
      clinicianName
      departmentName
      date
      startTime
      endTime
      reason
      referredBy
      status
    }
  }
`;
