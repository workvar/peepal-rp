// Shape of the label map returned by the /api/v1/terminology endpoint.
// Keep generic: one concept per field, singular + plural where it matters.
export interface Terminology {
  organization: string;
  organization_plural: string;

  member: string; // Student / Employee / Patient / Member
  member_plural: string;

  staff: string; // Teacher / Manager / Clinician / Coordinator
  staff_plural: string;

  department: string; // Department / Team / Ward / Program
  department_plural: string;

  course: string; // Course / Training / Program / Workshop
  course_plural: string;

  attendance: string;
  marks: string;
  leave: string;

  // Scheduling / grouping concepts. Education says class-batch-semester;
  // other verticals fill the same slots with their own words so shared
  // pages can be relabelled instead of hidden.
  session: string; // Class / Session / Shift
  session_plural: string;
  cohort: string; // Batch / Cohort / Unit / Group
  cohort_plural: string;
  term: string; // Semester / Quarter / Cycle
  term_plural: string;
  year: string; // Academic Year / Financial Year / Program Year

  // Role display names. The stored role ids are always
  // admin/teacher/student/staff; these are what the UI shows for them.
  role_staff: string; // label for the `teacher` role
  role_staff_plural: string;
  role_member: string; // label for the `student` role
  role_member_plural: string;
  role_support: string; // label for the `staff` role
  role_support_plural: string;
}
