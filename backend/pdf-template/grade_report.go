package pdftemplate

// Student grade report PDF: semester-wise subject results plus the cumulative
// SGPA/CGPA summary. Built from the computed AcademicResult so the transcript
// matches exactly what the portal shows on screen.

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"collegeerp/graph/model"
)

// gpaModes are the grading modes that expose grade points (SGPA/CGPA). Other
// modes (percentage / letter / pass_fail) hide those columns.
var gpaModes = map[string]bool{"cgpa": true, "gpa": true}

// BuildGradeReportPDF renders a full academic transcript for one student.
func BuildGradeReportPDF(r *model.AcademicResult) ([]byte, error) {
	d := NewDoc()
	isGpa := gpaModes[r.Mode]

	d.H1(orDefault(r.StudentName, "Student") + " - Grade Report")
	d.Body("Roll No: " + orDefault(r.RollNumber, "-") + "     Course: " + orDefault(r.CourseName, "-"))
	d.Italic("Generated " + readableTime(r.GeneratedAt))
	d.Space(6)

	for _, sem := range r.Semesters {
		d.H2(fmt.Sprintf("Semester %d", sem.Semester))
		for _, s := range sem.Subjects {
			gp := ""
			if isGpa {
				gp = "  GP " + num(s.GradePoint)
			}
			d.Body(fmt.Sprintf(
				"%s  -  %s/%s (%s%%)  %s%s  %s",
				s.Subject, num(s.MarksObtained), num(s.MaxMarks), num(s.Percentage),
				s.Letter, gp, passLabel(s.IsPass),
			))
		}
		d.H3(semesterSummary(r, sem, isGpa))
		d.Space(4)
	}

	d.Space(2)
	d.H2("Cumulative Result")
	d.H3(overallSummary(r, isGpa))

	return d.Bytes()
}

func semesterSummary(r *model.AcademicResult, sem *model.SemesterResult, isGpa bool) string {
	var parts []string
	if isGpa {
		parts = append(parts, fmt.Sprintf("SGPA %.2f/%s", sem.Sgpa, num(r.GpaMax)))
	}
	parts = append(parts, num(sem.Percentage)+"%")
	parts = append(parts, fmt.Sprintf("Credits %d", sem.TotalCredits))
	parts = append(parts, upperPass(sem.IsPass))
	return strings.Join(parts, "   |   ")
}

func overallSummary(r *model.AcademicResult, isGpa bool) string {
	var parts []string
	if isGpa {
		parts = append(parts, fmt.Sprintf("CGPA %.2f/%s", r.Cgpa, num(r.GpaMax)))
	}
	parts = append(parts, "Overall "+num(r.Percentage)+"%")
	parts = append(parts, fmt.Sprintf("Total credits %d", r.TotalCredits))
	parts = append(parts, upperPass(r.IsPass))
	return strings.Join(parts, "   |   ")
}

func passLabel(pass bool) string {
	if pass {
		return "Pass"
	}
	return "Fail"
}

func upperPass(pass bool) string {
	if pass {
		return "PASS"
	}
	return "FAIL"
}

func orDefault(s, def string) string {
	if s == "" {
		return def
	}
	return s
}

// num formats a float without trailing zeros (e.g. 75 -> "75", 75.5 -> "75.5").
func num(f float64) string {
	return strconv.FormatFloat(f, 'f', -1, 64)
}

// readableTime parses an RFC3339 timestamp into a friendly form, falling back
// to the raw string if it does not parse.
func readableTime(s string) string {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.Format("02 Jan 2006, 15:04")
	}
	return s
}
