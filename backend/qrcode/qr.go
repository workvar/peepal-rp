// Package qrcode renders QR codes and Code-128 barcodes to image bytes
// server-side. It is cross-cutting infra: PDF builders (pdf-template/*.go) and
// the generic /codes REST endpoint both call into it. No DB, no GraphQL surface.
package qrcode

import (
	"bytes"
	"errors"
	"image/png"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/qr"
)

// PNG returns a square QR PNG of the given pixel size encoding content.
// Uses medium error correction (good balance of density vs. damage tolerance).
func PNG(content string, sizePx int) ([]byte, error) {
	if content == "" {
		return nil, errors.New("qrcode: empty content")
	}
	if sizePx <= 0 {
		sizePx = 256
	}
	code, err := qr.Encode(content, qr.M, qr.Auto)
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
