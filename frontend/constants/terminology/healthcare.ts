import type { Terminology } from "./types";

export const healthcareTerminology: Terminology = {
  organization: "Facility",
  organization_plural: "Facilities",
  member: "Patient",
  member_plural: "Patients",
  staff: "Clinician",
  staff_plural: "Clinicians",
  department: "Ward",
  department_plural: "Wards",
  course: "Program",
  course_plural: "Programs",
  attendance: "Shifts",
  marks: "Assessments",
  leave: "Leave",
  session: "Shift",
  session_plural: "Shifts",
  cohort: "Unit",
  cohort_plural: "Units",
  term: "Cycle",
  term_plural: "Cycles",
  year: "Financial Year",
  role_staff: "Clinician",
  role_staff_plural: "Clinicians",
  // `student` maps to Trainee, not Patient: patients have their own
  // dedicated `patient` role, so reusing "Patient" here would collide.
  role_member: "Trainee",
  role_member_plural: "Trainees",
  role_support: "Support Staff",
  role_support_plural: "Support Staff",
};
