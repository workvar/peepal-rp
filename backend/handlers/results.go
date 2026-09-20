package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

type PublishResultsRequest struct {
	ExamType   string `json:"exam_type"`   // Optional: filter by exam type
	Subject    string `json:"subject"`     // Optional: filter by subject
	CourseID   string `json:"course_id"`   // Optional: filter by course
	Semester   int    `json:"semester"`    // Optional: filter by semester
}

// PublishResults publishes marks for a given exam/subject/course combination
func PublishResults(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req PublishResultsRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	// Build query for marks to publish
	query := database.DB.WithContext(c.Context()).Where("tenant_id = ? AND is_published = false", tenantID)

	if req.ExamType != "" {
		query = query.Where("exam_type = ?", req.ExamType)
	}
	if req.Subject != "" {
		query = query.Where("subject = ?", req.Subject)
	}
	if req.Semester > 0 {
		query = query.Where("semester = ?", req.Semester)
	}

	// If CourseID is provided, join with students
	if req.CourseID != "" {
		query = query.Joins("JOIN students ON marks.student_id = students.id").
			Where("students.course_id = ? AND students.tenant_id = ?", req.CourseID, tenantID)
	}

	now := time.Now()
	result := query.Model(&models.Mark{}).
		Updates(map[string]interface{}{
			"is_published": true,
			"published_at": now,
		})

	if result.Error != nil {
		return utils.InternalError(c, "Could not publish results")
	}

	return utils.OK(c, map[string]interface{}{
		"published_count": result.RowsAffected,
		"published_at":    now,
	}, "Results published successfully")
}

type PublishedResultsResponse struct {
	StudentID    string  `json:"student_id"`
	StudentName  string  `json:"student_name"`
	RollNumber   string  `json:"roll_number"`
	MarksObtained float64 `json:"marks_obtained"`
	MaxMarks     float64 `json:"max_marks"`
	Grade        string  `json:"grade"`
	Subject      string  `json:"subject"`
	ExamType     string  `json:"exam_type"`
}

// GetPublishedResults returns published marks for a course+subject combo
func GetPublishedResults(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	courseID := c.Query("course_id")
	subject := c.Query("subject")
	examType := c.Query("exam_type")

	if courseID == "" || subject == "" {
		return utils.BadRequest(c, "course_id and subject are required")
	}

	var marks []models.Mark
	query := database.DB.WithContext(c.Context()).
		Joins("JOIN students ON marks.student_id = students.id").
		Joins("JOIN users ON students.user_id = users.id").
		Where("marks.tenant_id = ? AND marks.is_published = true AND marks.subject = ?", tenantID, subject).
		Where("students.course_id = ? AND students.tenant_id = ?", courseID, tenantID).
		Select("marks.*, students.roll_number, users.name as student_name").
		Preload("Student").
		Preload("Student.User")

	if examType != "" {
		query = query.Where("marks.exam_type = ?", examType)
	}

	query.Order("students.roll_number asc").Find(&marks)

	// Transform to response format
	var results []PublishedResultsResponse
	for _, mark := range marks {
		results = append(results, PublishedResultsResponse{
			StudentID:     mark.StudentID,
			StudentName:   mark.Student.User.Name,
			RollNumber:    mark.Student.RollNumber,
			MarksObtained: mark.MarksObtained,
			MaxMarks:      mark.MaxMarks,
			Grade:         mark.Grade,
			Subject:       mark.Subject,
			ExamType:      mark.ExamType,
		})
	}

	return utils.OK(c, results, "")
}

type ResultSummaryResponse struct {
	CourseID       string  `json:"course_id"`
	CourseName     string  `json:"course_name"`
	Subject        string  `json:"subject"`
	ExamType       string  `json:"exam_type"`
	Semester       int     `json:"semester"`
	TotalStudents  int     `json:"total_students"`
	PassCount      int     `json:"pass_count"`
	FailCount      int     `json:"fail_count"`
	PassPercentage float64 `json:"pass_percentage"`
	AverageMarks   float64 `json:"average_marks"`
	HighestMarks   float64 `json:"highest_marks"`
	LowestMarks    float64 `json:"lowest_marks"`
	TopperName     string  `json:"topper_name"`
}

// GetResultSummary returns class-wise result summary
func GetResultSummary(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	courseID := c.Query("course_id")
	subject := c.Query("subject")
	examType := c.Query("exam_type")

	if courseID == "" {
		return utils.BadRequest(c, "course_id is required")
	}

	var marks []models.Mark
	query := database.DB.WithContext(c.Context()).
		Joins("JOIN students ON marks.student_id = students.id").
		Joins("JOIN courses ON students.course_id = courses.id").
		Joins("JOIN users ON students.user_id = users.id").
		Where("marks.tenant_id = ? AND marks.is_published = true", tenantID).
		Where("students.course_id = ? AND students.tenant_id = ?", courseID, tenantID).
		Preload("Student").
		Preload("Student.User").
		Preload("Student.Course")

	if subject != "" {
		query = query.Where("marks.subject = ?", subject)
	}
	if examType != "" {
		query = query.Where("marks.exam_type = ?", examType)
	}

	query.Find(&marks)

	if len(marks) == 0 {
		return utils.OK(c, []interface{}{}, "No published results found")
	}

	// Group by subject and exam_type
	summaryMap := make(map[string]*ResultSummaryResponse)

	var totalMarksSum float64
	var highestMarks float64 = -1
	var lowestMarks float64 = 999999

	for _, mark := range marks {
		key := mark.Subject + "_" + mark.ExamType
		summary, exists := summaryMap[key]

		if !exists {
			summary = &ResultSummaryResponse{
				CourseID:      courseID,
				CourseName:    mark.Student.Course.Name,
				Subject:       mark.Subject,
				ExamType:      mark.ExamType,
				Semester:      mark.Semester,
				TotalStudents: 0,
				PassCount:     0,
				FailCount:     0,
			}
			summaryMap[key] = summary
		}

		summary.TotalStudents++
		totalMarksSum += mark.MarksObtained

		if mark.Grade == "F" {
			summary.FailCount++
		} else {
			summary.PassCount++
		}

		if mark.MarksObtained > highestMarks {
			highestMarks = mark.MarksObtained
			summary.TopperName = mark.Student.User.Name
		}

		if mark.MarksObtained < lowestMarks {
			lowestMarks = mark.MarksObtained
		}
	}

	// Calculate percentages and averages
	var summaries []ResultSummaryResponse
	for _, summary := range summaryMap {
		summary.AverageMarks = totalMarksSum / float64(summary.TotalStudents)
		summary.HighestMarks = highestMarks
		summary.LowestMarks = lowestMarks

		if summary.TotalStudents > 0 {
			summary.PassPercentage = float64(summary.PassCount) / float64(summary.TotalStudents) * 100
		}

		summaries = append(summaries, *summary)
	}

	return utils.OK(c, summaries, "")
}
