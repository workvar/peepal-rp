package config

import (
	"net"
	"net/url"
	"strings"
)

// raspberryPiLocal is the default mDNS name Raspberry Pi OS advertises.
const raspberryPiLocal = "raspberrypi.local"

func sanitizeCookieDomain(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return ""
	}
	lower := strings.ToLower(strings.TrimPrefix(v, "."))
	if strings.Contains(v, "://") || strings.Contains(v, "/") {
		return ""
	}
	if strings.HasSuffix(lower, ".local") || lower == "local" {
		return ""
	}
	return v
}

func envBool(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "on", "enabled":
		return true
	}
	return false
}

func containsOrigin(list, origin string) bool {
	origin = strings.TrimRight(origin, "/")
	for _, o := range strings.Split(list, ",") {
		if strings.TrimRight(strings.TrimSpace(o), "/") == origin {
			return true
		}
	}
	return false
}

func mergeOrigins(list string, extra ...string) string {
	seen := map[string]struct{}{}
	var out []string
	add := func(raw string) {
		for _, part := range strings.Split(raw, ",") {
			o := strings.TrimRight(strings.TrimSpace(part), "/")
			if o == "" {
				continue
			}
			if _, ok := seen[o]; ok {
				continue
			}
			seen[o] = struct{}{}
			out = append(out, o)
		}
	}
	add(list)
	for _, e := range extra {
		add(e)
	}
	return strings.Join(out, ",")
}

func isLoopbackHost(host string) bool {
	h := strings.ToLower(strings.TrimSpace(host))
	if h == "" || h == "localhost" || h == "127.0.0.1" || h == "::1" || h == "[::1]" {
		return true
	}
	if ip := net.ParseIP(h); ip != nil {
		return ip.IsLoopback()
	}
	return false
}

func isLoopbackURL(raw string) bool {
	if strings.TrimSpace(raw) == "" {
		return true
	}
	u, err := url.Parse(raw)
	if err != nil || u.Hostname() == "" {
		return isLoopbackHost(raw)
	}
	return isLoopbackHost(u.Hostname())
}

func rewriteLoopbackHost(raw, host string) string {
	if strings.TrimSpace(raw) == "" {
		return "http://" + host
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" {
		return "http://" + host
	}
	port := u.Port()
	u.Host = host
	if port != "" && port != "80" && u.Scheme == "http" {
		u.Host = net.JoinHostPort(host, port)
	}
	if port == "443" && u.Scheme == "https" {
		u.Host = host
	}
	return strings.TrimRight(u.String(), "/")
}

func rpiPublicOrigins(base string) []string {
	origins := []string{"http://" + raspberryPiLocal, "https://" + raspberryPiLocal}
	u, err := url.Parse(base)
	if err == nil {
		if p := u.Port(); p != "" && p != "80" && p != "443" {
			origins = append(origins, "http://"+raspberryPiLocal+":"+p, "https://"+raspberryPiLocal+":"+p)
		}
	}
	return origins
}

// applyRPILocal makes cookies, CORS and public URLs work when the app is
// opened at http://raspberrypi.local (mDNS) over plain HTTP.
func applyRPILocal(cfg *Config) {
	if !cfg.RPILocal {
		return
	}
	// Secure cookies are dropped by the browser on http://raspberrypi.local.
	// .local is a public suffix, so a Domain attribute would also be rejected;
	// host-only cookies (empty Domain) are the ones that actually stick.
	cfg.CookieSecure = false
	cfg.CookieDomain = ""
	if isLoopbackURL(cfg.AppBaseURL) {
		cfg.AppBaseURL = rewriteLoopbackHost(cfg.AppBaseURL, raspberryPiLocal)
	}
	if isLoopbackHost(cfg.WebAuthnRPID) {
		cfg.WebAuthnRPID = raspberryPiLocal
	}
	cfg.CORSOrigins = mergeOrigins(cfg.CORSOrigins, rpiPublicOrigins(cfg.AppBaseURL)...)
}

// CORSOriginAllowed reports whether origin is on the static allowlist or, when
// RPI_LOCAL_ENABLE is on, a LAN / mDNS front door.
func CORSOriginAllowed(allowlist, origin string) bool {
	if containsOrigin(allowlist, origin) {
		return true
	}
	return AllowRPILocalOrigin(origin)
}

// AllowRPILocalOrigin reports whether origin is a LAN / mDNS front door we
// should reflect in CORS when RPI_LOCAL_ENABLE is on. Used so a renamed Pi
// (clinic.local) or a raw 192.168 address still gets the auth cookie.
func AllowRPILocalOrigin(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}
	host := u.Hostname()
	if isLoopbackHost(host) {
		return true
	}
	if strings.HasSuffix(strings.ToLower(host), ".local") {
		return true
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}
	return ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast()
}
