package pdftemplate

// A tiny block-based text document renderer on top of gofpdf. The fee receipt,
// fee schedule, and grade report builders lay out styled blocks top-to-bottom
// (headings, body lines, spacers, page breaks) instead of hand-placing cells.
// This mirrors the old client-side PdfBlock writer so the PDFs look the same,
// while keeping each builder small and declarative.

import (
	"bytes"

	"github.com/jung-kurt/gofpdf"
)

// Doc accumulates styled text blocks and renders them to PDF bytes.
type Doc struct {
	pdf   *gofpdf.Fpdf
	width float64 // usable content width in mm
}

// NewDoc starts an A4 portrait document with sensible margins and one page.
func NewDoc() *Doc {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)
	pdf.AddPage()

	pageWidth, _ := pdf.GetPageSize()
	left, _, right, _ := pdf.GetMargins()
	return &Doc{pdf: pdf, width: pageWidth - left - right}
}

// line writes one wrapped text block in the given style.
func (d *Doc) line(style, weight string, size, lineHeight float64, r, g, b int, text string) {
	d.pdf.SetFont("Helvetica", weight, size)
	d.pdf.SetTextColor(r, g, b)
	d.pdf.MultiCell(d.width, lineHeight, ascii(text), "", "L", false)
}

// H1 is the document title.
func (d *Doc) H1(text string) { d.line("h1", "B", 18, 8, 20, 20, 20, text) }

// H2 is a section heading.
func (d *Doc) H2(text string) {
	d.Space(2)
	d.line("h2", "B", 13, 6, 20, 20, 20, text)
}

// H3 is a sub-heading / summary line.
func (d *Doc) H3(text string) { d.line("h3", "B", 11, 5.5, 60, 60, 60, text) }

// Body is a normal paragraph line.
func (d *Doc) Body(text string) { d.line("body", "", 10, 5, 40, 40, 40, text) }

// Muted is a lighter body line used for secondary details.
func (d *Doc) Muted(text string) { d.line("muted", "", 9, 4.5, 110, 110, 110, text) }

// Italic is the small grey disclaimer footer.
func (d *Doc) Italic(text string) { d.line("italic", "I", 9, 5, 140, 140, 140, text) }

// Space adds vertical whitespace (in mm).
func (d *Doc) Space(h float64) { d.pdf.Ln(h) }

// PageBreak starts a fresh page (used to print one receipt per page).
func (d *Doc) PageBreak() { d.pdf.AddPage() }

// Watermark stamps large, pale, rotated text diagonally across the current
// page without moving the cursor — used to mark a draft question paper so a
// printed copy can never be mistaken for the final one.
func (d *Doc) Watermark(text string) {
	if text == "" {
		return
	}
	x, y := d.pdf.GetX(), d.pdf.GetY()
	pageWidth, pageHeight := d.pdf.GetPageSize()

	d.pdf.SetFont("Helvetica", "B", 60)
	d.pdf.SetTextColor(232, 232, 232)
	// Rotate about the page centre, write once, then unwind the transform.
	d.pdf.TransformBegin()
	d.pdf.TransformRotate(45, pageWidth/2, pageHeight/2)
	d.pdf.SetXY(0, pageHeight/2)
	d.pdf.CellFormat(pageWidth, 20, ascii(text), "", 0, "C", false, 0, "")
	d.pdf.TransformEnd()

	d.pdf.SetXY(x, y)
}

// Divider draws a thin horizontal rule across the content width.
func (d *Doc) Divider() {
	d.Space(2)
	left, _, _, _ := d.pdf.GetMargins()
	y := d.pdf.GetY()
	d.pdf.SetDrawColor(210, 210, 210)
	d.pdf.SetLineWidth(0.3)
	d.pdf.Line(left, y, left+d.width, y)
	d.Space(3)
}

// Bytes finalises the document and returns the PDF bytes.
func (d *Doc) Bytes() ([]byte, error) {
	var buf bytes.Buffer
	if err := d.pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
