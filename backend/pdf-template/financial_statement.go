package pdftemplate

// Financial-statement PDFs: profit & loss, balance sheet, and trial balance.
// Each renders the exact figures the GraphQL reporting layer computes, in a
// simple two-column (label / amount) layout.

import (
	"time"

	"collegeerp/graph/model"
)

// BuildPLPDF renders a profit & loss statement.
func BuildPLPDF(institute string, stmt *model.FinancialStatement) ([]byte, error) {
	d := NewDoc()
	statementHeader(d, institute, stmt.Title, periodLabel(stmt))
	for _, sec := range stmt.Sections {
		writeStatementSection(d, sec)
	}
	d.Space(6)
	d.H2("Net Profit: " + rupees(stmt.Total))
	statementFooter(d)
	return d.Bytes()
}

// BuildBalanceSheetPDF renders a balance sheet.
func BuildBalanceSheetPDF(institute string, stmt *model.FinancialStatement) ([]byte, error) {
	d := NewDoc()
	statementHeader(d, institute, stmt.Title, periodLabel(stmt))
	for _, sec := range stmt.Sections {
		writeStatementSection(d, sec)
	}
	d.Space(6)
	if stmt.Balanced {
		d.Body("Assets equal Liabilities + Equity — the sheet balances.")
	} else {
		d.Body("WARNING: the sheet does not balance; review recent postings.")
	}
	statementFooter(d)
	return d.Bytes()
}

// BuildTrialBalancePDF renders a trial balance table.
func BuildTrialBalancePDF(institute, asOf string, rows []*model.TrialBalanceRow) ([]byte, error) {
	d := NewDoc()
	statementHeader(d, institute, "Trial Balance", "As of "+asOf)
	var totDebit, totCredit float64
	for _, r := range rows {
		totDebit += r.Debit
		totCredit += r.Credit
		amount := rupees(r.Debit)
		side := "Dr"
		if r.Credit > 0 {
			amount = rupees(r.Credit)
			side = "Cr"
		}
		d.Body(r.Code + "  " + r.Name + "   " + amount + " " + side)
	}
	d.Space(4)
	d.H3("Total Debit: " + rupees(round2(totDebit)) + "   Total Credit: " + rupees(round2(totCredit)))
	statementFooter(d)
	return d.Bytes()
}

// ─── shared layout ───────────────────────────────────────────────────────────

func statementHeader(d *Doc, institute, title, period string) {
	if institute != "" {
		d.H1(institute)
		d.H2(title)
	} else {
		d.H1(title)
	}
	if period != "" {
		d.Body(period)
	}
	d.Body("Generated: " + time.Now().Format("2006-01-02"))
	d.Space(4)
}

func writeStatementSection(d *Doc, sec *model.StatementSection) {
	d.Space(4)
	d.H2(sec.Title)
	if len(sec.Lines) == 0 {
		d.Muted("No entries.")
	}
	for _, l := range sec.Lines {
		label := l.Name
		if l.Code != "" {
			label = l.Code + "  " + l.Name
		}
		d.Body(label + "   " + rupees(l.Amount))
	}
	d.H3("Total " + sec.Title + ": " + rupees(sec.Total))
}

func statementFooter(d *Doc) {
	d.Space(10)
	d.Italic("This is a computer-generated financial statement.")
}

func periodLabel(stmt *model.FinancialStatement) string {
	if stmt.AsOf != nil && *stmt.AsOf != "" {
		return "As of " + *stmt.AsOf
	}
	if stmt.From != nil && stmt.To != nil {
		return "Period: " + *stmt.From + " to " + *stmt.To
	}
	return ""
}
