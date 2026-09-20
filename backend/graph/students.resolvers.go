package graph

import (
	"context"
	"errors"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (r *queryResolver) Students(ctx context.Context, courseID *string, semester *int) ([]*model.Student, error) {
	// Full student records (guardian contacts, addresses): staff-facing roles.
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	query := r.DB.WithContext(ctx).
		Preload("User").
		Preload("Course").
		Where("tenant_id = ?", auth.TenantID)
	if courseID != nil && *courseID != "" {
		query = query.Where("course_id = ?", *courseID)
	}
	if semester != nil {
		query = query.Where("semester = ?", *semester)
	}
	var rows []models.Student
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Student, len(rows))
	for i, s := range rows {
		out[i] = studentToModel(s)
	}
	return out, nil
}

func (r *queryResolver) Student(ctx context.Context, id string) (*model.Student, error) {
	// Full student record (guardian contacts, addresses): staff-facing roles.
	auth, err := requireRole(ctx, roleAdmin, roleTeacher, roleStaff)
	if err != nil {
		return nil, err
	}
	var s models.Student
	if err := r.DB.WithContext(ctx).
		Preload("User").
		Preload("Course").
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return studentToModel(s), nil
}

func (r *queryResolver) Courses(ctx context.Context) ([]*model.Course, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var rows []models.Course
	if err := r.DB.WithContext(ctx).
		Preload("Department").
		Preload("Batches").
		Where("tenant_id = ?", auth.TenantID).
		Order("name ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]*model.Course, len(rows))
	for i, c := range rows {
		out[i] = courseToModel(c)
	}
	return out, nil
}

func (r *mutationResolver) CreateStudent(ctx context.Context, input model.CreateStudentInput) (*model.Student, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	// Enforce the subscription's student quota before inserting.
	if err := enforceResourceQuota(r.DB.WithContext(ctx), auth.TenantID, models.QuotaStudents); err != nil {
		return nil, err
	}
	s := models.Student{
		ID:              uuid.NewString(),
		TenantID:        auth.TenantID,
		RollNumber:      input.RollNumber,
		Section:         strVal(input.Section),
		Phone:           strVal(input.Phone),
		DateOfBirth:     strVal(input.DateOfBirth),
		Gender:          strVal(input.Gender),
		BloodGroup:      strVal(input.BloodGroup),
		PhotoURL:        strVal(input.PhotoURL),
		Address:         strVal(input.Address),
		City:            strVal(input.City),
		State:           strVal(input.State),
		Pincode:         strVal(input.Pincode),
		Nationality:     strVal(input.Nationality),
		EmergencyName:   strVal(input.EmergencyName),
		EmergencyPhone:  strVal(input.EmergencyPhone),
		FatherName:      strVal(input.FatherName),
		FatherPhone:     strVal(input.FatherPhone),
		MotherName:      strVal(input.MotherName),
		MotherPhone:     strVal(input.MotherPhone),
		AdmissionStatus: strVal(input.AdmissionStatus),
		Batch:           strVal(input.Batch),
	}
	if input.CourseID != nil {
		s.CourseID = *input.CourseID
	}
	if input.Semester != nil {
		s.Semester = *input.Semester
	}
	if input.EnrollDate != nil && *input.EnrollDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EnrollDate); err == nil {
			s.EnrollDate = t
		}
	}
	// Create the login account and the student profile together, so a student
	// is onboarded in a single step (no separate "add user, then assign" flow).
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		uid, err := createLoginAccount(tx, auth.TenantID, input.Name, strVal(input.Email), strVal(input.Password), models.RoleStudent)
		if err != nil {
			return err
		}
		s.UserID = uid
		return tx.Create(&s).Error
	}); err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).
		Preload("User").
		Preload("Course").
		Where("id = ? AND tenant_id = ?", s.ID, auth.TenantID).
		First(&s).Error; err != nil {
		return nil, err
	}
	// Auto-assign HOD as the student's manager in the org hierarchy.
	if hodUID := hodUserIDForCourse(r.DB, auth.TenantID, s.CourseID); hodUID != "" {
		assignHODAsManager(r.DB, s.UserID, hodUID)
	}
	maybeSendInvite(r.DB, auth.TenantID, s.UserID, input.SendInvite != nil && *input.SendInvite)
	return studentToModel(s), nil
}

func (r *mutationResolver) DeleteStudent(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	var s models.Student
	if err := r.DB.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrNotFound
		}
		return false, err
	}
	// Removing a student removes their login account and every record tied to
	// them (marks, fees, hostel bed, transport, attendance, …) in one go.
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return deleteStudentCascade(tx, auth.TenantID, s)
	}); err != nil {
		return false, err
	}
	return true, nil
}

// DeleteAllStudents wipes every student in the tenant. Each student is removed
// with the same cascade as a single delete (login account, marks, fees, hostel
// bed, transport, attendance, …), and the whole sweep runs in one transaction
// so a mid-way failure rolls back rather than leaving a half-deleted roster.
func (r *mutationResolver) DeleteAllStudents(ctx context.Context) (int, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return 0, err
	}
	var students []models.Student
	if err := r.DB.WithContext(ctx).
		Where("tenant_id = ?", auth.TenantID).
		Find(&students).Error; err != nil {
		return 0, err
	}
	if len(students) == 0 {
		return 0, nil
	}
	if err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, s := range students {
			if err := deleteStudentCascade(tx, auth.TenantID, s); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return 0, err
	}
	return len(students), nil
}

// --- helpers ---

func studentToModel(s models.Student) *model.Student {
	m := &model.Student{
		ID:         s.ID,
		RollNumber: s.RollNumber,
	}
	m.Section = toStrPtr(s.Section)
	m.Semester = toIntPtr(s.Semester)
	m.Phone = toStrPtr(s.Phone)
	m.DateOfBirth = toStrPtr(s.DateOfBirth)
	m.Gender = toStrPtr(s.Gender)
	m.BloodGroup = toStrPtr(s.BloodGroup)
	m.PhotoURL = toStrPtr(s.PhotoURL)
	m.Address = toStrPtr(s.Address)
	m.City = toStrPtr(s.City)
	m.State = toStrPtr(s.State)
	m.Pincode = toStrPtr(s.Pincode)
	m.Nationality = toStrPtr(s.Nationality)
	m.EmergencyName = toStrPtr(s.EmergencyName)
	m.EmergencyPhone = toStrPtr(s.EmergencyPhone)
	m.FatherName = toStrPtr(s.FatherName)
	m.FatherPhone = toStrPtr(s.FatherPhone)
	m.MotherName = toStrPtr(s.MotherName)
	m.MotherPhone = toStrPtr(s.MotherPhone)
	m.AdmissionStatus = toStrPtr(s.AdmissionStatus)
	m.Batch = toStrPtr(s.Batch)
	if !s.EnrollDate.IsZero() {
		d := s.EnrollDate.Format("2006-01-02")
		m.EnrollDate = &d
	}
	if s.User.ID != "" {
		m.User = userToModel(s.User)
	}
	if s.Course.ID != "" {
		m.Course = &model.Course{ID: s.Course.ID, Name: s.Course.Name, Code: s.Course.Code}
	}
	return m
}

func (r *mutationResolver) UpdateStudent(ctx context.Context, id string, input model.UpdateStudentInput) (*model.Student, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var s models.Student
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if input.CourseID != nil {
		s.CourseID = *input.CourseID
	}
	if input.RollNumber != nil {
		s.RollNumber = *input.RollNumber
	}
	if input.Section != nil {
		s.Section = *input.Section
	}
	if input.Semester != nil {
		s.Semester = *input.Semester
	}
	if input.Phone != nil {
		s.Phone = *input.Phone
	}
	if input.EnrollDate != nil && *input.EnrollDate != "" {
		if t, err := time.Parse("2006-01-02", *input.EnrollDate); err == nil {
			s.EnrollDate = t
		}
	}
	if input.DateOfBirth != nil {
		s.DateOfBirth = *input.DateOfBirth
	}
	if input.Gender != nil {
		s.Gender = *input.Gender
	}
	if input.BloodGroup != nil {
		s.BloodGroup = *input.BloodGroup
	}
	if input.PhotoURL != nil {
		s.PhotoURL = *input.PhotoURL
	}
	if input.Address != nil {
		s.Address = *input.Address
	}
	if input.City != nil {
		s.City = *input.City
	}
	if input.State != nil {
		s.State = *input.State
	}
	if input.Pincode != nil {
		s.Pincode = *input.Pincode
	}
	if input.Nationality != nil {
		s.Nationality = *input.Nationality
	}
	if input.EmergencyName != nil {
		s.EmergencyName = *input.EmergencyName
	}
	if input.EmergencyPhone != nil {
		s.EmergencyPhone = *input.EmergencyPhone
	}
	if input.FatherName != nil {
		s.FatherName = *input.FatherName
	}
	if input.FatherPhone != nil {
		s.FatherPhone = *input.FatherPhone
	}
	if input.MotherName != nil {
		s.MotherName = *input.MotherName
	}
	if input.MotherPhone != nil {
		s.MotherPhone = *input.MotherPhone
	}
	if input.AdmissionStatus != nil {
		s.AdmissionStatus = *input.AdmissionStatus
	}
	if input.Batch != nil {
		s.Batch = *input.Batch
	}
	// Apply any identity edits (name/email/password) to the linked account in
	// the same transaction as the profile save.
	if err := r.DB.Transaction(func(tx *gorm.DB) error {
		if input.Name != nil || input.Email != nil || input.Password != nil {
			if err := updateLoginAccount(tx, auth.TenantID, s.UserID, input.Name, input.Email, input.Password, nil); err != nil {
				return err
			}
		}
		return tx.Save(&s).Error
	}); err != nil {
		return nil, err
	}
	if err := r.DB.WithContext(ctx).
		Preload("User").Preload("Course").
		Where("id = ? AND tenant_id = ?", s.ID, auth.TenantID).
		First(&s).Error; err != nil {
		return nil, err
	}
	// Re-sync HOD assignment whenever course (and thus department) may have changed.
	hodUID := hodUserIDForCourse(r.DB, auth.TenantID, s.CourseID)
	assignHODAsManager(r.DB, s.UserID, hodUID)
	return studentToModel(s), nil
}
