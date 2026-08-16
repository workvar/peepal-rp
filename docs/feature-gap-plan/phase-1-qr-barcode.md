# Phase 1 — QR / Barcode Service

Cross-cutting infra built once, reused by lab report PDFs, patient/student ID cards, and hall
tickets (Phase 5). No new DB models, no GraphQL surface — it is a pure Go package plus one
generic REST image endpoint. Effort ~1 week, no dependencies.

## Goal

A `backend/qrcode/` package that renders QR codes and Code-128 barcodes to PNG/SVG bytes
server-side, callable from any `pdf-template/*.go` builder and from a small REST endpoint for
on-screen/printable codes.

## 1. Dependency

Add one library (pure-Go, no CGO):

```
go get github.com/boombuler/barcode          # QR + Code128 + EAN, raster to image.Image
```

`github.com/boombuler/barcode/qr` and `.../code128` cover both needs. For SVG output (crisp on
print), add `github.com/ajstarks/svgo` or hand-emit a `<rect>` grid from the QR bit matrix
(`qr.Encode` exposes `.At(x,y)`); a ~40-line SVG encoder avoids a second dependency. Record the
choice in `go.mod` and the phase PR description.

## 2. Package `backend/qrcode/`

Keep files small, one concern each.

**`qrcode/qr.go`**
```go
package qrcode

import (
    "bytes"
    "image/png"

    "github.com/boombuler/barcode"
    "github.com/boombuler/barcode/qr"
)

// PNG returns a square QR PNG of the given pixel size encoding content.
func PNG(content string, sizePx int) ([]byte, error) {
    code, err := qr.Encode(content, qr.M, qr.Auto) // medium error correction
    if err != nil {
        return nil, err
    }
    scaled, err := barcode.Scale(code, sizePx, sizePx)
    if err != nil {
        return nil, err
    }
    var buf bytes.Buffer
    if err := png.Encode(&buf, scaled); err != nil {
        return nil, err
    }
    return buf.Bytes(), nil
}
```

**`qrcode/barcode128.go`**
```go
package qrcode

// Code128PNG returns a Code-128 barcode PNG (w x h px) for content
// (student roll no, MRN, item code, etc.).
func Code128PNG(content string, w, h int) ([]byte, error) { /* code128.Encode → Scale → png */ }
```

**`qrcode/svg.go`**
```go
package qrcode

// QRSVG returns a scalable QR as an SVG string (preferred for print-quality PDFs).
func QRSVG(content string, sizePx int) (string, error) { /* qr.Encode → walk bit matrix → <rect> grid */ }
```

**`qrcode/payload.go`** — canonical, forgery-resistant payload builders so every caller encodes
the same string shape. Include tenant id + entity type + entity id + a short HMAC over them
(reuse the JWT signing secret from `config`) so a scanned code can be verified server-side later
(hall-ticket attendance in Phase 5).
```go
package qrcode

// VerifyURL builds the canonical scan payload: an absolute verify URL carrying
// tenant, kind, id and a signature. e.g.
//   https://<app>/verify?t=<tenant>&k=labreport&id=<uuid>&s=<hmac10>
func VerifyURL(baseURL, tenantID, kind, id string) string { /* … */ }

// Sign returns the first 10 hex chars of HMAC-SHA256(secret, tenant|kind|id).
func Sign(tenantID, kind, id string) string { /* … */ }
```

Kinds used across phases: `labreport`, `patientid`, `studentid`, `hallticket`, `invoice`.

## 3. PDF integration

`pdf-template/doc.go` currently exposes text blocks only. Add an image block so builders can drop
a code without touching gofpdf directly.

**`pdf-template/doc.go`** — new method on the `Doc` wrapper:
```go
// ImagePNG places a PNG (from qrcode.PNG) at the current flow position,
// w x h in mm, right-aligned by default. Uses gofpdf RegisterImageOptionsReader.
func (d *Doc) ImagePNG(name string, png []byte, wmm, hmm float64) { /* … */ }

// QRTopRight stamps a QR of `content` in the top-right corner of the first page.
func (d *Doc) QRTopRight(content string, sizeMm float64) { /* qrcode.PNG → ImagePNG */ }
```

Then, existing document builders opt in. Example — lab report (Phase 3 healthcare doc, if/when
built) and discharge summary:
```go
d.QRTopRight(qrcode.VerifyURL(baseURL, tenantID, "labreport", report.ID), 22)
```
For Phase 1 delivery, wire it into at least one existing PDF as a proof: the **fee receipt**
(`pdf-template/fee_receipt.go`) or **discharge summary** — stamp a QR encoding the
invoice/admission id so the feature is demonstrably in use.

## 4. REST endpoint (on-screen / printable codes)

The frontend sometimes needs a raw code image (ID-card designer, quick print) with no PDF. One
generic authenticated route, since binary streaming is a sanctioned REST case.

**`backend/handlers/qrcode.go`**
```go
// GET /api/v1/codes/qr?content=<text>&size=256   -> image/png
// GET /api/v1/codes/barcode?content=<text>&w=300&h=80 -> image/png
func GenerateQR(c *fiber.Ctx) error {
    content := c.Query("content")
    if content == "" { return utils.BadRequest(c, "content is required") }
    size := parseIntDefault(c.Query("size"), 256) // clamp 64..1024
    png, err := qrcode.PNG(content, size)
    if err != nil { return utils.InternalError(c, "failed to generate code") }
    c.Set("Content-Type", "image/png")
    c.Set("Cache-Control", "private, max-age=3600")
    return c.Send(png)
}
```

**`backend/routes/routes.go`** — under the authenticated api group:
```go
codes := api.Group("/codes", middleware.Authenticate)
codes.Get("/qr", handlers.GenerateQR)
codes.Get("/barcode", handlers.GenerateBarcode)
```

Security: only echo caller-supplied `content` for the generic endpoint; **never** embed secrets.
Verification-signed payloads are built server-side inside PDF builders via `qrcode.VerifyURL`, not
passed through this endpoint.

## 5. Frontend helper (thin)

No new module/page. Add a tiny helper + component for reuse by Phase 5 and ID cards.

**`frontend/lib/codes.ts`**
```ts
export const qrSrc = (content: string, size = 256) =>
  `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/codes/qr?content=${encodeURIComponent(content)}&size=${size}`;
export const barcodeSrc = (content: string, w = 300, h = 80) =>
  `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/codes/barcode?content=${encodeURIComponent(content)}&w=${w}&h=${h}`;
```

**`frontend/components/shared/CodeImage.tsx`** — `<img>` wrapper with alt text and a loading
skeleton; used later by hall tickets and any ID-card view. `credentials:"include"` is automatic
for same-origin `<img>`; if `NEXT_PUBLIC_API_URL` is cross-origin, fetch as blob with credentials.

## Access / subscription

None. This is infra, not a user-facing module — no `AccessModules`, `defaultPageMap`,
`moduleIndustries`, `opAccess`, `BASE_MODULES`, or nav entries. The REST endpoint is guarded only
by `middleware.Authenticate` (any logged-in user of any tenant may render a code).

## Files touched

Backend: `qrcode/qr.go`, `qrcode/barcode128.go`, `qrcode/svg.go`, `qrcode/payload.go` (new);
`pdf-template/doc.go` (+ImagePNG/QRTopRight); one existing `pdf-template/*.go` builder (proof of
use); `handlers/qrcode.go` (new); `routes/routes.go` (+2 routes); `go.mod`/`go.sum`.
Frontend: `lib/codes.ts`, `components/shared/CodeImage.tsx` (new).

## Test / done

- Go unit test `qrcode/qr_test.go`: `PNG` returns non-empty valid PNG (decode header), `Sign`
  is deterministic and 10 chars, `VerifyURL` round-trips through a parse+verify helper.
- Manual: hit `/api/v1/codes/qr?content=hello&size=200`, confirm a scannable PNG; open the proof
  PDF and confirm the stamped QR scans to the expected verify URL.
- No migration, no `regen.sh` (no schema change).
