package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"collegeerp/config"
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// refreshApp wires a throwaway app + in-memory DB with one active user whose
// tenant has a live subscription — the state a real session refresh runs in.
func refreshApp(t *testing.T) (*fiber.App, *models.User) {
	t.Helper()
	config.App.JWTSecret = "test-secret"
	config.App.AccessTokenTTL = 15 * time.Minute
	config.App.RefreshTokenTTL = 30 * 24 * time.Hour
	config.App.RefreshReuseGrace = 30 * time.Second

	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{Logger: gormlogger.Discard})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.UserRole{}, &models.Tenant{}, &models.TenantSubscription{}, &models.RefreshToken{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	prev := database.DB
	database.DB = db
	t.Cleanup(func() {
		database.DB = prev
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})

	user := &models.User{ID: "user-1", TenantID: "tenant-1", Name: "Ada", Email: "ada@example.com", Role: models.RoleAdmin, IsActive: true}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	if err := db.Create(&models.TenantSubscription{TenantID: "tenant-1", Status: "active"}).Error; err != nil {
		t.Fatalf("create subscription: %v", err)
	}

	app := fiber.New()
	app.Post("/auth/refresh", Refresh)
	app.Post("/auth/logout", Logout)
	return app, user
}

// newSession mints a session directly, standing in for a completed login.
func newSession(t *testing.T, user *models.User) string {
	t.Helper()
	plain, _, err := models.IssueRefreshToken(database.DB, models.RefreshTokenInput{
		UserID:     user.ID,
		TenantID:   user.TenantID,
		ActiveRole: string(user.Role),
	})
	if err != nil {
		t.Fatalf("IssueRefreshToken: %v", err)
	}
	return plain
}

func postWithRefresh(t *testing.T, app *fiber.App, path, refresh string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, nil)
	if refresh != "" {
		req.Header.Set("Cookie", middleware.RefreshCookieName+"="+refresh)
	}
	resp, err := app.Test(req, 5000)
	if err != nil {
		t.Fatalf("app.Test %s: %v", path, err)
	}
	return resp
}

// cookieValue pulls one Set-Cookie value off a response, plus whether it is a
// deletion (empty value / Max-Age=0).
func cookieValue(resp *http.Response, name string) (string, bool) {
	for _, ck := range resp.Cookies() {
		if ck.Name == name {
			cleared := ck.Value == "" || ck.MaxAge < 0 || (ck.MaxAge == 0 && !ck.Expires.IsZero() && ck.Expires.Before(time.Now()))
			return ck.Value, cleared
		}
	}
	return "", false
}

func decodeBody(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("decode body %q: %v", string(raw), err)
	}
	return out
}

// The core exchange: a refresh cookie buys a new short-lived access token and
// a replacement refresh cookie, without the user re-entering a password.
func TestRefreshMintsAccessTokenAndRotatesCookie(t *testing.T) {
	app, user := refreshApp(t)
	refresh := newSession(t, user)

	resp := postWithRefresh(t, app, "/auth/refresh", refresh)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body: %v)", resp.StatusCode, decodeBody(t, resp))
	}

	access, _ := cookieValue(resp, middleware.AuthCookieName)
	if access == "" {
		t.Fatal("no access cookie set")
	}
	claims, err := utils.ParseToken(access)
	if err != nil {
		t.Fatalf("access token invalid: %v", err)
	}
	if claims.UserID != user.ID || claims.Role != string(user.Role) {
		t.Fatalf("wrong identity in token: %+v", claims)
	}
	if claims.SessionID == "" {
		t.Fatal("access token carries no session id")
	}
	if lifetime := time.Until(claims.ExpiresAt.Time); lifetime > 16*time.Minute {
		t.Fatalf("access token lifetime = %v, want the short TTL", lifetime)
	}

	rotated, _ := cookieValue(resp, middleware.RefreshCookieName)
	if rotated == "" {
		t.Fatal("no refresh cookie set")
	}
	if rotated == refresh {
		t.Fatal("refresh cookie was not rotated")
	}

	// The old cookie is spent; only the rotated one still works.
	if resp := postWithRefresh(t, app, "/auth/refresh", rotated); resp.StatusCode != http.StatusOK {
		t.Fatalf("rotated cookie rejected: %d", resp.StatusCode)
	}
}

func TestRefreshWithoutCookieIsUnauthorized(t *testing.T) {
	app, _ := refreshApp(t)
	if resp := postWithRefresh(t, app, "/auth/refresh", ""); resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

// A deactivated account must not be able to keep a session alive by refreshing.
func TestRefreshRejectsDeactivatedUser(t *testing.T) {
	app, user := refreshApp(t)
	refresh := newSession(t, user)
	database.DB.Model(&models.User{}).Where("id = ?", user.ID).Update("is_active", false)

	resp := postWithRefresh(t, app, "/auth/refresh", refresh)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
	var live int64
	database.DB.Model(&models.RefreshToken{}).Where("user_id = ? AND revoked_at IS NULL", user.ID).Count(&live)
	if live != 0 {
		t.Fatalf("%d session(s) survived deactivation", live)
	}
}

// An organisation whose subscription lapsed cannot refresh its way past the
// login gate.
func TestRefreshRejectsLapsedSubscription(t *testing.T) {
	app, user := refreshApp(t)
	refresh := newSession(t, user)
	database.DB.Model(&models.TenantSubscription{}).Where("tenant_id = ?", user.TenantID).Update("status", "expired")

	if resp := postWithRefresh(t, app, "/auth/refresh", refresh); resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
}

// Replaying a spent token past the grace window is treated as theft: the
// session dies and the client's cookies are cleared.
func TestRefreshReuseEndsSessionAndClearsCookies(t *testing.T) {
	app, user := refreshApp(t)
	refresh := newSession(t, user)

	first := postWithRefresh(t, app, "/auth/refresh", refresh)
	rotated, _ := cookieValue(first, middleware.RefreshCookieName)
	database.DB.Model(&models.RefreshToken{}).
		Where("token_hash = ?", models.HashRefreshToken(refresh)).
		Update("rotated_at", time.Now().Add(-time.Hour))

	resp := postWithRefresh(t, app, "/auth/refresh", refresh)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
	if _, cleared := cookieValue(resp, middleware.RefreshCookieName); !cleared {
		t.Fatal("refresh cookie not cleared on reuse")
	}
	if _, cleared := cookieValue(resp, middleware.AuthCookieName); !cleared {
		t.Fatal("access cookie not cleared on reuse")
	}
	// The legitimate holder is signed out too — we cannot tell them apart.
	if resp := postWithRefresh(t, app, "/auth/refresh", rotated); resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("session still alive after reuse: %d", resp.StatusCode)
	}
}

// Logout must end the session server-side, not just drop the cookie — a copy
// of the refresh token taken beforehand has to stop working.
func TestLogoutRevokesTheSession(t *testing.T) {
	app, user := refreshApp(t)
	refresh := newSession(t, user)

	resp := postWithRefresh(t, app, "/auth/logout", refresh)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("logout status = %d, want 200", resp.StatusCode)
	}
	if _, cleared := cookieValue(resp, middleware.RefreshCookieName); !cleared {
		t.Fatal("logout did not clear the refresh cookie")
	}
	if resp := postWithRefresh(t, app, "/auth/refresh", refresh); resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("refresh still works after logout: %d", resp.StatusCode)
	}
}

// The refresh cookie must stay out of JavaScript's reach; it is the long-lived
// half of the credential pair.
func TestRefreshCookieIsHTTPOnly(t *testing.T) {
	app, user := refreshApp(t)
	refresh := newSession(t, user)

	resp := postWithRefresh(t, app, "/auth/refresh", refresh)
	for _, ck := range resp.Cookies() {
		if ck.Name == middleware.RefreshCookieName && !ck.HttpOnly {
			t.Fatal("refresh cookie is not httpOnly")
		}
	}
	if !strings.Contains(strings.Join(resp.Header.Values("Set-Cookie"), " "), middleware.RefreshCookieName) {
		t.Fatal("no refresh cookie in response")
	}
}
