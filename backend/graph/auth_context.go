package graph

import "context"

type contextKey string

const authKey contextKey = "gqlAuthContext"

// AuthContext holds the authenticated user's claims for a single request.
// Populated by injectAuthContext from Fiber locals set by middleware.Authenticate.
type AuthContext struct {
	UserID       string
	Email        string
	Role         string
	TenantID     string
	IsSuperAdmin bool
	// SessionID identifies the refresh-token family behind this access token.
	// Carried so a resolver can tell the caller's own session apart from their
	// other ones — "sign out everywhere else" needs to know what "else" means.
	SessionID string
}

// injectAuthContext reads Fiber locals (accessible via fasthttp.RequestCtx.Value)
// and re-injects them as a typed AuthContext under a safe typed key.
// Call this inside an AroundOperations gqlgen middleware.
func injectAuthContext(ctx context.Context) context.Context {
	auth := AuthContext{
		UserID:       stringVal(ctx, "userID"),
		Email:        stringVal(ctx, "email"),
		Role:         stringVal(ctx, "role"),
		TenantID:     stringVal(ctx, "tenantID"),
		IsSuperAdmin: boolVal(ctx, "isSuperAdmin"),
		SessionID:    stringVal(ctx, "sessionID"),
	}
	return context.WithValue(ctx, authKey, auth)
}

// AuthFromCtx retrieves the AuthContext from a resolver context.
// Returns a zero-value AuthContext if not set (unauthenticated request).
func AuthFromCtx(ctx context.Context) AuthContext {
	if auth, ok := ctx.Value(authKey).(AuthContext); ok {
		return auth
	}
	return AuthContext{}
}

func stringVal(ctx context.Context, key string) string {
	if v, ok := ctx.Value(key).(string); ok {
		return v
	}
	return ""
}

func boolVal(ctx context.Context, key string) bool {
	if v, ok := ctx.Value(key).(bool); ok {
		return v
	}
	return false
}

// TestAuthKey exposes the typed context key so resolver tests can inject a pre-built AuthContext.
var TestAuthKey = authKey
