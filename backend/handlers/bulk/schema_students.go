package bulk

import (
	"collegeerp/database"
	"collegeerp/models"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Each row creates a student together with their login account in one step —
// there is no separate "user" to link to. Email may be left blank when the
// tenant signs students in by Roll Number; password may be left blank to send
// the student an invite to choose their own.
var studentsSchema = &Schema{
	Resource:    "students",
	Title:       "Students",
	Description: "Enroll students in bulk. Each row creates the student and their login account together. Leave email blank when your organisation signs students in by Roll Number; leave password blank to e-mail them a setup invite (set send_invite to true).",
	RequireRole: []string{"admin"},
	Fields: []Field{
		{
			Name: "name", Label: "Full Name", Type: FieldString, Required: true,
			Description: "Student's full name, used on their login account.",
			Example:     "Arjun Patel",
		},
		{
			Name: "email", Label: "Email", Type: FieldEmail,
			Description: "Login email. Leave blank for ID-based (Roll Number) tenants. Must be unique within the organisation when set.",
			Example:     "arjun.patel@college.edu",
		},
		{
			Name: "password", Label: "Initial Password", Type: FieldString,
			Description: "Initial password. Leave blank to create an inactive account the student activates via an invite link.",
			Example:     "Welcome@123",
		},
		{
			Name: "send_invite", Label: "Send Invite", Type: FieldBool,
			Description: "When true, e-mail the student a password-setup link (requires an email and a mail-enabled organisation). Defaults to false.",
			Example:     "false",
		},
		{
			Name:        "course_id",
			Label:       "Course",
			Type:        FieldString,
			Description: "Course code, name, or UUID. Optional. The row is rejected if a course is given but does not exist.",
			Example:     "BTCSE",
		},
		{
			Name: "roll_number", Label: "Roll Number", Type: FieldString, Required: true,
			Description: "Unique roll number for the student.",
			Example:     "CS2024001",
		},
		{
			Name:    "section",
			Label:   "Section",
			Type:    FieldString,
			Example: "A",
		},
		{
			Name:        "semester",
			Label:       "Semester",
			Type:        FieldInt,
			Description: "Semester number (1-12).",
			Example:     "1",
		},
		{
			Name:    "phone",
			Label:   "Phone",
			Type:    FieldString,
			Example: "+91-9876543210",
		},
		{
			Name:        "enroll_date",
			Label:       "Enroll Date",
			Type:        FieldDate,
			Description: "Date of admission, YYYY-MM-DD.",
			Example:     "2024-07-15",
		},
		{
			Name:    "batch",
			Label:   "Batch",
			Type:    FieldString,
			Example: "2024-2028",
		},
		{
			Name:          "gender",
			Label:         "Gender",
			Type:          FieldEnum,
			AllowedValues: []string{"M", "F", "Other"},
		},
		{
			Name:        "date_of_birth",
			Label:       "Date of Birth",
			Type:        FieldString,
			Description: "Free-form string (kept as entered).",
		},
		{
			Name:  "father_name",
			Label: "Father's Name",
			Type:  FieldString,
		},
		{
			Name:  "mother_name",
			Label: "Mother's Name",
			Type:  FieldString,
		},
	},
	Create: createStudentRow,
}

func createStudentRow(ctx Ctx, row map[string]string) (string, error) {
	if ctx.ActorRole != string(models.RoleAdmin) {
		return "", errors.New("admin role required")
	}

	// Resolve course: accept UUID, course code, or course name. Course is
	// optional, but a given-yet-unknown course fails the row rather than being
	// stored as a dangling reference (there are no DB foreign-key constraints).
	courseID, err := resolveCourseID(ctx.TenantID, row["course_id"])
	if err != nil {
		return "", err
	}

	enrollDate := time.Now()
	if d := ParseDate(row["enroll_date"]); !d.IsZero() {
		enrollDate = d
	}

	semester := ParseInt(row["semester"])
	if semester == 0 {
		semester = 1
	}

	s := models.Student{
		TenantID:        ctx.TenantID,
		CourseID:        courseID,
		RollNumber:      strings.TrimSpace(row["roll_number"]),
		Section:         strings.TrimSpace(row["section"]),
		Semester:        semester,
		Phone:           strings.TrimSpace(row["phone"]),
		EnrollDate:      enrollDate,
		DateOfBirth:     strings.TrimSpace(row["date_of_birth"]),
		Gender:          strings.TrimSpace(row["gender"]),
		Batch:           strings.TrimSpace(row["batch"]),
		FatherName:      strings.TrimSpace(row["father_name"]),
		MotherName:      strings.TrimSpace(row["mother_name"]),
		AdmissionStatus: "active",
	}

	// Create the login account and the student profile atomically.
	var userID string
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		uid, err := createBulkAccount(tx, ctx.TenantID, row["name"], row["email"], row["password"], models.RoleStudent, nil)
		if err != nil {
			return err
		}
		userID = uid
		s.UserID = uid
		if err := tx.Create(&s).Error; err != nil {
			return errors.New("could not create student — roll number may already exist")
		}
		return nil
	}); err != nil {
		return "", err
	}

	sendBulkInvite(ctx.TenantID, userID, ParseBool(row["send_invite"]))
	return s.ID, nil
}

func init() { Register(studentsSchema) }
