// Shared types for the Curriculum page.

export type GqlCourse = {
  id: string;
  name: string;
  code: string;
  durationYears?: number | null;
  totalSemesters?: number | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
};

export type GqlCurriculumSubject = {
  id: string;
  courseId: string;
  semesterNumber: number;
  sortOrder?: number | null;
  subject: {
    id: string;
    name: string;
    code: string;
    credits?: number | null;
    courseOutcomes?: string[] | null;
    units?: { title: string }[] | null;
  };
};

export type GqlPickSubject = {
  id: string;
  name: string;
  code: string;
  semesterNumber?: number | null;
  credits?: number | null;
};
