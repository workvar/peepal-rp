package pdftemplate

// Discharge summary PDF (healthcare industry, Phase 3): facility header, patient
// identity, admission span, ward/bed, and the clinical summary captured at
// discharge. Built from the GraphQL Admission model.

import (
	"time"

	"collegeerp/graph/model"
)

// BuildDischargeSummaryPDF renders a discharged admission's summary. Sections
// that were left blank are simply omitted.
func BuildDischargeSummaryPDF(facility string, a *model.Admission) ([]byte, error) {
	d := NewDoc()

	if facility != "" {
		d.H1(facility)
		d.H2("Discharge Summary")
	} else {
		d.H1("Discharge Summary")
	}

	d.Body("Patient: " + a.PatientName + " (" + a.PatientMrn + ")")
	if a.ClinicianName != nil && *a.ClinicianName != "" {
		d.Body("Attending: " + *a.ClinicianName)
	}

	d.Space(3)
	d.H3("Admission")
	d.Body("Admitted: " + a.AdmissionDate)
	if a.DischargeDate != nil && *a.DischargeDate != "" {
		d.Body("Discharged: " + *a.DischargeDate)
	}
	if a.WardName != nil && *a.WardName != "" {
		bed := ""
		if a.BedNumber != nil && *a.BedNumber != "" {
			bed = " · Bed " + *a.BedNumber
		}
		d.Body("Ward: " + *a.WardName + bed)
	}
	if a.Reason != nil && *a.Reason != "" {
		d.Body("Reason for admission: " + *a.Reason)
	}

	summarySection(d, "Diagnosis", a.DischargeDiagnosis)
	summarySection(d, "Treatment Given", a.TreatmentGiven)
	summarySection(d, "Condition on Discharge", a.ConditionOnDischarge)
	summarySection(d, "Follow-up Instructions", a.FollowUpInstructions)

	if len(a.Transfers) > 0 {
		d.Space(3)
		d.H3("Transfers")
		for _, t := range a.Transfers {
			from := deref(t.FromBedNumber)
			to := deref(t.ToBedNumber)
			line := deref(t.TransferDate) + ": " + from + " → " + to
			if t.Reason != nil && *t.Reason != "" {
				line += "  (" + *t.Reason + ")"
			}
			d.Body(line)
		}
	}

	d.Space(8)
	d.Italic("This is a computer-generated document. Generated: " +
		time.Now().Format("2006-01-02 15:04"))
	return d.Bytes()
}

// summarySection prints a heading + body only when the value is non-empty.
func summarySection(d *Doc, heading string, value *string) {
	if value == nil || *value == "" {
		return
	}
	d.Space(3)
	d.H3(heading)
	d.Body(*value)
}

func deref(s *string) string {
	if s == nil {
		return "-"
	}
	return *s
}
