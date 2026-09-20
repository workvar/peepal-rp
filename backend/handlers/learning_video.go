package handlers

import (
	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// UploadLearningVideo accepts a multipart file upload for a unit's video.
//
// Flow:
//   1. The frontend calls the GraphQL uploadUnitVideo mutation, which reserves
//      a storage path and returns a pre-signed-like URL pointing at this
//      handler (/api/v1/learning/video-upload?unitId=...&key=...).
//   2. The browser PUTs/POSTs the video file here.
//   3. This handler streams it to disk and writes video_storage_path onto
//      the LearningUnit row (along with video_type = "upload").
func UploadLearningVideo(c *fiber.Ctx) error {
	unitID := c.Query("unitId")
	key := c.Query("key")
	if unitID == "" || key == "" {
		return utils.BadRequest(c, "unitId and key are required")
	}
	// Both values become path segments on disk: reject traversal attempts
	// and reduce the key to a bare filename.
	if strings.Contains(unitID, "..") || strings.ContainsAny(unitID, "/\\") {
		return utils.BadRequest(c, "invalid unitId")
	}
	key = filepath.Base(key)
	if key == "." || key == ".." || strings.Contains(key, "..") {
		return utils.BadRequest(c, "invalid key")
	}
	switch strings.ToLower(filepath.Ext(key)) {
	case ".mp4", ".webm":
	default:
		return utils.BadRequest(c, "key must end in .mp4 or .webm")
	}

	// Confirm the unit exists and belongs to the caller's tenant via
	// section → goal chain.
	tenantID, _ := c.Locals("tenantID").(string)
	var unit models.LearningUnit
	if err := database.DB.WithContext(c.Context()).Where("id = ?", unitID).First(&unit).Error; err != nil {
		return utils.NotFound(c, "Unit not found")
	}
	var section models.LearningSection
	if err := database.DB.WithContext(c.Context()).Where("id = ?", unit.SectionID).First(&section).Error; err != nil {
		return utils.NotFound(c, "Section not found")
	}
	var goal models.LearningGoal
	if err := database.DB.WithContext(c.Context()).Where("id = ?", section.GoalID).First(&goal).Error; err != nil {
		return utils.NotFound(c, "Goal not found")
	}
	if tenantID != "" && goal.TenantID != tenantID {
		return utils.Forbidden(c, "cross-tenant access denied")
	}

	// File size cap (enforced on the stream, not just content-length).
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return utils.BadRequest(c, "file field missing")
	}
	if fileHeader.Size > utils.MaxVideoSize {
		return utils.BadRequest(c, "file exceeds maximum allowed size (500 MB)")
	}
	ct := normalizeContentType(fileHeader.Header.Get("Content-Type"))
	if ct != "video/mp4" && ct != "video/webm" {
		return utils.BadRequest(c, "file must be an mp4 or webm video")
	}

	src, err := fileHeader.Open()
	if err != nil {
		return utils.InternalError(c, "failed to open upload")
	}
	defer src.Close()

	dir := filepath.Join(utils.LocalVideoDir, unitID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return utils.InternalError(c, "failed to create storage dir")
	}
	dstPath := filepath.Join(dir, key)
	dst, err := os.Create(dstPath)
	if err != nil {
		return utils.InternalError(c, "failed to create destination file")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return utils.InternalError(c, "failed to write upload")
	}

	// Record the storage path on the unit.
	unit.VideoStoragePath = dstPath
	unit.VideoType = "upload"
	unit.VideoURL = utils.NewVideoStorage().Resolve(dstPath)
	if err := database.DB.WithContext(c.Context()).Save(&unit).Error; err != nil {
		log.Printf("[LEARNING] failed to persist video path for unit %s: %v", unitID, err)
		return utils.InternalError(c, "upload saved but metadata write failed")
	}

	return utils.OK(c, fiber.Map{
		"unitId":      unitID,
		"storagePath": dstPath,
		"videoUrl":    unit.VideoURL,
		"videoType":   unit.VideoType,
	}, "video uploaded")
}
