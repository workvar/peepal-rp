package pdftemplate

import (
	"bytes"

	"collegeerp/qrcode"

	"github.com/jung-kurt/gofpdf"
)

// ImagePNG places a PNG (e.g. from qrcode.PNG) at the current flow position,
// wmm x hmm in millimetres. name must be a stable key unique per distinct
// image within the document (gofpdf caches by name).
func (d *Doc) ImagePNG(name string, png []byte, wmm, hmm float64) {
	if len(png) == 0 {
		return
	}
	opt := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}
	d.pdf.RegisterImageOptionsReader(name, opt, bytes.NewReader(png))
	// x=nil-equivalent: place at current x; pass current X/Y explicitly.
	x := d.pdf.GetX()
	y := d.pdf.GetY()
	d.pdf.ImageOptions(name, x, y, wmm, hmm, true, opt, 0, "")
}

// QRTopRight stamps a QR of content in the top-right corner of the current page
// without disturbing the text flow. sizeMm is the square edge in millimetres.
func (d *Doc) QRTopRight(content string, sizeMm float64) {
	png, err := qrcode.PNG(content, 512)
	if err != nil || len(png) == 0 {
		return
	}
	pageWidth, _ := d.pdf.GetPageSize()
	_, top, right, _ := d.pdf.GetMargins()
	x := pageWidth - right - sizeMm
	name := "qr:" + content
	opt := gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}
	d.pdf.RegisterImageOptionsReader(name, opt, bytes.NewReader(png))
	// flow=false so the cursor stays where the body text expects it.
	d.pdf.ImageOptions(name, x, top, sizeMm, sizeMm, false, opt, 0, "")
}
