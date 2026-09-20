package handlers

import (
	"bufio"
	"encoding/csv"
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ListCourses returns all courses for the authenticated tenant.
func ListCourses(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var courses []models.Course
	database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Find(&courses)
	return utils.OK(c, courses, "")
}

// CreateCourse creates a new course for the authenticated tenant.
func CreateCourse(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var course models.Course
	if err := c.BodyParser(&course); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if course.Name == "" || course.Code == "" {
		return utils.BadRequest(c, "Course name and code are required")
	}
	course.TenantID = tenantID
	if err := database.DB.WithContext(c.Context()).Create(&course).Error; err != nil {
		return utils.BadRequest(c, "Course code already exists")
	}
	return utils.Created(c, course, "Course created")
}

// ListStudents returns all students for the authenticated tenant.
func ListStudents(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	courseID := c.Query("course_id")
	semester := c.QueryInt("semester", 0)

	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).Preload("User").Preload("Course")
	if courseID != "" {
		query = query.Where("course_id = ?", courseID)
	}
	if semester > 0 {
		query = query.Where("semester = ?", semester)
	}

	var students []models.Student
	query.Find(&students)
	return utils.OK(c, students, "")
}

// GetStudent returns a single student for the authenticated tenant.
func GetStudent(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var student models.Student
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).
		Preload("User").Preload("Course").First(&student).Error; err != nil {
		return utils.NotFound(c, "Student not found")
	}
	return utils.OK(c, student, "")
}

// GetMyStudentProfile returns the authenticated student's own profile with stats.
func GetMyStudentProfile(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	userID := c.Locals("userID").(string)

	var student models.Student
	if err := database.DB.WithContext(c.Context()).Where("user_id = ? AND tenant_id = ?", userID, tenantID).
		Preload("User").Preload("Course").First(&student).Error; err != nil {
		return utils.NotFound(c, "Student profile not found")
	}

	// Attendance stats
	var totalAtt, presentAtt int64
	database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
		Where("entity_id = ? AND entity_type = 'student' AND tenant_id = ?", student.ID, tenantID).
		Count(&totalAtt)
	database.DB.WithContext(c.Context()).Model(&models.Attendance{}).
		Where("entity_id = ? AND entity_type = 'student' AND status = 'present' AND tenant_id = ?", student.ID, tenantID).
		Count(&presentAtt)

	attendancePct := 0.0
	if totalAtt > 0 {
		attendancePct = float64(presentAtt) / float64(totalAtt) * 100
	}

	// Recent marks
	var marks []models.Mark
	database.DB.WithContext(c.Context()).Where("student_id = ? AND tenant_id = ?", student.ID, tenantID).
		Order("created_at desc").Limit(20).Find(&marks)

	return utils.OK(c, fiber.Map{
		"student":              student,
		"attendance_total":     totalAtt,
		"attendance_present":   presentAtt,
		"attendance_pct":       attendancePct,
		"recent_marks":         marks,
	}, "")
}

type CreateStudentRequest struct {
	UserID          string `json:"user_id"`
	CourseID        string `json:"course_id"`
	RollNumber      string `json:"roll_number"`
	Section         string `json:"section"`
	Semester        int    `json:"semester"`
	Phone           string `json:"phone"`
	EnrollDate      string `json:"enroll_date"`
	// Extended fields
	DateOfBirth     string `json:"date_of_birth"`
	Gender          string `json:"gender"`
	BloodGroup      string `json:"blood_group"`
	PhotoURL        string `json:"photo_url"`
	Address         string `json:"address"`
	City            string `json:"city"`
	State           string `json:"state"`
	Pincode         string `json:"pincode"`
	Nationality     string `json:"nationality"`
	EmergencyName   string `json:"emergency_name"`
	EmergencyPhone  string `json:"emergency_phone"`
	FatherName      string `json:"father_name"`
	FatherPhone     string `json:"father_phone"`
	MotherName      string `json:"mother_name"`
	MotherPhone     string `json:"mother_phone"`
	AdmissionStatus string `json:"admission_status"`
	Batch           string `json:"batch"`
}

// CreateStudent registers a user as a student for the authenticated tenant.
func CreateStudent(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	var req CreateStudentRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}
	if req.UserID == "" || req.RollNumber == "" {
		return utils.BadRequest(c, "user_id and roll_number are required")
	}

	enrollDate, _ := time.Parse("2006-01-02", req.EnrollDate)
	status := req.AdmissionStatus
	if status == "" {
		status = "active"
	}

	student := models.Student{
		TenantID:        tenantID,
		UserID:          req.UserID,
		CourseID:        req.CourseID,
		RollNumber:      req.RollNumber,
		Section:         req.Section,
		Semester:        req.Semester,
		Phone:           req.Phone,
		EnrollDate:      enrollDate,
		DateOfBirth:     req.DateOfBirth,
		Gender:          req.Gender,
		BloodGroup:      req.BloodGroup,
		PhotoURL:        req.PhotoURL,
		Address:         req.Address,
		City:            req.City,
		State:           req.State,
		Pincode:         req.Pincode,
		Nationality:     req.Nationality,
		EmergencyName:   req.EmergencyName,
		EmergencyPhone:  req.EmergencyPhone,
		FatherName:      req.FatherName,
		FatherPhone:     req.FatherPhone,
		MotherName:      req.MotherName,
		MotherPhone:     req.MotherPhone,
		AdmissionStatus: status,
		Batch:           req.Batch,
	}

	if err := database.DB.WithContext(c.Context()).Create(&student).Error; err != nil {
		return utils.BadRequest(c, "Could not create student — roll number may already exist")
	}

	database.DB.WithContext(c.Context()).Preload("User").Preload("Course").First(&student, "id = ?", student.ID)
	return utils.Created(c, student, "Student created")
}

// UpdateStudent updates student details for the authenticated tenant.
func UpdateStudent(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	var student models.Student
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&student).Error; err != nil {
		return utils.NotFound(c, "Student not found")
	}

	var req CreateStudentRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Section != "" {
		student.Section = req.Section
	}
	if req.Phone != "" {
		student.Phone = req.Phone
	}
	if req.CourseID != "" {
		student.CourseID = req.CourseID
	}
	if req.Semester > 0 {
		student.Semester = req.Semester
	}
	if req.DateOfBirth != "" {
		student.DateOfBirth = req.DateOfBirth
	}
	if req.Gender != "" {
		student.Gender = req.Gender
	}
	if req.BloodGroup != "" {
		student.BloodGroup = req.BloodGroup
	}
	if req.PhotoURL != "" {
		student.PhotoURL = req.PhotoURL
	}
	if req.Address != "" {
		student.Address = req.Address
	}
	if req.City != "" {
		student.City = req.City
	}
	if req.State != "" {
		student.State = req.State
	}
	if req.Pincode != "" {
		student.Pincode = req.Pincode
	}
	if req.Nationality != "" {
		student.Nationality = req.Nationality
	}
	if req.EmergencyName != "" {
		student.EmergencyName = req.EmergencyName
	}
	if req.EmergencyPhone != "" {
		student.EmergencyPhone = req.EmergencyPhone
	}
	if req.FatherName != "" {
		student.FatherName = req.FatherName
	}
	if req.FatherPhone != "" {
		student.FatherPhone = req.FatherPhone
	}
	if req.MotherName != "" {
		student.MotherName = req.MotherName
	}
	if req.MotherPhone != "" {
		student.MotherPhone = req.MotherPhone
	}
	if req.AdmissionStatus != "" {
		student.AdmissionStatus = req.AdmissionStatus
	}
	if req.Batch != "" {
		student.Batch = req.Batch
	}
	student.UpdatedAt = time.Now()

	if err := database.DB.WithContext(c.Context()).Save(&student).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}
	database.DB.WithContext(c.Context()).Preload("User").Preload("Course").First(&student, "id = ?", student.ID)
	return utils.OK(c, student, "Student updated")
}

// DeleteStudent removes a student record for the authenticated tenant.
func DeleteStudent(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.Student{}).Error; err != nil {
		return utils.NotFound(c, "Student not found")
	}
	return utils.OK(c, nil, "Student deleted")
}

// BulkImportStudents imports students from a CSV body.
// CSV format: user_id,course_id,roll_number,section,semester,batch,enroll_date
func BulkImportStudents(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	body := string(c.Body())
	if body == "" {
		return utils.BadRequest(c, "CSV body is required")
	}

	reader := csv.NewReader(bufio.NewReader(strings.NewReader(body)))
	records, err := reader.ReadAll()
	if err != nil {
		return utils.BadRequest(c, "Invalid CSV format")
	}

	if len(records) < 2 {
		return utils.BadRequest(c, "CSV must have header row and at least one data row")
	}

	var created, skipped int
	for _, row := range records[1:] { // skip header
		if len(row) < 3 {
			skipped++
			continue
		}
		userID := strings.TrimSpace(row[0])
		courseID := ""
		rollNum := strings.TrimSpace(row[2])
		if len(row) > 1 {
			courseID = strings.TrimSpace(row[1])
		}
		if userID == "" || rollNum == "" {
			skipped++
			continue
		}

		section := ""
		semester := 1
		batch := ""
		enrollDate := time.Now()
		if len(row) > 3 {
			section = strings.TrimSpace(row[3])
		}
		if len(row) > 4 {
			var s int
			if _, err := fmt.Sscanf(strings.TrimSpace(row[4]), "%d", &s); err == nil && s > 0 {
				semester = s
			}
		}
		if len(row) > 5 {
			batch = strings.TrimSpace(row[5])
		}
		if len(row) > 6 {
			if d, err := time.Parse("2006-01-02", strings.TrimSpace(row[6])); err == nil {
				enrollDate = d
			}
		}

		student := models.Student{
			TenantID:        tenantID,
			UserID:          userID,
			CourseID:        courseID,
			RollNumber:      rollNum,
			Section:         section,
			Semester:        semester,
			Batch:           batch,
			EnrollDate:      enrollDate,
			AdmissionStatus: "active",
		}
		if err := database.DB.WithContext(c.Context()).Create(&student).Error; err != nil {
			skipped++
		} else {
			created++
		}
	}

	return utils.OK(c, fiber.Map{
		"created": created,
		"skipped": skipped,
		"total":   created + skipped,
	}, "Bulk import complete")
}
