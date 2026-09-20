package config

import (
	"testing"
)

func TestEnvBool(t *testing.T) {
	t.Parallel()
	for _, v := range []string{"true", "TRUE", "1", "yes", "on", "enabled"} {
		if !envBool(v) {
			t.Errorf("envBool(%q) = false, want true", v)
		}
	}
	for _, v := range []string{"", "false", "0", "no", "off", "maybe"} {
		if envBool(v) {
			t.Errorf("envBool(%q) = true, want false", v)
		}
	}
}

func TestAllowRPILocalOrigin(t *testing.T) {
	t.Parallel()
	allow := []string{
		"http://raspberrypi.local",
		"http://raspberrypi.local:8080",
		"https://raspberrypi.local",
		"http://clinic.local",
		"http://192.168.1.50",
		"http://192.168.1.50:3000",
		"http://10.0.0.2",
		"http://172.16.0.4:80",
		"http://localhost",
		"http://localhost:3000",
		"http://127.0.0.1:3001",
	}
	for _, origin := range allow {
		if !AllowRPILocalOrigin(origin) {
			t.Errorf("AllowRPILocalOrigin(%q) = false, want true", origin)
		}
	}
	deny := []string{
		"https://evil.example",
		"http://example.com",
		"http://8.8.8.8",
		"http://raspberrypi.local.attacker.com",
		"not-a-url",
		"",
	}
	for _, origin := range deny {
		if AllowRPILocalOrigin(origin) {
			t.Errorf("AllowRPILocalOrigin(%q) = true, want false", origin)
		}
	}
}

func TestApplyRPILocalRewritesLoopbackPublicURL(t *testing.T) {
	t.Parallel()
	cfg := Config{
		AppEnv:       "production",
		CookieSecure: true,
		CookieDomain: ".example.com",
		CORSOrigins:  "http://localhost",
		AppBaseURL:   "http://localhost:3000",
		WebAuthnRPID: "localhost",
		RPILocal:     true,
	}
	applyRPILocal(&cfg)
	if cfg.CookieSecure {
		t.Error("CookieSecure should be false on HTTP raspberrypi.local")
	}
	if cfg.CookieDomain != "" {
		t.Errorf("CookieDomain = %q, want empty (host-only; .local is a public suffix)", cfg.CookieDomain)
	}
	if cfg.AppBaseURL != "http://raspberrypi.local:3000" {
		t.Errorf("AppBaseURL = %q", cfg.AppBaseURL)
	}
	if cfg.WebAuthnRPID != "raspberrypi.local" {
		t.Errorf("WebAuthnRPID = %q", cfg.WebAuthnRPID)
	}
	if !containsOrigin(cfg.CORSOrigins, "http://raspberrypi.local") {
		t.Errorf("CORSOrigins missing raspberrypi.local: %q", cfg.CORSOrigins)
	}
}

func TestApplyRPILocalLeavesRealDomain(t *testing.T) {
	t.Parallel()
	cfg := Config{
		AppEnv:       "production",
		CORSOrigins:  "https://erp.college.edu",
		AppBaseURL:   "https://erp.college.edu",
		WebAuthnRPID: "erp.college.edu",
		RPILocal:     true,
	}
	applyRPILocal(&cfg)
	if cfg.AppBaseURL != "https://erp.college.edu" {
		t.Errorf("rewrote a real APP_BASE_URL: %q", cfg.AppBaseURL)
	}
	if cfg.WebAuthnRPID != "erp.college.edu" {
		t.Errorf("rewrote a real WEBAUTHN_RP_ID: %q", cfg.WebAuthnRPID)
	}
}

func TestLoadHonoursRPILocalEnable(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("RPI_LOCAL_ENABLE", "true")
	t.Setenv("CORS_ORIGINS", "http://localhost")
	t.Setenv("COOKIE_DOMAIN", "")
	t.Setenv("APP_BASE_URL", "http://localhost")
	t.Setenv("JWT_SECRET", "test-secret-at-least-32-chars-long!!")
	Load()
	if !App.RPILocal {
		t.Fatal("RPILocal not set")
	}
	if App.CookieSecure {
		t.Error("production + RPI_LOCAL_ENABLE must still send cookies over HTTP")
	}
	if App.CookieDomain != "" {
		t.Errorf("CookieDomain = %q, want empty", App.CookieDomain)
	}
	if App.AppBaseURL != "http://raspberrypi.local" {
		t.Errorf("AppBaseURL = %q", App.AppBaseURL)
	}
}

func TestLoadProductionKeepsSecureCookiesWithoutFlag(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("RPI_LOCAL_ENABLE", "false")
	t.Setenv("APP_BASE_URL", "https://erp.college.edu")
	t.Setenv("JWT_SECRET", "test-secret-at-least-32-chars-long!!")
	Load()
	if App.RPILocal {
		t.Fatal("RPILocal should be off")
	}
	if !App.CookieSecure {
		t.Error("production without the flag must keep Secure cookies")
	}
}
