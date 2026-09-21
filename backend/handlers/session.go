package handlers

// session.go — the session lifecycle behind login.
//
// A session is a pair: a short-lived access token (JWT, in the peepal_token
// cookie) that every request presents, and a long-lived refresh token
// (peepal_refresh) that can mint replacements for it. Splitting them is what
// lets the access token be revocable in practice — it is never valid for long
// — while the user still stays signed in for weeks.
//
// Everything that establishes or ends a session goes through here so the two
// cookies never drift apart: login, super-admin login, impersonation, logout,
// and the refresh exchange itself.
//
// Native clients have no cookie jar. They identify themselves with the
// X-Client header and receive the same two credentials in the response body
// instead, which they store in the device keychain. The cookies are still set
// on those responses and simply ignored, so there is exactly one session code
// path rather than a parallel mobile one that could drift.

import (
	"log"
	"strings"
	"time"

	"collegeerp/config"
	"collegeerp/database"
	"collegeerp/middleware"
	"collegeerp/models"
	"collegeerp/utils"

	"github.com/gofiber/fiber/v2"
)

// sessionTokens is one established session: the short-lived access token and
// the refresh token that renews it. Handlers pass this to sessionPayload
// rather than assembling the response fields themselves, so the rule about
// which clients may see the refresh token lives in one place.
type sessionTokens struct {
	Access  string
	Refresh string
}

// bodyTokenClient reports whether the caller holds its own credentials rather
// than relying on the cookie jar.
//
// Header-driven rather than inferred from the User-Agent: a browser cannot set
// X-Client cross-origin without CORS approval, so this cannot be flipped on by
// a page the user was tricked into visiting, and the refresh token stays out of
// reach of JavaScript for every real browser session.
func bodyTokenClient(c *fiber.Ctx) bool {
	switch strings.ToLower(strings.TrimSpace(c.Get("X-Client"))) {
	case "mobile", "native", "api":
		return true
	}
	return false
}

// sessionUserMap is the user object attached to login / me / passkey / refresh
// / impersonation so every auth surface returns the same fields. tenant_type
// is included so the UI can hide education modules (Students, Fees, Academic)
// for a hospital before the terminology GraphQL query comes back.
func sessionUserMap(c *fiber.Ctx, user *models.User, tenant *models.Tenant, activeRole string) fiber.Map {
	staffEmailRequired := true
	studentEmailRequired := true
	tenantType := ""
	if tenant != nil && tenant.ID != "" {
		staffEmailRequired = tenant.StaffEmailReq()
		studentEmailRequired = tenant.StudentEmailReq()
		tenantType = string(tenant.Type.Canonical())
	}
	if activeRole == "" {
		activeRole = string(user.Role)
	}
	db := database.DB
	if c != nil {
		db = database.DB.WithContext(c.Context())
	}
	return fiber.Map{
		"id":                     user.ID,
		"name":                   user.Name,
		"email":                  user.Email,
		"role":                   activeRole,
		"base_role":              user.Role,
		"is_active":              user.IsActive,
		"tenant_id":              user.TenantID,
		"tenant_type":            tenantType,
		"photo_url":              user.PhotoURL,
		"staff_email_required":   staffEmailRequired,
		"student_email_required": studentEmailRequired,
		"workspaces":             models.UserWorkspaces(db, user),
	}
}

// sessionPayload builds the token half of an auth response. The refresh token
// is included only for clients that cannot use cookies: echoing it to a browser
// would put a weeks-long credential somewhere JavaScript can read.
func sessionPayload(c *fiber.Ctx, t sessionTokens) fiber.Map {
	out := fiber.Map{
		"token": t.Access,
		// Lets a client schedule its next refresh instead of waiting for a 401.
		"expires_in": int(accessTTL().Seconds()),
	}
	if bodyTokenClient(c) && t.Refresh != "" {
		out["refresh_token"] = t.Refresh
		out["refresh_expires_in"] = int(refreshTTL().Seconds())
	}
	return out
}

// refreshTTL mirrors the model layer's fallback so the hint sent to clients
// never disagrees with the deadline actually stored on the token.
func refreshTTL() time.Duration {
	if config.App.RefreshTokenTTL > 0 {
		return config.App.RefreshTokenTTL
	}
	return 30 * 24 * time.Hour
}

// startSession mints a brand-new session for a user and writes both cookies.
// It also returns both tokens, which the REST responses echo in their body for
// clients without a cookie jar (see sessionPayload).
func startSession(c *fiber.Ctx, user *models.User, activeRole string) (sessionTokens, error) {
	if activeRole == "" {
		activeRole = string(user.Role)
	}

	refreshPlain, refresh, err := models.IssueRefreshToken(database.DB.WithContext(c.Context()), models.RefreshTokenInput{
		UserID:     user.ID,
		TenantID:   user.TenantID,
		ActiveRole: activeRole,
		UserAgent:  c.Get("User-Agent"),
		IP:         c.IP(),
	})
	if err != nil {
		return sessionTokens{}, err
	}

	token, err := utils.GenerateAccessToken(utils.AccessTokenInput{
		UserID:     user.ID,
		Email:      user.Email,
		BaseRole:   string(user.Role),
		ActiveRole: activeRole,
		TenantID:   user.TenantID,
		SessionID:  refresh.SessionID,
	})
	if err != nil {
		// Don't leave an orphaned refresh token behind that no client holds.
		_ = models.RevokeSession(database.DB, refresh.SessionID, models.RevokeReasonSuperseded)
		return sessionTokens{}, err
	}

	setAuthCookie(c, token)
	setRefreshCookie(c, refreshPlain, refresh.ExpiresAt)

	// Opportunistic housekeeping on the cheapest possible schedule: logins are
	// infrequent, and this keeps dead rows from accumulating without a cron.
	if n, err := models.PruneRefreshTokens(database.DB); err == nil && n > 0 {
		log.Printf("[AUTH] pruned %d expired/spent refresh token(s)", n)
	}
	return sessionTokens{Access: token, Refresh: refreshPlain}, nil
}

// accessTTL is the configured access-token lifetime, with the same fallback
// the token minter uses so cookie, claim, and hint never disagree.
func accessTTL() time.Duration {
	if config.App.AccessTokenTTL > 0 {
		return config.App.AccessTokenTTL
	}
	return 15 * time.Minute
}

// accessCookieMaxAge keeps the cookie alive slightly longer than the token it
// carries. An expired-but-present cookie is useful: the client can tell "my
// session went stale, try refreshing" apart from "I was never logged in".
func accessCookieMaxAge() int {
	return int((accessTTL() + time.Hour).Seconds())
}

// setAuthCookie attaches the JWT as an httpOnly cookie so browser clients
// never need to store the token in JavaScript-accessible storage.
func setAuthCookie(c *fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     middleware.AuthCookieName,
		Value:    token,
		HTTPOnly: true,
		Secure:   config.App.CookieSecure,
		SameSite: "Lax",
		Domain:   config.App.CookieDomain,
		Path:     "/",
		MaxAge:   accessCookieMaxAge(),
	})
}

// setRefreshCookie stores the rotating refresh token. MaxAge tracks the
// session's absolute deadline, so the cookie disappears exactly when the
// server would stop honouring it.
func setRefreshCookie(c *fiber.Ctx, token string, expiresAt time.Time) {
	maxAge := int(time.Until(expiresAt).Seconds())
	if maxAge < 0 {
		maxAge = 0
	}
	c.Cookie(&fiber.Cookie{
		Name:     middleware.RefreshCookieName,
		Value:    token,
		HTTPOnly: true,
		Secure:   config.App.CookieSecure,
		SameSite: "Lax",
		Domain:   config.App.CookieDomain,
		Path:     "/",
		MaxAge:   maxAge,
	})
}

// clearSessionCookies removes both halves of the session from the browser.
// Always paired with revoking the session server-side — dropping the cookie
// alone would leave a working credential in whoever else's hands.
func clearSessionCookies(c *fiber.Ctx) {
	for _, name := range []string{middleware.AuthCookieName, middleware.RefreshCookieName} {
		c.Cookie(&fiber.Cookie{
			Name:     name,
			Value:    "",
			HTTPOnly: true,
			Secure:   config.App.CookieSecure,
			SameSite: "Lax",
			Domain:   config.App.CookieDomain,
			Path:     "/",
			MaxAge:   -1,
		})
	}
}

// Refresh exchanges a valid refresh token for a new access token, rotating the
// refresh token in the process. This is the endpoint that lets access tokens
// stay short-lived without users noticing.
//
// Every gate that guards login is re-checked here — active account, live
// subscription, role still granted — so revoking access takes effect within one
// access-token lifetime instead of waiting out a long-lived JWT.
func Refresh(c *fiber.Ctx) error {
	presented := presentedRefreshToken(c)
	if presented == "" {
		return utils.Unauthorized(c, "Session expired. Please sign in again.")
	}

	db := database.DB.WithContext(c.Context())
	nextPlain, next, err := models.RedeemRefreshToken(db, presented, c.Get("User-Agent"), c.IP())
	if err != nil {
		clearSessionCookies(c)
		if err == models.ErrRefreshReuse {
			// Worth a loud log: either a token leaked, or a client is retrying
			// far outside the grace window and needs fixing.
			log.Printf("[AUTH] refresh token reuse detected — session revoked ip=%s ua=%q", c.IP(), c.Get("User-Agent"))
		}
		switch err {
		case models.ErrRefreshInvalid, models.ErrRefreshExpired, models.ErrRefreshRevoked, models.ErrRefreshReuse:
			return utils.Unauthorized(c, "Session expired. Please sign in again.")
		default:
			log.Printf("[AUTH] refresh failed: %v", err)
			return utils.InternalError(c, "Could not refresh session")
		}
	}

	var user models.User
	if err := db.First(&user, "id = ?", next.UserID).Error; err != nil {
		_ = models.RevokeSession(db, next.SessionID, models.RevokeReasonAccountLocked)
		clearSessionCookies(c)
		return utils.Unauthorized(c, "Session expired. Please sign in again.")
	}
	if !user.IsActive {
		_ = models.RevokeSession(db, next.SessionID, models.RevokeReasonAccountLocked)
		clearSessionCookies(c)
		return utils.Unauthorized(c, "This account is no longer active.")
	}

	// Same subscription gate as login: a lapsed organisation cannot keep its
	// sessions alive by refreshing.
	if user.Role != models.RoleSuperAdmin {
		if allowed, reason := models.SubscriptionLoginAllowed(db, user.TenantID); !allowed {
			_ = models.RevokeSession(db, next.SessionID, models.RevokeReasonAccountLocked)
			clearSessionCookies(c)
			return utils.Unauthorized(c, subscriptionBlockMessage(reason))
		}
	}

	// The session may be sitting in a secondary workspace whose grant has since
	// been withdrawn. Mirrors the check in middleware.Authenticate.
	activeRole := next.ActiveRole
	if activeRole == "" {
		activeRole = string(user.Role)
	}
	if activeRole != string(user.Role) && !models.UserHoldsRole(db, &user, activeRole) {
		_ = models.RevokeSession(db, next.SessionID, models.RevokeReasonAccountLocked)
		clearSessionCookies(c)
		return utils.Unauthorized(c, "This workspace is no longer available. Please sign in again.")
	}

	token, err := utils.GenerateAccessToken(utils.AccessTokenInput{
		UserID:     user.ID,
		Email:      user.Email,
		BaseRole:   string(user.Role),
		ActiveRole: activeRole,
		TenantID:   user.TenantID,
		SessionID:  next.SessionID,
	})
	if err != nil {
		return utils.InternalError(c, "Could not refresh session")
	}

	setAuthCookie(c, token)
	setRefreshCookie(c, nextPlain, next.ExpiresAt)

	// Rotation means the token just presented is now spent. A cookie client is
	// handed its successor automatically above; a body-token client must be
	// given it here or its next refresh trips the reuse detector and kills the
	// session it was trying to keep alive.
	payload := sessionPayload(c, sessionTokens{Access: token, Refresh: nextPlain})
	var tenant models.Tenant
	var tenantPtr *models.Tenant
	if err := db.First(&tenant, "id = ?", user.TenantID).Error; err == nil {
		tenantPtr = &tenant
	}
	payload["user"] = sessionUserMap(c, &user, tenantPtr, activeRole)
	return utils.OK(c, payload, "Session refreshed")
}

// presentedRefreshToken pulls the refresh token off a request, in the order
// browser-then-native: the cookie, then the X-Refresh-Token header, then a
// JSON body field. Native clients hold the token themselves and get no cookie
// jar, so every endpoint that consumes one goes through here.
func presentedRefreshToken(c *fiber.Ctx) string {
	if v := c.Cookies(middleware.RefreshCookieName); v != "" {
		return v
	}
	if v := strings.TrimSpace(c.Get("X-Refresh-Token")); v != "" {
		return v
	}
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&body); err == nil {
		return strings.TrimSpace(body.RefreshToken)
	}
	return ""
}

// currentSessionID resolves the session behind the request: from the access
// token's claims when the caller is authenticated, otherwise from the refresh
// cookie. Logout needs the second path because it runs unauthenticated — an
// expired access token must still be able to end its session.
func currentSessionID(c *fiber.Ctx) string {
	if sid, ok := c.Locals("sessionID").(string); ok && sid != "" {
		return sid
	}
	if token := c.Cookies(middleware.AuthCookieName); token != "" {
		if claims, err := utils.ParseToken(token); err == nil && claims.SessionID != "" {
			return claims.SessionID
		}
	}
	if presented := presentedRefreshToken(c); presented != "" && database.DB != nil {
		var rt models.RefreshToken
		if err := database.DB.Where("token_hash = ?", models.HashRefreshToken(presented)).First(&rt).Error; err == nil {
			return rt.SessionID
		}
	}
	return ""
}
