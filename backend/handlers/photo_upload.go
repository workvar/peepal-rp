package handlers

import (
	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ─── Photo Uploads ────────────────────────────────────────────────────────
//
// Single generic endpoint used by admin, employee, and student forms to
// upload a profile photo. Files are stored under ./uploads/photos/<entity>/
// and served back via the static route /api/v1/uploads/photos.
//
// Request:  multipart/form-data
//    form field "file"   : image binary (<= 5 MB, image/* content type)
//    query    "entity"   : one of "user" | "employee" | "student"
//    query    "id"       : entity row id (optional for "user" — defaults
//                          to the authenticated user)
//
// Response: { url: "/api/v1/uploads/photos/<entity>/<uuid>.ext" }

const (
	maxPhotoSize = 5 * 1024 * 1024 // 5 MB
	photoDir     = "./uploads/photos"
	photoCDNBase = "/api/v1/uploads/photos"
)

// allowedPhotoTypes maps accepted image content types to a canonical extension.
var allowedPhotoTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/jpg":  ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// allowedPhotoExts is the extension allowlist for uploaded photo filenames.
var allowedPhotoExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
}

// normalizeContentType lowercases a Content-Type header and strips parameters.
func normalizeContentType(ct string) string {
	return strings.ToLower(strings.TrimSpace(strings.Split(ct, ";")[0]))
}

// UploadPhoto handles a profile-photo upload for user/employee/student.
func UploadPhoto(c *fiber.Ctx) error {
	entity := strings.ToLower(c.Query("entity"))
	targetID := c.Query("id")
	authUserID, _ := c.Locals("userID").(string)
	tenantID, _ := c.Locals("tenantID").(string)

	if entity == "" {
		entity = "user"
	}
	switch entity {
	case "user", "employee", "student":
	default:
		return utils.BadRequest(c, "entity must be one of: user, employee, student")
	}
	if entity == "user" && targetID == "" {
		targetID = authUserID
	}
	if targetID == "" {
		return utils.BadRequest(c, "id is required")
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return utils.BadRequest(c, "file field missing")
	}
	if fileHeader.Size > maxPhotoSize {
		return utils.BadRequest(c, "file exceeds 5 MB limit")
	}
	ct := normalizeContentType(fileHeader.Header.Get("Content-Type"))
	canonicalExt, ok := allowedPhotoTypes[ct]
	if !ok {
		return utils.BadRequest(c, "file must be a jpg, png, or webp image")
	}
	// Never trust the client filename: take only its extension, validated
	// against the allowlist, and store under a server-generated UUID name.
	ext := strings.ToLower(filepath.Ext(filepath.Base(fileHeader.Filename)))
	if !allowedPhotoExts[ext] {
		ext = canonicalExt
	}

	// Persist to disk.
	dir := filepath.Join(photoDir, entity)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return utils.InternalError(c, "failed to create storage dir")
	}
	objName := fmt.Sprintf("%s%s", uuid.NewString(), ext)
	dstPath := filepath.Join(dir, objName)

	src, err := fileHeader.Open()
	if err != nil {
		return utils.InternalError(c, "failed to open upload")
	}
	defer src.Close()

	dst, err := os.Create(dstPath)
	if err != nil {
		return utils.InternalError(c, "failed to create destination file")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return utils.InternalError(c, "failed to write upload")
	}

	url := fmt.Sprintf("%s/%s/%s", photoCDNBase, entity, objName)

	// Persist the new URL on the target row (tenant-scoped guard).
	if err := savePhotoURL(entity, targetID, tenantID, authUserID, url); err != nil {
		// best effort: remove the orphan file
		_ = os.Remove(dstPath)
		return utils.BadRequest(c, err.Error())
	}

	return utils.OK(c, fiber.Map{"url": url}, "photo uploaded")
}

// savePhotoURL writes the uploaded photo URL onto the correct row and
// enforces simple authorisation — a user can only update their own photo,
// employees/students must belong to the caller's tenant.
func savePhotoURL(entity, targetID, tenantID, authUserID, url string) error {
	switch entity {
	case "user":
		if authUserID == "" || targetID != authUserID {
			return fmt.Errorf("cannot update another user's photo")
		}
		return database.DB.Model(&models.User{}).
			Where("id = ?", targetID).
			Update("photo_url", url).Error

	case "employee":
		var emp models.Employee
		if err := database.DB.First(&emp, "id = ?", targetID).Error; err != nil {
			return fmt.Errorf("employee not found")
		}
		if tenantID != "" && emp.TenantID != tenantID {
			return fmt.Errorf("cross-tenant access denied")
		}
		return database.DB.Model(&emp).Update("photo_url", url).Error

	case "student":
		var stu models.Student
		if err := database.DB.First(&stu, "id = ?", targetID).Error; err != nil {
			return fmt.Errorf("student not found")
		}
		if tenantID != "" && stu.TenantID != tenantID {
			return fmt.Errorf("cross-tenant access denied")
		}
		return database.DB.Model(&stu).Update("photo_url", url).Error
	}
	return fmt.Errorf("unknown entity")
}
