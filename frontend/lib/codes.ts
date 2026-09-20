// Thin helpers to build image URLs for the backend QR / barcode endpoints
// (Phase 1 infra). Reused by hall tickets (Phase 5) and any ID-card view.
// Same-origin <img> requests carry the auth cookie automatically.

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

export const qrSrc = (content: string, size = 256): string =>
  `${apiBase}/api/v1/codes/qr?content=${encodeURIComponent(content)}&size=${size}`;

export const barcodeSrc = (content: string, w = 300, h = 80): string =>
  `${apiBase}/api/v1/codes/barcode?content=${encodeURIComponent(content)}&w=${w}&h=${h}`;
