import apiClient from "@/api/client";

// Exam cell PDFs. Everything else in the exam cell (question bank, paper
// generation, hall-ticket issuing) is GraphQL — only these binary downloads
// go over REST.
export const examCellAPI = {
  // Question paper. Drafts come back with a DRAFT watermark.
  downloadPaperPDF: (paperId: string) =>
    apiClient.get(`/exam-cell/papers/${paperId}/pdf`, { responseType: "blob" }),

  // One student's admit card, for the exam office.
  downloadHallTicketPDF: (ticketId: string) =>
    apiClient.get(`/exam-cell/hall-tickets/${ticketId}/pdf`, { responseType: "blob" }),

  // The signed-in student's own admit card for one exam schedule. The backend
  // resolves the ticket from the session, so no id is passed.
  downloadMyHallTicketPDF: (examScheduleId: string) =>
    apiClient.get(`/exam-cell/hall-tickets/me/pdf`, {
      params: { examScheduleId },
      responseType: "blob",
    }),
};
