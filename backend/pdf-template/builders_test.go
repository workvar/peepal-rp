package pdftemplate_test

import (
	"testing"

	"collegeerp/graph/model"
	pdftemplate "collegeerp/pdf-template"
)

func strptr(s string) *string { return &s }

func TestBuildFeeReceiptPDF_Smoke(t *testing.T) {
	meta := pdftemplate.FeeMeta{Institute: "Green Valley", StudentName: "Alice", RollNumber: "R1", CourseName: "BSc"}
	p := &model.FeePayment{
		ReceiptNumber:  "RCP-20260101-0001",
		PaymentDate:    "2026-01-01",
		Amount:         12500,
		PaymentMode:    "upi",
		Status:         "paid",
		TransactionRef: strptr("TXN123"),
		StudentFee:     &model.StudentFee{FeeAllocation: &model.FeeAllocation{Name: "Tuition"}},
	}
	pdf, err := pdftemplate.BuildFeeReceiptPDF(meta, p, "Semester 1")
	if err != nil || len(pdf) == 0 {
		t.Fatalf("receipt build failed: err=%v len=%d", err, len(pdf))
	}
}

func TestBuildAllReceiptsPDF_Smoke(t *testing.T) {
	meta := pdftemplate.FeeMeta{StudentName: "Bob", RollNumber: "R2", CourseName: "BCom"}
	payments := []*model.FeePayment{
		{ReceiptNumber: "RCP-1", PaymentDate: "2026-01-01", Amount: 1000, PaymentMode: "cash", Status: "paid"},
		{ReceiptNumber: "RCP-2", PaymentDate: "2026-02-01", Amount: 2000, PaymentMode: "neft", Status: "cancelled"},
	}
	pdf, err := pdftemplate.BuildAllReceiptsPDF(meta, payments, nil)
	if err != nil || len(pdf) == 0 {
		t.Fatalf("all-receipts build failed: err=%v len=%d", err, len(pdf))
	}
}

func TestBuildFeeSchedulePDF_Smoke(t *testing.T) {
	meta := pdftemplate.FeeMeta{Institute: "Green Valley", StudentName: "Cara", RollNumber: "R3", CourseName: "BA"}
	fees := []*model.StudentFee{
		{
			Status:     "partial",
			NetAmount:  50000,
			PaidAmount: 20000,
			FeeAllocation: &model.FeeAllocation{Name: "Tuition"},
			Installments: []*model.StudentFeeInstallment{
				{Sequence: 1, Label: "Sem 1", DueDate: strptr("2026-01-01"), Amount: 25000, PaidAmount: 20000, Status: "partial", IsOverdue: true},
				{Sequence: 2, Label: "Sem 2", Amount: 25000, Status: "pending"},
			},
		},
	}
	pdf, err := pdftemplate.BuildFeeSchedulePDF(meta, fees)
	if err != nil || len(pdf) == 0 {
		t.Fatalf("schedule build failed: err=%v len=%d", err, len(pdf))
	}
}

func TestBuildGradeReportPDF_Smoke(t *testing.T) {
	r := &model.AcademicResult{
		StudentName: "Dana", RollNumber: "R4", CourseName: "BTech",
		Mode: "cgpa", GpaMax: 10, Cgpa: 8.5, Percentage: 82, TotalCredits: 20, IsPass: true,
		GeneratedAt: "2026-06-21T10:00:00Z",
		Semesters: []*model.SemesterResult{
			{
				Semester: 1, Sgpa: 8.5, Percentage: 82, TotalCredits: 20, IsPass: true,
				Subjects: []*model.SubjectResult{
					{Subject: "Maths", MarksObtained: 82, MaxMarks: 100, Percentage: 82, Letter: "A+", GradePoint: 9, IsPass: true},
				},
			},
		},
	}
	pdf, err := pdftemplate.BuildGradeReportPDF(r)
	if err != nil || len(pdf) == 0 {
		t.Fatalf("grade build failed: err=%v len=%d", err, len(pdf))
	}
}
