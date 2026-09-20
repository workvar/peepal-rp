export interface StudentFormState {
  name: string;
  email: string;
  password: string;
  course_id: string;
  roll_number: string;
  section: string;
  semester: string;
  phone: string;
  enroll_date: string;
  date_of_birth: string;
  gender: string;
  photo_url: string;
  batch: string;
  father_name: string;
  mother_name: string;
}

export interface GqlStudent {
  id: string;
  rollNumber: string;
  section?: string | null;
  semester?: number | null;
  phone?: string | null;
  enrollDate?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  admissionStatus?: string | null;
  batch?: string | null;
  photoUrl?: string | null;
  user?: { id: string; name: string; email: string; role: string; isActive: boolean } | null;
  course?: { id: string; name: string; code: string } | null;
}

export interface GqlUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface GqlCourseBatch {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
}

export interface GqlCourse {
  id: string;
  name: string;
  code: string;
  durationYears?: number | null;
  batches?: GqlCourseBatch[];
  department?: { id: string; name: string } | null;
}
