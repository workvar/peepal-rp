package config

import (
	"net/url"
	"os"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration, loaded once at startup via Load.
type Config struct {
	Port               string
	JWTSecret          string
	DBPath             string
	SuperAdminEmail    string
	SuperAdminPassword string
	AppEnv             string
	// CORSOrigins is a comma-separated allowlist of frontend origins.
	CORSOrigins string
	// CookieSecure controls the Secure flag on the auth cookie (true in production).
	CookieSecure bool
	// CookieDomain scopes the auth cookie. Empty = host-only (correct for local
	// dev where frontend and API share "localhost"). In production set it to the
	// shared parent domain (e.g. ".workvar.com") so the cookie is readable by
	// both the frontend (roserp.workvar.com) and the API (api-roserp.workvar.com);
	// otherwise the frontend's middleware can't see it and bounces /super to login.
	CookieDomain string
	// AppBaseURL is the public base URL of the frontend, used to build links in
	// outgoing email (e.g. password-setup invites). No trailing slash.
	AppBaseURL string
	// OllamaURL is the local Ollama daemon used by Ask PeepalAI (NL→SQL).
	OllamaURL string
	// OllamaModel is the model tag Ask PeepalAI generates SQL with.
	OllamaModel string
	// AccessTokenTTL is how long a minted JWT stays valid. Kept short: a leaked
	// access token is only useful for this window, and browser sessions survive
	// it transparently by exchanging their refresh token (see RefreshTokenTTL).
	AccessTokenTTL time.Duration
	// RefreshTokenTTL is the absolute lifetime of a refresh token. Rotating a
	// token does NOT extend it past the session's original expiry window, so a
	// session cannot live forever by staying active.
	RefreshTokenTTL time.Duration
	// RefreshReuseGrace forgives a refresh token replayed within this window of
	// its rotation. Parallel tabs (or a retried request on a flaky connection)
	// routinely send the same token twice; without a grace window that race
	// would trip reuse detection and log the user out. Beyond it, a replay is
	// treated as theft and the whole session family is revoked.
	RefreshReuseGrace time.Duration
	// PushEnabled turns mobile push delivery on. Off by default and off
	// wherever it is unset, so a dev or test environment never sends a real
	// notification to a real phone by accident.
	PushEnabled bool
	// WebAuthnRPID is the domain passkeys are bound to. It must be the
	// registrable domain shared by every tenant (e.g. "roserp.workvar.com"),
	// not one tenant's host: a credential created under a subdomain is only
	// offered back to pages under the same RP ID, so scoping it per tenant
	// would strand a user's passkey the moment they moved workspaces.
	WebAuthnRPID string
	// WebAuthnRPName is the human-readable name the passkey prompt shows.
	WebAuthnRPName string
	// ExpoAccessToken authenticates against Expo's push service. Only needed
	// once push security is enabled on the Expo account; delivery works without
	// it until then.
	ExpoAccessToken string
	// PeepalAgentURL is the loopback base URL of peepal-agent's control API
	// (default http://127.0.0.1:9080). Used for on-prem update status/apply.
	PeepalAgentURL string
	// PeepalAgentToken is the Bearer token shared with peepal-agent
	// (PEEPAL_AGENT_TOKEN). Empty disables authenticated agent calls.
	PeepalAgentToken string
}

var App Config

// Load reads configuration from the environment (and .env in development).
func Load() {
	// Load .env if present (not required in production)
	_ = godotenv.Load()

	App = Config{
		Port:               getEnv("PORT", "8080"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		DBPath:             getEnv("DB_PATH", "./collegeerp.db"),
		SuperAdminEmail:    getEnv("SUPER_ADMIN_EMAIL", "superadmin@platform.com"),
		SuperAdminPassword: os.Getenv("SUPER_ADMIN_PASSWORD"),
		AppEnv:             getEnv("APP_ENV", "development"),
		CORSOrigins:        getEnv("CORS_ORIGINS", "http://localhost:3000"),
		AppBaseURL:         getEnv("APP_BASE_URL", "http://localhost:3000"),
		CookieDomain:       getEnv("COOKIE_DOMAIN", ""),
		OllamaURL:          getEnv("OLLAMA_URL", "http://localhost:11434"),
		OllamaModel:        getEnv("OLLAMA_MODEL", "llama3.1:8b"),
		AccessTokenTTL:     getDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:    getDuration("REFRESH_TOKEN_TTL", 30*24*time.Hour),
		RefreshReuseGrace:  getDuration("REFRESH_REUSE_GRACE", 30*time.Second),
		PushEnabled:        getEnv("PUSH_ENABLED", "false") == "true",
		ExpoAccessToken:    os.Getenv("EXPO_ACCESS_TOKEN"),
		WebAuthnRPID:       os.Getenv("WEBAUTHN_RP_ID"),
		WebAuthnRPName:     getEnv("WEBAUTHN_RP_NAME", "Peepal"),
		PeepalAgentURL:     getEnv("PEEPAL_AGENT_URL", "http://127.0.0.1:9080"),
		PeepalAgentToken:   os.Getenv("PEEPAL_AGENT_TOKEN"),
	}
	App.CookieSecure = App.AppEnv == "production"
	// Default the passkey domain to the app's own host. That is correct for a
	// single-host deployment and for local development; a subdomain-per-tenant
	// deployment must set WEBAUTHN_RP_ID to the shared parent explicitly.
	if App.WebAuthnRPID == "" {
		App.WebAuthnRPID = hostOf(App.AppBaseURL)
	}
}

// getDuration reads a Go duration string (e.g. "15m", "720h") from the
// environment. An unset or unparseable value falls back to the default rather
// than failing the boot — a typo must not leave the app with a zero TTL, which
// would expire every token instantly.
func getDuration(key string, fallback time.Duration) time.Duration {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	d, err := time.ParseDuration(raw)
	if err != nil || d <= 0 {
		return fallback
	}
	return d
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// hostOf extracts the hostname from a base URL, ignoring the scheme and port.
// Used to derive a default WebAuthn RP ID; an unparseable value yields an empty
// string, which the WebAuthn config validator then rejects loudly at first use
// rather than silently binding passkeys to the wrong domain.
func hostOf(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	return u.Hostname()
}
