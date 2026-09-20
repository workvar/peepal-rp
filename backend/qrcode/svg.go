package qrcode

import (
	"errors"
	"fmt"
	"strings"

	"github.com/boombuler/barcode/qr"
)

// QRSVG returns a scalable QR as an SVG string, preferred for print-quality
// PDFs. It walks the encoded bit matrix and emits one <rect> per dark module,
// avoiding a second raster dependency. sizePx is the viewBox edge length.
func QRSVG(content string, sizePx int) (string, error) {
	if content == "" {
		return "", errors.New("qrcode: empty content")
	}
	if sizePx <= 0 {
		sizePx = 256
	}
	code, err := qr.Encode(content, qr.M, qr.Auto)
	if err != nil {
		return "", err
	}
	dim := code.Bounds().Dx() // QR modules per side
	if dim <= 0 {
		return "", errors.New("qrcode: empty matrix")
	}
	// Scale so the module grid fills sizePx exactly.
	cell := float64(sizePx) / float64(dim)

	var b strings.Builder
	fmt.Fprintf(&b, `<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" shape-rendering="crispEdges">`,
		sizePx, sizePx, sizePx, sizePx)
	b.WriteString(`<rect width="100%" height="100%" fill="#ffffff"/>`)
	for y := 0; y < dim; y++ {
		for x := 0; x < dim; x++ {
			// A dark module is black; test luminance via the model.
			r, g, bl, _ := code.At(x, y).RGBA()
			if r == 0 && g == 0 && bl == 0 {
				fmt.Fprintf(&b, `<rect x="%.3f" y="%.3f" width="%.3f" height="%.3f" fill="#000000"/>`,
					float64(x)*cell, float64(y)*cell, cell, cell)
			}
		}
	}
	b.WriteString(`</svg>`)
	return b.String(), nil
}
