import apiClient from "@/api/client";
import { API_BASE_URL } from "@/config";

export type PhotoEntity = "user" | "employee" | "student";

/**
 * uploadPhoto — send a multipart form with a single `file` field to the
 * backend. The server stores the image, updates the target row's
 * photo_url, and returns the URL it wrote.
 *
 * For `entity="user"` with no id, the backend uses the authenticated user.
 */
export async function uploadPhoto(
  file: File,
  entity: PhotoEntity,
  id?: string
): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const qs = new URLSearchParams({ entity });
  if (id) qs.set("id", id);

  // NOTE: do NOT set Content-Type manually. Axios + the browser must be
  // allowed to insert the multipart boundary automatically; overriding the
  // header strips the boundary and the backend fails to parse the form.
  const res = await apiClient.post(`/uploads/photo?${qs.toString()}`, form, {
    headers: { "Content-Type": undefined },
  });
  return res.data.data.url as string;
}

/**
 * resolvePhotoUrl — backend returns URLs like "/api/v1/uploads/photos/...".
 * Prefix them with the API base so images render when the API lives on a
 * different origin than the Next.js app.
 */
export function resolvePhotoUrl(url?: string | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${base}${url}`;
}
