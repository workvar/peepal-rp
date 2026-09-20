import apiClient from "@/api/client";

// Generic bulk-upload guide PDF. The GraphQL-loop bulk dialogs define their
// field schema on the frontend and POST it here; the backend renders the PDF
// (template lives in backend/pdf-template). Returns a binary blob.
export interface BulkGuideFieldReq {
  name: string;
  typeLabel: string;
  required: boolean;
  description?: string;
  allowedValues?: string[];
  example?: string;
}

export interface BulkGuideSpecReq {
  title: string;
  description: string;
  fields: BulkGuideFieldReq[];
}

export const bulkGuideAPI = {
  downloadPDF: (spec: BulkGuideSpecReq) =>
    apiClient.post(`/bulk-guides/pdf`, spec, { responseType: "blob" }),
};
