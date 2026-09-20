package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strings"
)

var marksSchema = &Schema{
	Resource:    "marks",
	Title:       "Marks",
	Description: "Record marks for many students at once. Grades are calculated automatically from the percentage (O >=90, A+ >=80, A >=70, B+ >=60, B >=50, C >=40, else F).",
	RequireRole: []string{"admin", "teacher"},
	Fields: []Field{
		{
			Name: "student_id", Label: "Student ID", Type: FieldString, Required: true,
			Description: "Student UUID or roll number. In the review table this becomes a searchable dropdown — pick a student by name or roll number and the UUID is filled in automatically. If you paste a CSV, you may also enter the roll number directly. The row is rejected if no such student exists.",
			Example:     "<student-uuid>",
		},
		{
			Name: "subject", Label: "Subject", Type: FieldString, Required: true,
			Description: "Subject or paper name.",
			Example:     "Data Structures",
		},
		{
			Name: "subject_id", Label: "Subject ID", Type: FieldString,
			Description: "Optional UUID or code of the subject record if already defined. The row is rejected if a subject is given but does not exist.",
		},
		{
			Name: "exam_type", Label: "Exam Type", Type: FieldEnum, Required: true,
			AllowedValues: []string{"internal", "mid_sem", "end_sem", "midterm", "final", "assignment"},
			Description:   "What kind of assessment this mark comes from.",
			Example:       "mid_sem",
		},
		{
			Name: "semester", Label: "Semester", Type: FieldInt, Required: true,
			Example: "3",
		},
		{
			Name: "marks_obtained", Label: "Marks Obtained", Type: FieldFloat, Required: true,
			Example: "78",
		},
		{
			Name: "max_marks", Label: "Max Marks", Type: FieldFloat, Required: true,
			Example: "100",
		},
	},
	Create: createMarkRow,
}

// calcGrade mirrors the logic the marks module already uses.
func calcGrade(obtained, max float64) string {
	if max <= 0 {
		return "N/A"
	}
	pct := (obtained / max) * 100
	switch {
	case pct >= 90:
		return "O"
	case pct >= 80:
		return "A+"
	case pct >= 70:
		return "A"
	case pct >= 60:
		return "B+"
	case pct >= 50:
		return "B"
	case pct >= 40:
		return "C"
	default:
		return "F"
	}
}

func createMarkRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) && ctx.ActorRole != string(models.RoleTeacher) {
		return "", errors.New("admin or teacher role required")
	}

	obtained := ParseFloat(row["marks_obtained"])
	max := ParseFloat(row["max_marks"])
	if max <= 0 {
		return "", errors.New("max_marks must be greater than 0")
	}
	if obtained < 0 || obtained > max {
		return "", errors.New("marks_obtained must be between 0 and max_marks")
	}

	// Reject the row when the student (or an optionally named subject) does not
	// exist — there are no DB foreign-key constraints, so a bad id would persist
	// as an orphan mark. student_id accepts a UUID or roll number.
	studentID, err := resolveStudentID(ctx.TenantID, row["student_id"])
	if err != nil {
		return "", err
	}
	subjectID, err := resolveSubjectID(ctx.TenantID, row["subject_id"])
	if err != nil {
		return "", err
	}

	m := models.Mark{
		TenantID:       ctx.TenantID,
		StudentID:      studentID,
		Subject:        strings.TrimSpace(row["subject"]),
		SubjectID:      subjectID,
		ExamType:       strings.ToLower(strings.TrimSpace(row["exam_type"])),
		AssessmentType: strings.ToLower(strings.TrimSpace(row["exam_type"])),
		Semester:       ParseInt(row["semester"]),
		MarksObtained:  obtained,
		MaxMarks:       max,
		Grade:          calcGrade(obtained, max),
		EnteredBy:      ctx.ActorID,
		Status:         "submitted",
	}
	if err := database.DB.Create(&m).Error; err != nil {
		return "", err
	}
	return m.ID, nil
}

func init() { Register(marksSchema) }
