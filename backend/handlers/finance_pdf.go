package handlers

// Financial-statement PDF downloads (P&L, balance sheet, trial balance). The
// figures are computed by the exported builders in the graph package so the PDF
// and the GraphQL reports never drift. Admin-gated at the route.

import (
	"collegeerp/database"
	"collegeerp/graph"
	"collegeerp/middleware"
	pdftemplate "collegeerp/pdf-template"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

func todayYMD() string { return time.Now().Format("2006-01-02") }

// DownloadPLPDF streams a profit & loss statement for ?from&to.
func DownloadPLPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	from := c.Query("from")
	to := c.Query("to")
	if from == "" || to == "" {
		return utils.BadRequest(c, "from and to are required (YYYY-MM-DD)")
	}
	stmt, err := graph.ProfitAndLossData(database.DB.WithContext(c.Context()), tenantID, from, to)
	if err != nil {
		return utils.InternalError(c, "Failed to compute the P&L")
	}
	pdfBytes, err := pdftemplate.BuildPLPDF(tenantName(c, tenantID), stmt)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the P&L PDF")
	}
	return streamPDF(c, "profit-and-loss-"+from+"-to-"+to+".pdf", pdfBytes)
}

// DownloadBalanceSheetPDF streams a balance sheet for ?asOf.
func DownloadBalanceSheetPDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	asOf := c.Query("asOf")
	if asOf == "" {
		asOf = todayYMD()
	}
	stmt, err := graph.BalanceSheetData(database.DB.WithContext(c.Context()), tenantID, asOf)
	if err != nil {
		return utils.InternalError(c, "Failed to compute the balance sheet")
	}
	pdfBytes, err := pdftemplate.BuildBalanceSheetPDF(tenantName(c, tenantID), stmt)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the balance sheet PDF")
	}
	return streamPDF(c, "balance-sheet-"+asOf+".pdf", pdfBytes)
}

// DownloadTrialBalancePDF streams a trial balance for ?asOf.
func DownloadTrialBalancePDF(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	asOf := c.Query("asOf")
	if asOf == "" {
		asOf = todayYMD()
	}
	rows, err := graph.TrialBalanceData(database.DB.WithContext(c.Context()), tenantID, asOf)
	if err != nil {
		return utils.InternalError(c, "Failed to compute the trial balance")
	}
	pdfBytes, err := pdftemplate.BuildTrialBalancePDF(tenantName(c, tenantID), asOf, rows)
	if err != nil {
		return utils.InternalError(c, "Failed to generate the trial balance PDF")
	}
	return streamPDF(c, "trial-balance-"+asOf+".pdf", pdfBytes)
}
