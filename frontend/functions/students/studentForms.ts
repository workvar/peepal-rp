import type { GqlStudent, StudentFormState } from "@/types/pages/students/page";

export const emptyStudentForm: StudentFormState = {
  name: "",
  email: "",
  password: "",
  course_id: "",
  roll_number: "",
  section: "",
  semester: "1",
  phone: "",
  enroll_date: "",
  date_of_birth: "",
  gender: "",
  photo_url: "",
  batch: "",
  father_name: "",
  mother_name: "",
};

/**
 * Build the CreateStudentInput payload (camelCase). The student's login
 * account is created inline from name/email/password, so there is no separate
 * "add user then assign" step. Pass an invite payload to send a password-setup
 * link instead of (or in addition to) an initial password.
 */
export function buildStudentInput(
  form: StudentFormState,
  invite?: { sendInvite: boolean; password: string }
) {
  const password = invite ? invite.password : form.password;
  return {
    name: form.name,
    email: form.email || null,
    password: password || null,
    sendInvite: invite ? invite.sendInvite : false,
    courseId: form.course_id,
    rollNumber: form.roll_number,
    section: form.section || null,
    semester: parseInt(form.semester, 10),
    phone: form.phone || null,
    enrollDate: form.enroll_date || null,
    dateOfBirth: form.date_of_birth || null,
    gender: form.gender || null,
    photoUrl: form.photo_url || null,
    batch: form.batch || null,
    fatherName: form.father_name || null,
    motherName: form.mother_name || null,
  };
}

/**
 * Build the UpdateStudentInput payload (camelCase). Identity edits (name/email)
 * are always sent; password is only included when the admin typed a new one.
 */
export function buildStudentUpdateInput(form: StudentFormState) {
  return {
    name: form.name,
    email: form.email || null,
    ...(form.password ? { password: form.password } : {}),
    courseId: form.course_id || null,
    rollNumber: form.roll_number,
    section: form.section || null,
    semester: parseInt(form.semester, 10),
    phone: form.phone || null,
    enrollDate: form.enroll_date || null,
    dateOfBirth: form.date_of_birth || null,
    gender: form.gender || null,
    photoUrl: form.photo_url || null,
    batch: form.batch || null,
    fatherName: form.father_name || null,
    motherName: form.mother_name || null,
  };
}

export function filterStudents(students: GqlStudent[], search: string) {
  if (!search) {
    return students;
  }

  const normalizedSearch = search.toLowerCase();

  return students.filter((student) =>
    [student.user?.name, student.rollNumber, student.course?.name, student.section].some((value) =>
      String(value ?? "").toLowerCase().includes(normalizedSearch)
    )
  );
}
