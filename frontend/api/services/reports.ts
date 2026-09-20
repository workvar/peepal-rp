import apiClient from "@/api/client";

export const reportsAPI = {
  dashboard: () => apiClient.get("/reports/dashboard"),
  attendance: (params?: { from_date?: string; to_date?: string; entity_type?: string; subject_id?: string }) =>
    apiClient.get("/reports/attendance", { params }),
  marks: (params?: { course_id?: string; semester_number?: string; academic_year_id?: string; assessment_type?: string }) =>
    apiClient.get("/reports/marks", { params }),
  leaves: (params?: { year?: string; department?: string }) => apiClient.get("/reports/leaves", { params }),
  fees: (params?: { academic_year_id?: string }) => apiClient.get("/reports/fees", { params }),
  payroll: (params?: { year?: string }) => apiClient.get("/reports/payroll", { params }),
};
