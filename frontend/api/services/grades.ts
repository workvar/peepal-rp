import apiClient from "@/api/client";

// Grades service — the transcript PDF is generated on the backend and streamed
// as a download. Grading data itself is served over GraphQL.
export const gradeAPI = {
  // Students get their own report; admins/teachers may pass a studentId.
  downloadReportPDF: (studentId?: string) =>
    apiClient.get(`/grades/me/pdf`, {
      params: studentId ? { studentId } : undefined,
      responseType: "blob",
    }),
};
