import apiClient from "@/api/client";

// Clinical service — billing CRUD is GraphQL; only the binary invoice PDF
// stays REST, streamed by the backend (handlers/clinical_pdf.go).
export const clinicalAPI = {
  // One invoice (with payment history) as a PDF; doubles as the receipt when paid.
  downloadInvoicePDF: (invoiceId: string) =>
    apiClient.get(`/clinical/invoices/${invoiceId}/pdf`, { responseType: "blob" }),

  // A discharged admission's summary as a PDF (Phase 3).
  downloadDischargeSummaryPDF: (admissionId: string) =>
    apiClient.get(`/clinical/admissions/${admissionId}/discharge-summary`, { responseType: "blob" }),

  // Submit an insurance claim into the approval engine (Phase 4).
  submitClaim: (claimId: string) => apiClient.post(`/clinical/claims/${claimId}/submit`),
};
