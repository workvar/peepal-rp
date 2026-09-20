package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// ─── Video Storage ────────────────────────────────────────────────────────
//
// Abstraction for where unit videos live. The default implementation writes
// to local disk under ./uploads/learning-videos/<unitID>/<uuid>-<filename>.
//
// Swap for an S3-compatible backend by implementing VideoStorage interface
// and returning it from NewVideoStorage().
//
// MaxVideoSize defaults to 500 MB (enforced in the video upload handler).

const (
	// MaxVideoSize is the maximum bytes accepted for a unit video upload.
	MaxVideoSize = 500 * 1024 * 1024 // 500 MB
	// LocalVideoDir is the on-disk root for local video uploads.
	LocalVideoDir = "./uploads/learning-videos"
)

// VideoStorage is the abstraction for unit-video storage backends.
type VideoStorage interface {
	// Reserve generates a server-side storage path for the new upload and
	// returns the path itself plus an upload URL the client should PUT the
	// file to. For the local backend, uploadURL is the API route for the
	// multipart handler.
	Reserve(unitID, filename, contentType string) (uploadURL, storagePath string, err error)

	// Resolve turns a recorded storagePath back into a URL the client can use
	// to stream/download the video (e.g. "/api/v1/uploads/learning-videos/...").
	Resolve(storagePath string) string
}

// localVideoStorage is the default on-disk implementation.
type localVideoStorage struct {
	root   string
	apiURL string // base URL exposed for uploads, e.g. "/api/v1/learning/video-upload"
	cdnURL string // base URL for serving, e.g. "/api/v1/uploads/learning-videos"
}

// NewVideoStorage returns the default storage (local disk).
func NewVideoStorage() VideoStorage {
	return &localVideoStorage{
		root:   LocalVideoDir,
		apiURL: "/api/v1/learning/video-upload",
		cdnURL: "/api/v1/uploads/learning-videos",
	}
}

func (s *localVideoStorage) Reserve(unitID, filename, contentType string) (string, string, error) {
	canonicalExt, ok := videoExtByType[normalizeVideoContentType(contentType)]
	if !ok {
		return "", "", fmt.Errorf("unsupported content type: %s (allowed: video/mp4, video/webm)", contentType)
	}
	if unitID == "" || strings.Contains(unitID, "..") || strings.ContainsAny(unitID, "/\\") {
		return "", "", fmt.Errorf("invalid unit id")
	}
	safe := sanitizeFilename(filename)
	if ext := strings.ToLower(filepath.Ext(safe)); !allowedVideoExts[ext] {
		safe += canonicalExt
	}
	objName := fmt.Sprintf("%s-%s", uuid.NewString(), safe)

	dir := filepath.Join(s.root, unitID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", "", fmt.Errorf("mkdir: %w", err)
	}
	storagePath := filepath.Join(dir, objName)

	// The client posts to this URL with multipart/form-data:
	//   field "unitId" = unitID, field "file" = video binary.
	uploadURL := fmt.Sprintf("%s?unitId=%s&key=%s", s.apiURL, unitID, objName)
	return uploadURL, storagePath, nil
}

func (s *localVideoStorage) Resolve(storagePath string) string {
	if storagePath == "" {
		return ""
	}
	rel := strings.TrimPrefix(storagePath, s.root)
	rel = strings.TrimPrefix(rel, "/")
	return fmt.Sprintf("%s/%s", s.cdnURL, rel)
}

// ─── helpers ──────────────────────────────────────────────────────────────

// videoExtByType maps accepted video content types to a canonical extension.
var videoExtByType = map[string]string{
	"video/mp4":  ".mp4",
	"video/webm": ".webm",
}

// allowedVideoExts is the extension allowlist for stored video filenames.
var allowedVideoExts = map[string]bool{".mp4": true, ".webm": true}

// normalizeVideoContentType lowercases a Content-Type and strips parameters.
func normalizeVideoContentType(ct string) string {
	return strings.ToLower(strings.TrimSpace(strings.Split(ct, ";")[0]))
}

func sanitizeFilename(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, " ", "_")
	// strip anything not alnum, dot, dash, underscore
	var b strings.Builder
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z',
			r >= 'A' && r <= 'Z',
			r >= '0' && r <= '9',
			r == '.' || r == '-' || r == '_':
			b.WriteRune(r)
		}
	}
	out := b.String()
	if strings.Trim(out, ".") == "" {
		out = "video.mp4"
	}
	return out
}
