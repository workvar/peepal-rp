package pdftemplate

// Salary payslip PDF. Unlike the text-only fee/grade documents this one uses a
// richer hand-placed layout (two-column grids, a net-pay banner), so it draws
// directly with gofpdf rather than the block renderer.

import (
	"bytes"
	"collegeerp/models"
	"fmt"

	"github.com/jung-kurt/gofpdf"
)

// PayslipData is the flat view-model passed to the PDF renderer. Keeping this
// decoupled from GORM models lets the handler marshal whatever data it has on
// hand (tenant name, employee info, payroll record) into a single struct.
type PayslipData struct {
	TenantName   string
	TenantLogo   string // reserved for later — not rendered yet
	EmployeeName string
	EmployeeCode string
	Department   string
	Designation  string
	Email        string
	Period       string // e.g. "April 2026"
	PaymentDate  string // e.g. "20 April 2026"
	PaymentMode  string // e.g. "Bank Transfer"
	WorkingDays  int
	PresentDays  int
	LeaveDays    int
	Payroll      models.Payroll
	Currency     string // e.g. "INR"
}

// BuildPayslipPDF renders a single-page payslip PDF for a paid payroll and
// returns the raw bytes. It deliberately uses only core fonts (Helvetica) so no
// TTF assets need to ship with the binary.
func BuildPayslipPDF(data PayslipData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)
	pdf.AddPage()

	drawPayslipHeader(pdf, data)
	drawPayslipEmployeeInfo(pdf, data)
	drawPayslipEarningsAndDeductions(pdf, data)
	drawPayslipNetPay(pdf, data)
	drawPayslipFooter(pdf, data)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// ── Section: Header ───────────────────────────────────────────────

func drawPayslipHeader(pdf *gofpdf.Fpdf, data PayslipData) {
	pageWidth, _ := pdf.GetPageSize()
	left, _, right, _ := pdf.GetMargins()
	usableWidth := pageWidth - left - right

	pdf.SetFont("Helvetica", "B", 18)
	pdf.SetTextColor(20, 20, 20)
	tenant := data.TenantName
	if tenant == "" {
		tenant = "Payslip"
	}
	pdf.CellFormat(usableWidth, 8, ascii(tenant), "", 1, "L", false, 0, "")

	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(110, 110, 110)
	pdf.CellFormat(usableWidth, 5, "Salary Payslip", "", 1, "L", false, 0, "")

	pdf.Ln(2)

	// Paid badge (left)
	pdf.SetFillColor(220, 252, 231)
	pdf.SetTextColor(21, 128, 61)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.CellFormat(18, 5, "PAID", "", 0, "C", true, 0, "")

	// Pay period (right)
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(110, 110, 110)
	pdf.SetX(left + usableWidth/2)
	pdf.CellFormat(usableWidth/4, 5, "Pay Period:", "", 0, "R", false, 0, "")
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(20, 20, 20)
	pdf.CellFormat(usableWidth/4, 5, ascii(data.Period), "", 1, "R", false, 0, "")

	pdf.Ln(3)
	y := pdf.GetY()
	pdf.SetDrawColor(20, 20, 20)
	pdf.SetLineWidth(0.5)
	pdf.Line(left, y, left+usableWidth, y)
	pdf.Ln(4)
}

// ── Section: Employee info grid ───────────────────────────────────

func drawPayslipEmployeeInfo(pdf *gofpdf.Fpdf, data PayslipData) {
	pageWidth, _ := pdf.GetPageSize()
	left, _, right, _ := pdf.GetMargins()
	usableWidth := pageWidth - left - right

	colWidth := usableWidth / 2
	labelW := 40.0
	valueW := colWidth - labelW

	rows := [][2]string{
		{"Employee Name", fallback(data.EmployeeName)},
		{"Employee ID", fallback(data.EmployeeCode)},
		{"Department", fallback(data.Department)},
		{"Designation", fallback(data.Designation)},
		{"Email", fallback(data.Email)},
		{"Payment Date", fallback(data.PaymentDate)},
		{"Payment Mode", fallback(data.PaymentMode)},
		{"Working Days", fmt.Sprintf("%d", data.WorkingDays)},
		{"Present Days", fmt.Sprintf("%d", data.PresentDays)},
		{"Leave Days", fmt.Sprintf("%d", data.LeaveDays)},
	}

	for i := 0; i < len(rows); i += 2 {
		writePayslipInfoCell(pdf, rows[i][0], rows[i][1], labelW, valueW)
		if i+1 < len(rows) {
			writePayslipInfoCell(pdf, rows[i+1][0], rows[i+1][1], labelW, valueW)
		}
		pdf.Ln(5)
	}
	pdf.Ln(3)
}

func writePayslipInfoCell(pdf *gofpdf.Fpdf, label, value string, labelW, valueW float64) {
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(110, 110, 110)
	pdf.CellFormat(labelW, 5, label, "", 0, "L", false, 0, "")

	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(20, 20, 20)
	pdf.CellFormat(valueW, 5, ascii(value), "", 0, "L", false, 0, "")
}

// ── Section: Earnings + Deductions ────────────────────────────────

func drawPayslipEarningsAndDeductions(pdf *gofpdf.Fpdf, data PayslipData) {
	pageWidth, _ := pdf.GetPageSize()
	left, _, right, _ := pdf.GetMargins()
	usableWidth := pageWidth - left - right

	colGap := 6.0
	colWidth := (usableWidth - colGap) / 2
	p := data.Payroll

	startY := pdf.GetY()

	earnings := []payslipMoneyRow{
		{Label: "Basic Salary", Amount: p.BasicSalary},
		{Label: "HRA", Amount: p.HRA},
		{Label: "DA", Amount: p.DA},
		{Label: "TA", Amount: p.TA},
		{Label: "Medical Allowance", Amount: p.MedicalAllowance},
		{Label: "Other Allowances", Amount: p.OtherAllowances},
	}
	if p.ExtraAllowance > 0 {
		earnings = append(earnings, payslipMoneyRow{Label: "Extra Allowance", Amount: p.ExtraAllowance})
	}

	deductions := []payslipMoneyRow{
		{Label: "Provident Fund (PF)", Amount: p.PF},
		{Label: "ESI", Amount: p.ESI},
		{Label: "TDS", Amount: p.TDS},
		{Label: "Other Deductions", Amount: p.OtherDeductions},
	}
	if p.ExtraDeduction > 0 {
		deductions = append(deductions, payslipMoneyRow{Label: "Extra Deduction", Amount: p.ExtraDeduction})
	}

	drawPayslipMoneyTable(pdf, left, startY, colWidth, "EARNINGS", earnings, "Gross Salary", p.GrossSalary, data.Currency)
	leftEndY := pdf.GetY()

	drawPayslipMoneyTable(pdf, left+colWidth+colGap, startY, colWidth, "DEDUCTIONS", deductions, "Total Deductions", p.TotalDeductions, data.Currency)
	rightEndY := pdf.GetY()

	if leftEndY > rightEndY {
		pdf.SetY(leftEndY)
	} else {
		pdf.SetY(rightEndY)
	}
	pdf.Ln(4)
}

type payslipMoneyRow struct {
	Label  string
	Amount float64
}

func drawPayslipMoneyTable(
	pdf *gofpdf.Fpdf,
	x, y, width float64,
	title string,
	rows []payslipMoneyRow,
	totalLabel string,
	totalAmount float64,
	currency string,
) {
	pdf.SetXY(x, y)

	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetTextColor(60, 60, 60)
	pdf.CellFormat(width, 6, title, "B", 1, "L", false, 0, "")

	labelW := width * 0.6
	amountW := width - labelW

	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(40, 40, 40)
	for _, r := range rows {
		pdf.SetX(x)
		pdf.CellFormat(labelW, 5.5, r.Label, "", 0, "L", false, 0, "")
		pdf.CellFormat(amountW, 5.5, money(r.Amount, currency), "", 1, "R", false, 0, "")
	}

	pdf.SetX(x)
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetFillColor(245, 245, 245)
	pdf.SetTextColor(20, 20, 20)
	pdf.CellFormat(labelW, 6, totalLabel, "T", 0, "L", true, 0, "")
	pdf.CellFormat(amountW, 6, money(totalAmount, currency), "T", 1, "R", true, 0, "")
}

// ── Section: Net pay banner ───────────────────────────────────────

func drawPayslipNetPay(pdf *gofpdf.Fpdf, data PayslipData) {
	pageWidth, _ := pdf.GetPageSize()
	left, _, right, _ := pdf.GetMargins()
	usableWidth := pageWidth - left - right

	pdf.Ln(2)
	pdf.SetFillColor(20, 20, 20)
	pdf.SetTextColor(255, 255, 255)

	pdf.SetX(left)
	pdf.SetFont("Helvetica", "B", 10)
	pdf.CellFormat(usableWidth*0.5, 10, "  NET PAY", "", 0, "L", true, 0, "")
	pdf.SetFont("Helvetica", "B", 14)
	pdf.CellFormat(usableWidth*0.5, 10, money(data.Payroll.NetSalary, data.Currency)+"  ", "", 1, "R", true, 0, "")

	pdf.SetTextColor(20, 20, 20)
}

// ── Section: Footer (notes + disclaimer) ──────────────────────────

func drawPayslipFooter(pdf *gofpdf.Fpdf, data PayslipData) {
	pageWidth, _ := pdf.GetPageSize()
	left, _, right, _ := pdf.GetMargins()
	usableWidth := pageWidth - left - right

	if data.Payroll.Notes != "" {
		pdf.Ln(6)
		pdf.SetFont("Helvetica", "B", 8)
		pdf.SetTextColor(60, 60, 60)
		pdf.CellFormat(usableWidth, 4, "Notes:", "", 1, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 8)
		pdf.SetTextColor(80, 80, 80)
		pdf.MultiCell(usableWidth, 4, ascii(data.Payroll.Notes), "", "L", false)
	}

	pdf.Ln(10)
	pdf.SetFont("Helvetica", "I", 7)
	pdf.SetTextColor(140, 140, 140)
	pdf.CellFormat(usableWidth, 4,
		"This is a computer-generated payslip and does not require a signature.",
		"", 1, "C", false, 0, "")
}
