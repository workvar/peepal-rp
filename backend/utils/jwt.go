package utils

import (
	"collegeerp/config"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	// Role is the ACTIVE role — the workspace the user is currently in. Every
	// permission check in the app reads this, so switching workspaces is
	// entirely a matter of re-minting the token with a different value here.
	Role string `json:"role"`
	// BaseRole is the user's primary role (User.Role). It never changes on a
	// workspace switch and is what IsSuperAdmin is derived from, so a switch can
	// only ever narrow privileges, never widen them.
	BaseRole     string `json:"base_role,omitempty"`
	TenantID     string `json:"tenant_id"`
	IsSuperAdmin bool   `json:"is_super_admin"`
	// SessionID ties this access token back to its refresh-token family
	// (models.RefreshToken.SessionID). It lets logout and workspace switches
	// act on the session without the refresh cookie being on the request, and
	// it is what makes an otherwise unrevocable JWT traceable to a revocable
	// session. Empty on tokens minted before refresh tokens existed, and on
	// header-only API clients that never established a session.
	SessionID string `json:"sid,omitempty"`
	jwt.RegisteredClaims
}

// defaultAccessTTL backs a missing or invalid ACCESS_TOKEN_TTL. Deliberately
// short: an access token cannot be revoked once minted, so its lifetime is the
// entire blast radius of a leak.
const defaultAccessTTL = 15 * time.Minute

// AccessTokenInput describes one access token. BaseRole is the user's primary
// role and ActiveRole the workspace they are currently in; see JWTClaims.
type AccessTokenInput struct {
	UserID     string
	Email      string
	BaseRole   string
	ActiveRole string
	TenantID   string
	SessionID  string
	// TTL overrides the configured access-token lifetime. Zero means "use the
	// configured value"; only special cases (tests, one-off tokens) set it.
	TTL time.Duration
}

// accessTTL resolves the configured lifetime, falling back to the default when
// config was never loaded (tests) or holds a nonsense value.
func accessTTL() time.Duration {
	if config.App.AccessTokenTTL > 0 {
		return config.App.AccessTokenTTL
	}
	return defaultAccessTTL
}

// GenerateToken mints a token whose active role equals the user's primary role.
// This is the normal login path.
func GenerateToken(userID, email, role, tenantID string) (string, error) {
	return GenerateTokenForRole(userID, email, role, role, tenantID)
}

// GenerateTokenForRole mints a token for a specific active workspace.
// baseRole is always the user's primary role; activeRole is the workspace they
// are entering. Callers MUST verify the user actually holds activeRole first
// (see models.UserHoldsRole).
func GenerateTokenForRole(userID, email, baseRole, activeRole, tenantID string) (string, error) {
	return GenerateAccessToken(AccessTokenInput{
		UserID:     userID,
		Email:      email,
		BaseRole:   baseRole,
		ActiveRole: activeRole,
		TenantID:   tenantID,
	})
}

// GenerateAccessToken mints a short-lived access token. Sessions outlive it by
// exchanging a refresh token (see models.RefreshToken); pass the SessionID so
// the two stay linked.
func GenerateAccessToken(in AccessTokenInput) (string, error) {
	activeRole := in.ActiveRole
	if activeRole == "" {
		activeRole = in.BaseRole
	}
	ttl := in.TTL
	if ttl == 0 {
		ttl = accessTTL()
	}
	claims := JWTClaims{
		UserID:   in.UserID,
		Email:    in.Email,
		Role:     activeRole,
		BaseRole: in.BaseRole,
		TenantID: in.TenantID,
		// Derived from the primary role only: switching workspaces can never
		// grant platform super-admin.
		IsSuperAdmin: in.BaseRole == "super_admin",
		SessionID:    in.SessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.App.JWTSecret))
}

func ParseToken(tokenStr string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(config.App.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
