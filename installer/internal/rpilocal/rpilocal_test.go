package rpilocal

import (
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDetectedFromPiModel(t *testing.T) {
	t.Parallel()
	path := filepath.Join(t.TempDir(), "model")
	if err := os.WriteFile(path, []byte("Raspberry Pi 5 Model B Rev 1.0\x00"), 0o644); err != nil {
		t.Fatal(err)
	}
	if !detectedFrom(path) {
		t.Fatal("Raspberry Pi device-tree model should enable LAN mode")
	}
}

func TestDetectedFromOtherBoard(t *testing.T) {
	t.Parallel()
	path := filepath.Join(t.TempDir(), "model")
	if err := os.WriteFile(path, []byte("Generic ARM board"), 0o644); err != nil {
		t.Fatal(err)
	}
	if detectedFrom(path) {
		t.Fatal("non-Pi model must not enable LAN mode")
	}
}

func TestDetectedFromMissingFile(t *testing.T) {
	t.Parallel()
	if detectedFrom(filepath.Join(t.TempDir(), "nope")) {
		t.Fatal("missing model file is not a Pi")
	}
}

func TestEnabled(t *testing.T) {
	t.Parallel()
	if !Enabled("true") || !Enabled("YES") || !Enabled("1") {
		t.Fatal("true-like values should enable")
	}
	if Enabled("") || Enabled("false") || Enabled("no") {
		t.Fatal("false-like values should not enable")
	}
}

func TestPublicURL(t *testing.T) {
	t.Parallel()
	if got := PublicURL(80); got != "http://raspberrypi.local" {
		t.Errorf("port 80 = %q", got)
	}
	if got := PublicURL(8080); got != "http://raspberrypi.local:8080" {
		t.Errorf("port 8080 = %q", got)
	}
}

func TestApplyNoopWhenDisabled(t *testing.T) {
	t.Parallel()
	vars := map[string]string{
		"CORS_ORIGINS":  "http://localhost",
		"COOKIE_DOMAIN": "",
		"APP_BASE_URL":  "http://localhost",
	}
	Apply(vars, 80)
	if vars["CORS_ORIGINS"] != "http://localhost" {
		t.Errorf("CORS changed while disabled: %q", vars["CORS_ORIGINS"])
	}
	if vars["APP_BASE_URL"] != "http://localhost" {
		t.Errorf("APP_BASE_URL changed while disabled: %q", vars["APP_BASE_URL"])
	}
}

func TestApplySetsCookieSafeLANOrigins(t *testing.T) {
	t.Parallel()
	vars := map[string]string{
		"RPI_LOCAL_ENABLE": "true",
		"CORS_ORIGINS":     "http://localhost",
		"COOKIE_DOMAIN":    ".workvar.com",
		"APP_BASE_URL":     "http://localhost",
		"WEBAUTHN_RP_ID":   "localhost",
	}
	Apply(vars, 80)
	if vars["COOKIE_DOMAIN"] != "" {
		t.Errorf("COOKIE_DOMAIN = %q, want empty (host-only cookies on raspberrypi.local)", vars["COOKIE_DOMAIN"])
	}
	if vars["APP_BASE_URL"] != "http://raspberrypi.local" {
		t.Errorf("APP_BASE_URL = %q", vars["APP_BASE_URL"])
	}
	if vars["WEBAUTHN_RP_ID"] != Host {
		t.Errorf("WEBAUTHN_RP_ID = %q", vars["WEBAUTHN_RP_ID"])
	}
	cors := vars["CORS_ORIGINS"]
	for _, want := range []string{"http://localhost", "http://raspberrypi.local"} {
		if !strings.Contains(cors, want) {
			t.Errorf("CORS_ORIGINS %q missing %q", cors, want)
		}
	}
}

func TestApplyNonDefaultPort(t *testing.T) {
	t.Parallel()
	vars := map[string]string{
		"RPI_LOCAL_ENABLE": "true",
		"CORS_ORIGINS":     "http://localhost:8080",
	}
	Apply(vars, 8080)
	if vars["APP_BASE_URL"] != "http://raspberrypi.local:8080" {
		t.Errorf("APP_BASE_URL = %q", vars["APP_BASE_URL"])
	}
	if !strings.Contains(vars["CORS_ORIGINS"], "http://raspberrypi.local:8080") {
		t.Errorf("CORS_ORIGINS = %q", vars["CORS_ORIGINS"])
	}
}

func TestApplyDoesNotClobberCustomPublicURL(t *testing.T) {
	t.Parallel()
	vars := map[string]string{
		"RPI_LOCAL_ENABLE": "true",
		"APP_BASE_URL":     "https://erp.college.edu",
		"WEBAUTHN_RP_ID":   "erp.college.edu",
		"CORS_ORIGINS":     "https://erp.college.edu",
	}
	Apply(vars, 80)
	if vars["APP_BASE_URL"] != "https://erp.college.edu" {
		t.Errorf("rewrote custom APP_BASE_URL: %q", vars["APP_BASE_URL"])
	}
	if !strings.Contains(vars["CORS_ORIGINS"], "http://raspberrypi.local") {
		t.Errorf("still need the mDNS origin alongside the custom one: %q", vars["CORS_ORIGINS"])
	}
}

func TestSanitizeCookieDomain(t *testing.T) {
	t.Parallel()
	cases := map[string]string{
		"":                          "",
		".workvar.com":              ".workvar.com",
		"erp.college.edu":           "erp.college.edu",
		"http://raspberrypi.local":  "",
		"https://raspberrypi.local": "",
		"raspberrypi.local":         "",
		".local":                    "",
		"clinic.local":              "",
	}
	for in, want := range cases {
		if got := SanitizeCookieDomain(in); got != want {
			t.Errorf("SanitizeCookieDomain(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestLanOriginsFromHostnameAndPrivateIP(t *testing.T) {
	t.Parallel()
	addrs := []net.Addr{
		&net.IPNet{IP: net.ParseIP("127.0.0.1"), Mask: net.CIDRMask(8, 32)},
		&net.IPNet{IP: net.ParseIP("192.168.1.50"), Mask: net.CIDRMask(24, 32)},
		&net.IPNet{IP: net.ParseIP("8.8.8.8"), Mask: net.CIDRMask(32, 32)},
	}
	got := strings.Join(lanOriginsFrom(80, "raspberrypi", addrs), ",")
	if !strings.Contains(got, "http://raspberrypi.local") {
		t.Errorf("missing hostname.local: %q", got)
	}
	if !strings.Contains(got, "http://192.168.1.50") {
		t.Errorf("missing LAN IP: %q", got)
	}
	if strings.Contains(got, "8.8.8.8") || strings.Contains(got, "127.0.0.1") {
		t.Errorf("public/loopback leaked: %q", got)
	}
	gotPort := strings.Join(lanOriginsFrom(8080, "clinic.local", addrs), ",")
	if !strings.Contains(gotPort, "http://clinic.local:8080") {
		t.Errorf("missing renamed .local with port: %q", gotPort)
	}
}
