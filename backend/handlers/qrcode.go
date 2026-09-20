package handlers

// Generic on-screen / printable code images. The frontend sometimes needs a raw
// QR or barcode PNG with no surrounding PDF (ID-card designer, quick print).
// Binary streaming is a sanctioned REST case. Only the caller-supplied `content`
// is echoed back; verification-signed payloads are built server-side inside PDF
// builders via qrcode.VerifyURL, never passed through here.

import (
	"strconv"

	"collegeerp/qrcode"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

func parseIntDefault(raw string, def int) int {
	if raw == "" {
		return def
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return def
	}
	return n
}

func clamp(n, lo, hi int) int {
	if n < lo {
		return lo
	}
	if n > hi {
		return hi
	}
	return n
}

// GenerateQR: GET /api/v1/codes/qr?content=<text>&size=256 -> image/png
func GenerateQR(c *fiber.Ctx) error {
	content := c.Query("content")
	if content == "" {
		return utils.BadRequest(c, "content is required")
	}
	size := clamp(parseIntDefault(c.Query("size"), 256), 64, 1024)
	png, err := qrcode.PNG(content, size)
	if err != nil {
		return utils.InternalError(c, "failed to generate code")
	}
	c.Set("Content-Type", "image/png")
	c.Set("Cache-Control", "private, max-age=3600")
	return c.Send(png)
}

// GenerateBarcode: GET /api/v1/codes/barcode?content=<text>&w=300&h=80 -> image/png
func GenerateBarcode(c *fiber.Ctx) error {
	content := c.Query("content")
	if content == "" {
		return utils.BadRequest(c, "content is required")
	}
	w := clamp(parseIntDefault(c.Query("w"), 300), 80, 1600)
	h := clamp(parseIntDefault(c.Query("h"), 80), 20, 400)
	png, err := qrcode.Code128PNG(content, w, h)
	if err != nil {
		return utils.InternalError(c, "failed to generate barcode")
	}
	c.Set("Content-Type", "image/png")
	c.Set("Cache-Control", "private, max-age=3600")
	return c.Send(png)
}
