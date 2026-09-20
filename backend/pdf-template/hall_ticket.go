package pdftemplate

// Hall ticket (admit card) PDF. Carries the verification QR from Phase 1 in
// the top-right: scanning it hits /verify with a signed tenant|kind|id triple,
// which is how an invigilator confirms the card is genuine and, later, marks
// exam attendance.

import (
	"strings"

	"collegeerp/graph/model"
	"collegeerp/qrcode"
)

// BuildHallTicketPDF renders one admit card. tenantID is used only to build
// the QR payload; institute is the printed letterhead.
func BuildHallTicketPDF(institute, tenantID string, t *model.HallTicket) ([]byte, error) {
	d := NewDoc()

	// The signed payload is computed here rather than trusting the caller, so
	// a PDF can never carry a signature the server did not produce.
	if tenantID != "" && t.ID != "" {
		d.QRTopRight(qrcode.VerifyURL("", tenantID, qrcode.KindHallTicket, t.ID), 24)
	}

	if institute != "" {
		d.H1(institute)
		d.H2("Hall Ticket")
	} else {
		d.H1("Hall Ticket")
	}
	d.Body("Ticket No: " + t.TicketNumber)
	d.Divider()

	writeCandidate(d, t)
	writeExam(d, t)
	writeSeating(d, t)

	// A held or revoked card must say so loudly — this is the line an
	// invigilator reads before letting a student sit.
	if !t.Eligible || !strings.EqualFold(t.Status, "issued") {
		d.Space(4)
		d.H3("NOT VALID FOR ENTRY")
		if t.HoldReason != nil && *t.HoldReason != "" {
			d.Muted("Reason: " + *t.HoldReason)
		}
	}

	d.Space(8)
	d.Muted("Candidate's Signature: ______________________")
	d.Space(2)
	d.Muted("Invigilator's Signature: _____________________")
	d.Space(4)
	d.Italic("Carry this hall ticket and a photo ID to every examination session.")

	return d.Bytes()
}

// writeCandidate prints the student identity block.
func writeCandidate(d *Doc, t *model.HallTicket) {
	d.H3("Candidate")
	if t.Student == nil {
		d.Muted("Student details unavailable.")
		return
	}
	name := "-"
	if t.Student.User != nil && t.Student.User.Name != "" {
		name = t.Student.User.Name
	}
	d.Body("Name: " + name)
	d.Body("Roll No: " + orDefault(t.Student.RollNumber, "-"))
	if t.Student.Course != nil {
		d.Body("Course: " + t.Student.Course.Name)
	}
	if t.Student.Semester != nil {
		d.Body("Semester: " + num(float64(*t.Student.Semester)))
	}
	if t.Student.Section != nil && *t.Student.Section != "" {
		d.Body("Section: " + *t.Student.Section)
	}
}

// writeExam prints what the candidate is sitting and when.
func writeExam(d *Doc, t *model.HallTicket) {
	d.Space(3)
	d.H3("Examination")
	if t.ExamSchedule == nil {
		d.Muted("Exam schedule unavailable.")
		return
	}
	d.Body("Exam: " + t.ExamSchedule.Name)
	d.Body("Type: " + t.ExamSchedule.ExamType)
	if dates := examDates(t.ExamSchedule); dates != "" {
		d.Body("Dates: " + dates)
	}
	if t.ExamSchedule.Instructions != nil && strings.TrimSpace(*t.ExamSchedule.Instructions) != "" {
		d.Space(2)
		d.Muted(*t.ExamSchedule.Instructions)
	}
}

// writeSeating prints centre and seat allotment.
func writeSeating(d *Doc, t *model.HallTicket) {
	d.Space(3)
	d.H3("Reporting")
	center := "-"
	if t.ExamCenter != nil && *t.ExamCenter != "" {
		center = *t.ExamCenter
	}
	seat := "-"
	if t.SeatNumber != nil && *t.SeatNumber != "" {
		seat = *t.SeatNumber
	}
	d.Body("Centre: " + center)
	d.Body("Seat No: " + seat)
	if t.IssuedOn != nil && *t.IssuedOn != "" {
		d.Muted("Issued on " + *t.IssuedOn)
	}
}

// examDates renders the schedule window, collapsing a single-day exam to one
// date instead of "X to X".
func examDates(s *model.ExamSchedule) string {
	start, end := "", ""
	if s.StartDate != nil {
		start = *s.StartDate
	}
	if s.EndDate != nil {
		end = *s.EndDate
	}
	switch {
	case start == "" && end == "":
		return ""
	case end == "" || start == end:
		return start
	case start == "":
		return end
	default:
		return start + " to " + end
	}
}
