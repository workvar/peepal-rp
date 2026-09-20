import apiClient from "@/api/client";
import { API_BASE_URL } from "@/config";

// Field & schema shapes mirror backend/handlers/bulk/registry.go — anything
// you change here must also change there.
export type BulkFieldType =
  | "string"
  | "int"
  | "float"
  | "bool"
  | "date"
  | "daterange"
  | "enum"
  | "email";

export interface BulkField {
  name: string;
  label: string;
  type: BulkFieldType;
  required: boolean;
  description?: string;
  allowed_values?: string[];
  example?: string;
  min?: number;
  max?: number;
  skip_if_blank?: boolean;
}

export interface BulkSchema {
  resource: string;
  title: string;
  description: string;
  fields: BulkField[];
  // Server-advertised max CSV size in bytes. The client uses this to reject
  // oversized files before reading them. Absent on older servers → fall
  // back to a conservative 10 MiB default on the caller side.
  max_file_size_bytes?: number;
}

export interface BulkRowError {
  index: number;
  field: string;
  error: string;
}

// The created record's DB id is intentionally not returned by the server —
// UUIDs are noise (and a minor info leak) for end users. The client builds
// its own human-readable summary from the row values it already has.
export interface BulkRowResult {
  index: number;
  success: boolean;
  error?: string;
}

export interface BulkSubmitResponse {
  results: BulkRowResult[];
  total: number;
  successful: number;
  failed: number;
}

export interface BulkValidateResponse {
  errors: BulkRowError[];
  total: number;
  valid: boolean;
}

// The bulk API mirrors the REST paths registered in routes.go:
// /api/v1/bulk/:resource/{schema,template,docs,validate,submit}
export const bulkAPI = {
  getSchema: (resource: string) =>
    apiClient
      .get<{ data: BulkSchema }>(`/bulk/${resource}/schema`)
      .then((r) => r.data.data),

  validate: (resource: string, rows: Record<string, string>[]) =>
    apiClient
      .post<{ data: BulkValidateResponse }>(`/bulk/${resource}/validate`, { rows })
      .then((r) => r.data.data),

  submit: (resource: string, rows: Record<string, string>[]) =>
    apiClient
      .post<{ data: BulkSubmitResponse }>(`/bulk/${resource}/submit`, { rows })
      .then((r) => r.data.data),

  // Template and docs are GETs that return binary payloads. We build the
  // absolute URL so the browser can trigger a regular download — but we
  // still need to include the JWT, so we fetch + blob + object-url rather
  // than a plain <a> tag.
  downloadTemplate: async (resource: string): Promise<Blob> => {
    const response = await apiClient.get(`/bulk/${resource}/template`, {
      responseType: "blob",
    });
    return response.data;
  },

  downloadDocs: async (resource: string): Promise<Blob> => {
    const response = await apiClient.get(`/bulk/${resource}/docs`, {
      responseType: "blob",
    });
    return response.data;
  },

  downloadStarterKit: async (resource: string): Promise<Blob> => {
    const response = await apiClient.get(`/bulk/${resource}/starter-kit`, {
      responseType: "blob",
    });
    return response.data;
  },

  // Exposed for debug/tooling.
  buildUrl: (path: string) => `${API_BASE_URL}${path}`,
};

// Fallback used when the server doesn't advertise a limit. Matches the
// backend default in handlers/bulk/registry.go.
export const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// formatBytes renders a byte count as a short, human-friendly string.
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Utility used by the dialog: trigger a browser save for a blob.
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
