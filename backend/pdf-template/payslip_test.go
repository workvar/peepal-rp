package pdftemplate_test

import (
	"testing"

	"collegeerp/models"
	pdftemplate "collegeerp/pdf-template"
)

func TestBuildPayslipPDF_Smoke_NoExtra(t *testing.T) {
	data := pdftemplate.PayslipData{
		TenantName:   "Test College",
		EmployeeName: "Alice Smith",
		EmployeeCode: "EMP001",
		Department:   "Computer Science",
		Designation:  "Lecturer",
		Email:        "alice@test.edu",
		Period:       "April 2026",
		PaymentDate:  "20 April 2026",
		PaymentMode:  "Bank Transfer",
		WorkingDays:  26,
		PresentDays:  26,
		LeaveDays:    0,
		Currency:     "INR",
		Payroll: models.Payroll{
			BasicSalary:      50000,
			HRA:              5000,
			DA:               2000,
			TA:               1000,
			MedicalAllowance: 500,
			OtherAllowances:  1000,
			ExtraAllowance:   0,
			GrossSalary:      59500,
			PF:               1800,
			ESI:              500,
			TDS:              200,
			OtherDeductions:  0,
			ExtraDeduction:   0,
			TotalDeductions:  2500,
			NetSalary:        57000,
		},
	}
	pdf, err := pdftemplate.BuildPayslipPDF(data)
	if err != nil {
		t.Fatalf("BuildPayslipPDF failed: %v", err)
	}
	if len(pdf) == 0 {
		t.Fatal("expected non-empty PDF bytes, got 0")
	}
}

func TestBuildPayslipPDF_Smoke_WithExtra(t *testing.T) {
	data := pdftemplate.PayslipData{
		TenantName:   "Test College",
		EmployeeName: "Bob Jones",
		EmployeeCode: "EMP002",
		Department:   "Mathematics",
		Designation:  "Professor",
		Email:        "bob@test.edu",
		Period:       "April 2026",
		PaymentDate:  "20 April 2026",
		PaymentMode:  "NEFT",
		WorkingDays:  26,
		PresentDays:  24,
		LeaveDays:    2,
		Currency:     "INR",
		Payroll: models.Payroll{
			BasicSalary:     80000,
			HRA:             8000,
			DA:              3000,
			OtherAllowances: 2000,
			ExtraAllowance:  5000,
			GrossSalary:     98000,
			PF:              3000,
			OtherDeductions: 500,
			ExtraDeduction:  1000,
			TotalDeductions: 4500,
			NetSalary:       93500,
		},
	}
	pdf, err := pdftemplate.BuildPayslipPDF(data)
	if err != nil {
		t.Fatalf("BuildPayslipPDF with extras failed: %v", err)
	}
	if len(pdf) == 0 {
		t.Fatal("expected non-empty PDF bytes, got 0")
	}
}
