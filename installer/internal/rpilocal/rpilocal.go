package rpilocal

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
)

// Host is the default mDNS name Raspberry Pi OS advertises via Avahi.
const Host = "raspberrypi.local"

const deviceModelPath = "/proc/device-tree/model"

// Detected reports whether this machine is a Raspberry Pi, so LAN login at
// http://raspberrypi.local can be turned on without asking the operator.
func Detected() bool {
	return detectedFrom(deviceModelPath)
}

func detectedFrom(path string) bool {
	b, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(string(b)), "raspberry pi")
}

// Enabled reports whether a .env flag value turns on raspberrypi.local mode.
func Enabled(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "on", "enabled":
		return true
	}
	return false
}

// PublicURL is the address people type into a browser on the LAN.
func PublicURL(httpPort int) string {
	if httpPort == 0 || httpPort == 80 {
		return "http://" + Host
	}
	return fmt.Sprintf("http://%s:%d", Host, httpPort)
}

func localhostOrigin(httpPort int) string {
	if httpPort == 0 || httpPort == 80 {
		return "http://localhost"
	}
	return fmt.Sprintf("http://localhost:%d", httpPort)
}

// Apply writes cookie/CORS/public-URL values so login works at
// http://raspberrypi.local. No-op when RPI_LOCAL_ENABLE is not set.
//
// Cookies stay host-only (COOKIE_DOMAIN empty): .local is a public suffix, so
// a Domain attribute is rejected and login appears to succeed then bounce.
// Secure is left to the backend, which turns it off when this flag is on so
// the cookie is stored on HTTP.
func Apply(vars map[string]string, httpPort int) {
	if !Enabled(vars["RPI_LOCAL_ENABLE"]) {
		return
	}
	vars["RPI_LOCAL_ENABLE"] = "true"
	vars["COOKIE_DOMAIN"] = ""

	public := PublicURL(httpPort)
	extras := []string{localhostOrigin(httpPort), public}
	extras = append(extras, lanOrigins(httpPort)...)
	vars["CORS_ORIGINS"] = mergeOrigins(vars["CORS_ORIGINS"], extras...)

	if isLoopbackURL(vars["APP_BASE_URL"]) {
		vars["APP_BASE_URL"] = public
	}
	if isLoopbackHost(vars["WEBAUTHN_RP_ID"]) {
		vars["WEBAUTHN_RP_ID"] = Host
	}
}

// SanitizeCookieDomain drops values browsers will reject: a pasted URL, or
// anything under .local (a public suffix). Empty means host-only cookies.
func SanitizeCookieDomain(v string) string {
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

func lanOrigins(httpPort int) []string {
	host, _ := os.Hostname()
	addrs, _ := net.InterfaceAddrs()
	return lanOriginsFrom(httpPort, host, addrs)
}

func lanOriginsFrom(httpPort int, hostname string, addrs []net.Addr) []string {
	var extra []string
	h := strings.ToLower(strings.TrimSuffix(strings.TrimSpace(hostname), "."))
	if h != "" && h != "localhost" && !isLoopbackHost(h) {
		if !strings.Contains(h, ".") {
			h += ".local"
		}
		if strings.HasSuffix(h, ".local") {
			extra = append(extra, originForHost(h, httpPort))
		}
	}
	for _, a := range addrs {
		ipn, ok := a.(*net.IPNet)
		if !ok || ipn.IP == nil || ipn.IP.IsLoopback() {
			continue
		}
		ip := ipn.IP.To4()
		if ip == nil || !ip.IsPrivate() {
			continue
		}
		extra = append(extra, originForHost(ip.String(), httpPort))
	}
	return extra
}

func originForHost(host string, httpPort int) string {
	if httpPort == 0 || httpPort == 80 {
		return "http://" + host
	}
	return "http://" + net.JoinHostPort(host, strconv.Itoa(httpPort))
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
