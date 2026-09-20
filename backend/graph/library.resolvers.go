package graph

import (
	"context"
	"errors"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"gorm.io/gorm"
)

func (r *queryResolver) LibraryBooks(ctx context.Context, search *string, category *string) ([]*model.LibraryBook, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	q := r.DB.Where("tenant_id = ?", auth.TenantID)
	if category != nil && *category != "" {
		q = q.Where("category = ?", *category)
	}
	if search != nil && *search != "" {
		like := "%" + *search + "%"
		q = q.Where("title LIKE ? OR author LIKE ? OR isbn LIKE ?", like, like, like)
	}
	var books []models.LibraryBook
	if err := q.Order("title asc").Find(&books).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LibraryBook, len(books))
	for i, b := range books {
		out[i] = libraryBookToModel(b)
	}
	return out, nil
}

// LibraryIssues lists borrowings. Circulation-desk roles (admin, staff) see
// every borrower in the tenant; a teacher or student sees only their own loans,
// which is what the Library page shows them. Scoping rather than refusing keeps
// the page usable for the roles the module grants it to.
// isCirculationDesk reports whether the caller runs the library counter and may
// therefore see every borrower's loans.
func isCirculationDesk(auth AuthContext) bool {
	return auth.IsSuperAdmin || auth.Role == roleAdmin || auth.Role == roleStaff
}

func (r *queryResolver) LibraryIssues(ctx context.Context) ([]*model.LibraryIssue, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var issues []models.LibraryIssue
	q := r.DB.Where("tenant_id = ?", auth.TenantID)
	if !isCirculationDesk(auth) {
		q = q.Where("user_id = ?", auth.UserID)
	}
	if err := q.
		Preload("Book").Preload("User").
		Order("issue_date desc").Find(&issues).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LibraryIssue, len(issues))
	for i, iss := range issues {
		out[i] = libraryIssueToModel(iss)
	}
	return out, nil
}

// LibraryOverdue is LibraryIssues filtered to overdue loans, with the same
// scoping: the desk sees everyone, a borrower sees themselves.
func (r *queryResolver) LibraryOverdue(ctx context.Context) ([]*model.LibraryIssue, error) {
	auth, err := requireAuth(ctx)
	if err != nil {
		return nil, err
	}
	var issues []models.LibraryIssue
	q := r.DB.Where("tenant_id = ? AND status = 'issued' AND due_date < ?", auth.TenantID, time.Now())
	if !isCirculationDesk(auth) {
		q = q.Where("user_id = ?", auth.UserID)
	}
	if err := q.
		Preload("Book").Preload("User").
		Order("due_date asc").Find(&issues).Error; err != nil {
		return nil, err
	}
	out := make([]*model.LibraryIssue, len(issues))
	for i, iss := range issues {
		out[i] = libraryIssueToModel(iss)
	}
	return out, nil
}

func (r *mutationResolver) CreateLibraryBook(ctx context.Context, input model.CreateLibraryBookInput) (*model.LibraryBook, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	avail := input.TotalCopies
	if input.AvailableCopies != nil {
		avail = *input.AvailableCopies
	}
	b := models.LibraryBook{
		TenantID:        auth.TenantID,
		Title:           input.Title,
		Author:          input.Author,
		TotalCopies:     input.TotalCopies,
		AvailableCopies: avail,
	}
	if input.ISBN != nil {
		b.ISBN = *input.ISBN
	}
	if input.Publisher != nil {
		b.Publisher = *input.Publisher
	}
	if input.PublishYear != nil {
		b.PublishYear = *input.PublishYear
	}
	if input.Category != nil {
		b.Category = *input.Category
	}
	if input.Rack != nil {
		b.Rack = *input.Rack
	}
	if input.Shelf != nil {
		b.Shelf = *input.Shelf
	}
	if err := r.DB.Create(&b).Error; err != nil {
		return nil, err
	}
	return libraryBookToModel(b), nil
}

func (r *mutationResolver) UpdateLibraryBook(ctx context.Context, id string, input model.UpdateLibraryBookInput) (*model.LibraryBook, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return nil, err
	}
	var b models.LibraryBook
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).First(&b).Error; err != nil {
		return nil, ErrNotFound
	}
	if input.Title != nil {
		b.Title = *input.Title
	}
	if input.Author != nil {
		b.Author = *input.Author
	}
	if input.ISBN != nil {
		b.ISBN = *input.ISBN
	}
	if input.Publisher != nil {
		b.Publisher = *input.Publisher
	}
	if input.PublishYear != nil {
		b.PublishYear = *input.PublishYear
	}
	if input.Category != nil {
		b.Category = *input.Category
	}
	if input.TotalCopies != nil {
		b.TotalCopies = *input.TotalCopies
	}
	if input.AvailableCopies != nil {
		b.AvailableCopies = *input.AvailableCopies
	}
	if input.Rack != nil {
		b.Rack = *input.Rack
	}
	if input.Shelf != nil {
		b.Shelf = *input.Shelf
	}
	r.DB.Save(&b)
	return libraryBookToModel(b), nil
}

func (r *mutationResolver) DeleteLibraryBook(ctx context.Context, id string) (bool, error) {
	auth, err := requireRole(ctx, roleAdmin)
	if err != nil {
		return false, err
	}
	res := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).Delete(&models.LibraryBook{})
	if res.RowsAffected == 0 {
		return false, ErrNotFound
	}
	return true, nil
}

func (r *mutationResolver) IssueLibraryBook(ctx context.Context, input model.IssueLibraryBookInput) (*model.LibraryIssue, error) {
	// Issuing books to arbitrary users is a circulation-desk action.
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var book models.LibraryBook
	if err := r.DB.Where("id = ? AND tenant_id = ?", input.BookID, auth.TenantID).First(&book).Error; err != nil {
		return nil, GQLErr("library book not found")
	}
	if book.AvailableCopies <= 0 {
		return nil, GQLErr("no available copies of this book")
	}
	var user models.User
	if err := r.DB.Where("id = ? AND tenant_id = ?", input.UserID, auth.TenantID).First(&user).Error; err != nil {
		return nil, GQLErr("user not found")
	}
	dueDate, err := time.Parse("2006-01-02", input.DueDate)
	if err != nil {
		return nil, GQLErr("invalid due_date — use YYYY-MM-DD")
	}
	issue := models.LibraryIssue{
		TenantID:   auth.TenantID,
		BookID:     input.BookID,
		UserID:     input.UserID,
		IssueDate:  time.Now(),
		DueDate:    dueDate,
		Status:     "issued",
		FineAmount: 0,
	}
	if err := r.DB.Create(&issue).Error; err != nil {
		return nil, err
	}
	book.AvailableCopies--
	r.DB.Save(&book)
	issue.Book = book
	issue.User = user
	return libraryIssueToModel(issue), nil
}

func (r *mutationResolver) ReturnLibraryBook(ctx context.Context, id string, input model.ReturnLibraryBookInput) (*model.LibraryIssue, error) {
	// Recording returns (and fines) is a circulation-desk action.
	auth, err := requireRole(ctx, roleAdmin, roleStaff)
	if err != nil {
		return nil, err
	}
	var issue models.LibraryIssue
	if err := r.DB.Where("id = ? AND tenant_id = ?", id, auth.TenantID).
		Preload("Book").First(&issue).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	returnDate, err := time.Parse("2006-01-02", input.ReturnDate)
	if err != nil {
		return nil, GQLErr("invalid return_date — use YYYY-MM-DD")
	}
	issue.ReturnDate = &returnDate
	issue.Status = "returned"
	if input.FineAmount != nil {
		issue.FineAmount = *input.FineAmount
	}
	r.DB.Save(&issue)
	var book models.LibraryBook
	if err := r.DB.Where("id = ?", issue.BookID).First(&book).Error; err == nil {
		book.AvailableCopies++
		r.DB.Save(&book)
	}
	r.DB.Preload("Book").Preload("User").First(&issue, "id = ?", id)
	return libraryIssueToModel(issue), nil
}

func libraryBookToModel(b models.LibraryBook) *model.LibraryBook {
	return &model.LibraryBook{
		ID:              b.ID,
		Title:           b.Title,
		Author:          b.Author,
		ISBN:            b.ISBN,
		Publisher:       b.Publisher,
		PublishYear:     b.PublishYear,
		Category:        b.Category,
		TotalCopies:     b.TotalCopies,
		AvailableCopies: b.AvailableCopies,
		Rack:            b.Rack,
		Shelf:           b.Shelf,
	}
}

func libraryIssueToModel(iss models.LibraryIssue) *model.LibraryIssue {
	m := &model.LibraryIssue{
		ID:         iss.ID,
		BookID:     iss.BookID,
		UserID:     iss.UserID,
		IssueDate:  iss.IssueDate.Format("2006-01-02"),
		DueDate:    iss.DueDate.Format("2006-01-02"),
		Status:     iss.Status,
		FineAmount: iss.FineAmount,
	}
	if iss.ReturnDate != nil {
		s := iss.ReturnDate.Format("2006-01-02")
		m.ReturnDate = &s
	}
	if iss.Book.ID != "" {
		m.Book = libraryBookToModel(iss.Book)
	}
	if iss.User.ID != "" {
		m.User = &model.User{
			ID:       iss.User.ID,
			Email:    iss.User.Email,
			Name:     iss.User.Name,
			Role:     string(iss.User.Role),
			IsActive: iss.User.IsActive,
		}
	}
	return m
}
