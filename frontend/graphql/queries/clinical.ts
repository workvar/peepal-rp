import { gql } from "@apollo/client";

export const LIST_PATIENTS = gql`
  query ListPatients($search: String, $status: String, $limit: Int, $offset: Int) {
    patients(search: $search, status: $status, limit: $limit, offset: $offset) {
      id
      mrn
      uhid
      firstName
      lastName
      gender
      dateOfBirth
      bloodGroup
      phone
      email
      address
      city
      state
      pincode
      emergencyName
      emergencyPhone
      allergies
      chronicConditions
      status
      registeredAt
      createdAt
    }
  }
`;

export const PATIENTS_COUNT = gql`
  query PatientsCount($search: String, $status: String) {
    patientsCount(search: $search, status: $status)
  }
`;

export const GET_PATIENT = gql`
  query GetPatient($id: ID!) {
    patient(id: $id) {
      id
      mrn
      firstName
      lastName
      gender
      dateOfBirth
      bloodGroup
      phone
      email
      allergies
      chronicConditions
      status
    }
  }
`;

// Light pickers for clinical forms — avoids the heavyweight LIST_EMPLOYEES
// payload (payment details etc.) just to fill a dropdown.
export const LIST_CLINICIANS = gql`
  query ListClinicians {
    employees {
      id
      designation
      user {
        name
      }
    }
  }
`;

export const LIST_PATIENT_OPTIONS = gql`
  query ListPatientOptions($limit: Int) {
    patients(limit: $limit) {
      id
      mrn
      firstName
      lastName
    }
  }
`;

export const LIST_APPOINTMENTS = gql`
  query ListAppointments($date: String, $clinicianId: String, $patientId: String, $status: String) {
    appointments(date: $date, clinicianId: $clinicianId, patientId: $patientId, status: $status) {
      id
      patientId
      patientName
      patientMrn
      clinicianId
      clinicianName
      departmentId
      departmentName
      date
      startTime
      endTime
      reason
      notes
      referredBy
      status
      createdAt
    }
  }
`;

// ── Phase 2: billing, pharmacy, schedules ──────────────────────────────

const INVOICE_FIELDS = `
  id
  invoiceNo
  patientId
  patientName
  patientMrn
  patientUhid
  encounterId
  encounterCrNumber
  date
  items {
    id
    serviceId
    description
    qty
    unitPrice
    amount
  }
  subtotal
  discount
  total
  amountPaid
  status
  notes
  createdAt
`;

export const LIST_BILLABLE_SERVICES = gql`
  query ListBillableServices($includeInactive: Boolean) {
    billableServices(includeInactive: $includeInactive) {
      id
      code
      name
      category
      unitPrice
      active
    }
  }
`;

export const LIST_INVOICES = gql`
  query ListInvoices($patientId: String, $status: String, $date: String) {
    invoices(patientId: $patientId, status: $status, date: $date) {
      ${INVOICE_FIELDS}
    }
  }
`;

export const GET_INVOICE = gql`
  query GetInvoice($id: ID!) {
    invoice(id: $id) {
      ${INVOICE_FIELDS}
      payments {
        id
        amount
        mode
        reference
        paidAt
      }
    }
  }
`;

export const LIST_DRUGS = gql`
  query ListDrugs($search: String, $includeInactive: Boolean) {
    drugs(search: $search, includeInactive: $includeInactive) {
      id
      name
      genericName
      form
      strength
      unit
      unitPrice
      stockQty
      reorderLevel
      active
    }
  }
`;

export const LIST_DISPENSES = gql`
  query ListDispenses($patientId: String, $date: String) {
    dispenses(patientId: $patientId, date: $date) {
      id
      patientId
      patientName
      patientMrn
      encounterId
      date
      items {
        id
        drugId
        drugName
        qty
        unitPrice
        amount
      }
      totalAmount
      notes
      createdAt
    }
  }
`;

export const LIST_CLINICIAN_SCHEDULES = gql`
  query ListClinicianSchedules($clinicianId: String) {
    clinicianSchedules(clinicianId: $clinicianId) {
      id
      clinicianId
      clinicianName
      dayOfWeek
      startTime
      endTime
      slotMinutes
      active
    }
  }
`;

export const LIST_ENCOUNTERS = gql`
  query ListEncounters($patientId: String, $clinicianId: String, $date: String, $status: String) {
    encounters(patientId: $patientId, clinicianId: $clinicianId, date: $date, status: $status) {
      id
      patientId
      patientName
      patientMrn
      patientAllergies
      clinicianId
      clinicianName
      appointmentId
      crNumber
      visitType
      visitDate
      chiefComplaint
      diagnosis
      vitals
      prescription
      notes
      followUpDate
      status
      createdAt
    }
  }
`;

// A clinician's own calendar: their weekly consulting windows plus every
// appointment booked into them between two dates. Scoped to the caller, so a
// doctor can open it without access to the admin Schedules page.
export const MY_CLINICIAN_CALENDAR = gql`
  query MyClinicianCalendar($from: String!, $to: String!) {
    myClinicianCalendar(from: $from, to: $to) {
      clinicianId
      clinicianName
      windows {
        id
        dayOfWeek
        startTime
        endTime
        slotMinutes
        active
      }
      appointments {
        id
        patientName
        patientMrn
        departmentName
        date
        startTime
        endTime
        reason
        status
      }
    }
  }
`;
