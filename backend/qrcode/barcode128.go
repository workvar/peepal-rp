package qrcode

import (
	"bytes"
	"errors"
	"image/png"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/code128"
)

// Code128PNG returns a Code-128 barcode PNG (w x h px) for content such as a
// student roll number, MRN, or inventory item code.
func Code128PNG(content string, w, h int) ([]byte, error) {
	if content == "" {
		return nil, errors.New("qrcode: empty content")
	}
	if w <= 0 {
		w = 300
	}
	if h <= 0 {
		h = 80
	}
	code, err := code128.Encode(content)
	if err != nil {
		return nil, err
	}
	scaled, err := barcode.Scale(code, w, h)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, scaled); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
