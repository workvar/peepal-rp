package handlers

import (
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CreateLibraryBookRequest struct {
	Title           string `json:"title"`
	Author          string `json:"author"`
	ISBN            string `json:"isbn"`
	Publisher       string `json:"publisher"`
	PublishYear     int    `json:"publish_year"`
	Category        string `json:"category"`
	TotalCopies     int    `json:"total_copies"`
	AvailableCopies int    `json:"available_copies"`
	Rack            string `json:"rack"`
	Shelf           string `json:"shelf"`
}

type UpdateLibraryBookRequest struct {
	Title           string `json:"title"`
	Author          string `json:"author"`
	ISBN            string `json:"isbn"`
	Publisher       string `json:"publisher"`
	PublishYear     int    `json:"publish_year"`
	Category        string `json:"category"`
	TotalCopies     int    `json:"total_copies"`
	AvailableCopies int    `json:"available_copies"`
	Rack            string `json:"rack"`
	Shelf           string `json:"shelf"`
}

type IssueBookRequest struct {
	BookID  string `json:"book_id"`
	UserID  string `json:"user_id"`
	DueDate string `json:"due_date"` // YYYY-MM-DD
}

type ReturnBookRequest struct {
	ReturnDate string  `json:"return_date"` // YYYY-MM-DD
	FineAmount float64 `json:"fine_amount"`
}

// ────────────────── Library Books ──────────────────

// ListBooks returns all library books
func ListBooks(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var books []models.LibraryBook
	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID)

	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	if available := c.Query("available"); available == "true" {
		query = query.Where("available_copies > 0")
	}

	query.Order("title asc").Find(&books)
	return utils.OK(c, books, "")
}

// CreateBook creates a new library book
func CreateBook(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req CreateLibraryBookRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Title == "" || req.Author == "" || req.TotalCopies == 0 {
		return utils.BadRequest(c, "Title, author, and total_copies are required")
	}

	if req.AvailableCopies == 0 {
		req.AvailableCopies = req.TotalCopies
	}

	book := models.LibraryBook{
		TenantID:        tenantID,
		Title:           req.Title,
		Author:          req.Author,
		ISBN:            req.ISBN,
		Publisher:       req.Publisher,
		PublishYear:     req.PublishYear,
		Category:        req.Category,
		TotalCopies:     req.TotalCopies,
		AvailableCopies: req.AvailableCopies,
		Rack:            req.Rack,
		Shelf:           req.Shelf,
	}

	if err := database.DB.WithContext(c.Context()).Create(&book).Error; err != nil {
		return utils.InternalError(c, "Could not create library book")
	}

	return utils.Created(c, book, "Library book created successfully")
}

// UpdateBook updates a library book
func UpdateBook(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var book models.LibraryBook
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&book).Error; err != nil {
		return utils.NotFound(c, "Library book not found")
	}

	var req UpdateLibraryBookRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Title != "" {
		book.Title = req.Title
	}
	if req.Author != "" {
		book.Author = req.Author
	}
	if req.ISBN != "" {
		book.ISBN = req.ISBN
	}
	if req.Publisher != "" {
		book.Publisher = req.Publisher
	}
	if req.PublishYear > 0 {
		book.PublishYear = req.PublishYear
	}
	if req.Category != "" {
		book.Category = req.Category
	}
	if req.TotalCopies > 0 {
		book.TotalCopies = req.TotalCopies
	}
	if req.AvailableCopies >= 0 {
		book.AvailableCopies = req.AvailableCopies
	}
	if req.Rack != "" {
		book.Rack = req.Rack
	}
	if req.Shelf != "" {
		book.Shelf = req.Shelf
	}

	if err := database.DB.WithContext(c.Context()).Save(&book).Error; err != nil {
		return utils.InternalError(c, "Could not update library book")
	}

	return utils.OK(c, book, "Library book updated successfully")
}

// DeleteBook deletes a library book
func DeleteBook(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	id := c.Params("id")

	var book models.LibraryBook
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", id, tenantID).First(&book).Error; err != nil {
		return utils.NotFound(c, "Library book not found")
	}

	if err := database.DB.WithContext(c.Context()).Delete(&book).Error; err != nil {
		return utils.InternalError(c, "Could not delete library book")
	}

	return utils.OK(c, nil, "Library book deleted successfully")
}

// ────────────────── Library Issues ──────────────────

// ListIssues returns all library issues
func ListIssues(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var issues []models.LibraryIssue
	query := database.DB.WithContext(c.Context()).Where("tenant_id = ?", tenantID).
		Preload("Book").
		Preload("User")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("issue_date desc").Find(&issues)
	return utils.OK(c, issues, "")
}

// IssueBook issues a book to a user
func IssueBook(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var req IssueBookRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.BookID == "" || req.UserID == "" || req.DueDate == "" {
		return utils.BadRequest(c, "BookID, user_id, and due_date are required")
	}

	// Verify book exists and has available copies
	var book models.LibraryBook
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.BookID, tenantID).First(&book).Error; err != nil {
		return utils.BadRequest(c, "Library book not found")
	}

	if book.AvailableCopies <= 0 {
		return utils.BadRequest(c, "No available copies of this book")
	}

	// Verify user exists
	var user models.User
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", req.UserID, tenantID).First(&user).Error; err != nil {
		return utils.BadRequest(c, "User not found")
	}

	// Parse due date
	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid due_date — use YYYY-MM-DD")
	}

	issue := models.LibraryIssue{
		TenantID:   tenantID,
		BookID:     req.BookID,
		UserID:     req.UserID,
		IssueDate:  time.Now(),
		DueDate:    dueDate,
		Status:     "issued",
		FineAmount: 0,
	}

	if err := database.DB.WithContext(c.Context()).Create(&issue).Error; err != nil {
		return utils.InternalError(c, "Could not issue book")
	}

	// Decrement available copies
	book.AvailableCopies--
	if err := database.DB.WithContext(c.Context()).Save(&book).Error; err != nil {
		return utils.InternalError(c, "Failed to save record")
	}

	issue.Book = book
	issue.User = user
	return utils.Created(c, issue, "Book issued successfully")
}

// ReturnBook returns a book from a user
func ReturnBook(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)
	issueID := c.Params("id")

	var issue models.LibraryIssue
	if err := database.DB.WithContext(c.Context()).Where("id = ? AND tenant_id = ?", issueID, tenantID).
		Preload("Book").First(&issue).Error; err != nil {
		return utils.NotFound(c, "Library issue not found")
	}

	var req ReturnBookRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.ReturnDate == "" {
		return utils.BadRequest(c, "ReturnDate is required")
	}

	returnDate, err := time.Parse("2006-01-02", req.ReturnDate)
	if err != nil {
		return utils.BadRequest(c, "Invalid return_date — use YYYY-MM-DD")
	}

	issue.ReturnDate = &returnDate
	issue.Status = "returned"
	issue.FineAmount = req.FineAmount

	if err := database.DB.WithContext(c.Context()).Save(&issue).Error; err != nil {
		return utils.InternalError(c, "Could not return book")
	}

	// Increment available copies
	var book models.LibraryBook
	if err := database.DB.WithContext(c.Context()).Where("id = ?", issue.BookID).First(&book).Error; err == nil {
		book.AvailableCopies++
		if err := database.DB.WithContext(c.Context()).Save(&book).Error; err != nil {
			return utils.InternalError(c, "Failed to save record")
		}
	}

	database.DB.WithContext(c.Context()).Preload("Book").Preload("User").First(&issue, "id = ?", issueID)
	return utils.OK(c, issue, "Book returned successfully")
}

// GetOverdueBooks returns all overdue books
func GetOverdueBooks(c *fiber.Ctx) error {
	tenantID := middleware.TenantID(c)

	var issues []models.LibraryIssue
	database.DB.WithContext(c.Context()).Where("tenant_id = ? AND status = 'issued' AND due_date < ?", tenantID, time.Now()).
		Preload("Book").
		Preload("User").
		Order("due_date asc").
		Find(&issues)

	return utils.OK(c, issues, "")
}
