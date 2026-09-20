import apiClient from "@/api/client";

// Operations service — what stays REST after the GraphQL migration:
//   • attendanceExportAPI — returns a binary CSV/Excel blob
//   • attendanceSummaryAPI — complex aggregation, stays REST for now

// Holidays, calendar settings, attendance settings, and calendar month
// have all been migrated to GraphQL (createHoliday, updateCalendarSettings,
// generateCalendar, upsertCalendarDay, updateAttendanceSettings,
// attendanceSettings query, calendarSettings query, calendarMonth query).

export const attendanceSummaryAPI = {
  summary: (params?: { entity_type?: string; subject_id?: string; from_date?: string; to_date?: string }) =>
    apiClient.get("/attendance/summary", { params }),
  shortage: () => apiClient.get("/attendance/shortage"),
};

export const attendanceExportAPI = {
  export: (params: { from_date: string; to_date: string; course_id?: string; batch?: string; type: string }) =>
    apiClient.get("/attendance/export", { params, responseType: "blob" }),
};
