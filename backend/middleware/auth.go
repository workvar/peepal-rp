package middleware

import (
	"collegeerp/database"
	"collegeerp/models"
	"collegeerp/utils"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// AuthCookieName is the httpOnly cookie that carries the JWT for browser clients.
// The Authorization header is still accepted for API clients and tests.
const AuthCookieName = "peepal_token"

// RefreshCookieName carries the long-lived refresh token. It is kept separate
// from the access-token cookie so the two can have different lifetimes, and it
// is httpOnly for the same reason: JavaScript must never be able to read the
// credential that can mint new sessions.
//
// Path is "/" rather than the refresh endpoint alone because the Next.js
// middleware reads it on page requests to decide whether a visitor still has a
// session worth refreshing; a path-scoped cookie would not be sent there.
const RefreshCookieName = "peepal_refresh"

// extractToken returns the JWT from the Authorization header (preferred) or
// the auth cookie. Returns "" when neither is present.
func extractToken(c *fiber.Ctx) string {
	if authHeader := c.Get("Authorization"); authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
		return ""
	}
	return c.Cookies(AuthCookieName)
}

// Authenticate validates the JWT (header or cookie) and sets user claims in locals.
func Authenticate(c *fiber.Ctx) error {
	token := extractToken(c)
	if token == "" {
		return utils.Unauthorized(c, "Authentication required")
	}

	claims, err := utils.ParseToken(token)
	if err != nil {
		return utils.Unauthorized(c, "Invalid or expired token")
	}

	c.Locals("userID", claims.UserID)
	c.Locals("email", claims.Email)
	c.Locals("role", claims.Role)
	// baseRole is the primary role; role is the active workspace. Older tokens
	// minted before workspaces existed carry no base_role — fall back to role.
	baseRole := claims.BaseRole
	if baseRole == "" {
		baseRole = claims.Role
	}
	c.Locals("baseRole", baseRole)
	c.Locals("tenantID", claims.TenantID)
	c.Locals("isSuperAdmin", claims.IsSuperAdmin)
	// sessionID links this access token to its refresh-token family, so logout
	// and workspace switches can act on the session itself. Empty for tokens
	// minted before refresh tokens existed and for header-only API clients.
	c.Locals("sessionID", claims.SessionID)

	// Revocation check for switched sessions. Access tokens are short-lived and
	// a refresh re-checks the grant, but an admin revoking someone's extra
	// workspace should not have to wait even that long. Only sessions actually
	// sitting in a non-primary workspace pay for the lookup, which is the rare
	// case.
	if claims.Role != baseRole {
		if !stillHoldsRole(claims.UserID, claims.TenantID, claims.Role) {
			return utils.Forbidden(c, "This workspace is no longer available. Please sign in again.")
		}
	}
	return c.Next()
}

// stillHoldsRole reports whether the user still has an active grant for the
// workspace their token is switched into.
func stillHoldsRole(userID, tenantID, role string) bool {
	if database.DB == nil {
		return true // no DB wired (tests): fall back to trusting the token
	}
	var count int64
	database.DB.Model(&models.UserRole{}).
		Where("user_id = ? AND tenant_id = ? AND role = ?", userID, tenantID, role).
		Count(&count)
	return count > 0
}

// RequireRole checks if the authenticated user has one of the allowed roles.
func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role").(string)
		if !ok {
			return utils.Unauthorized(c, "Not authenticated")
		}
		for _, r := range roles {
			if role == r {
				return c.Next()
			}
		}
		return utils.Forbidden(c, "Insufficient permissions")
	}
}

// RefreshRateLimiter throttles the token-exchange endpoint. The limit is
// generous because a legitimate client refreshes once per access-token expiry
// (and briefly more when several tabs wake at once), but it still caps how fast
// a stolen cookie can be probed.
func RefreshRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        60,
		Expiration: time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return utils.TooManyRequests(c, "Too many token refreshes. Try again in a minute.")
		},
	})
}

// PINRateLimiter throttles the PIN step of a passkey login.
//
// A six-digit PIN is only a million values, so the throttle is the thing
// protecting it rather than its length. The per-account lockout in the model
// layer is the primary bound; this one is per IP, so a single host cannot make
// up the difference by spreading its guesses across many accounts.
func PINRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        10,
		Expiration: time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return utils.TooManyRequests(c, "Too many PIN attempts. Try again in a minute.")
		},
	})
}

// LoginRateLimiter throttles credential-guessing attempts on the login
// endpoint: max 10 attempts per IP per minute.
func LoginRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        10,
		Expiration: time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return utils.TooManyRequests(c, "Too many login attempts. Try again in a minute.")
		},
	})
}
