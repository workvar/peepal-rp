package dbsetup

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"time"
)

// ValidateURI rejects the connection strings that would otherwise fail deep
// inside the backend on first boot, where the operator never sees them.
func ValidateURI(raw string) error {
	if raw == "" {
		return fmt.Errorf("the database URI is empty")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("the database URI could not be parsed: %w", err)
	}
	switch u.Scheme {
	case "postgres", "postgresql":
	default:
		return fmt.Errorf("expected a postgres:// URI, got %q", u.Scheme)
	}
	if u.Host == "" {
		return fmt.Errorf("the database URI has no host")
	}
	if u.User == nil || u.User.Username() == "" {
		return fmt.Errorf("the database URI has no username")
	}
	if len(u.Path) < 2 {
		return fmt.Errorf("the database URI has no database name")
	}
	return nil
}

// Reachable opens a TCP connection to the URI's host, which catches the
// common mistakes (wrong host, blocked port, firewall) in a second rather
// than at first login. It deliberately does not authenticate: that needs a
// driver, and a failed handshake here would be indistinguishable from a
// typo in the password.
func Reachable(ctx context.Context, raw string, timeout time.Duration) error {
	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	host, port := u.Hostname(), u.Port()
	if port == "" {
		port = "5432"
	}
	d := net.Dialer{Timeout: timeout}
	conn, err := d.DialContext(ctx, "tcp", net.JoinHostPort(host, port))
	if err != nil {
		return fmt.Errorf("cannot reach %s:%s: %w", host, port, err)
	}
	return conn.Close()
}

// Redact hides the password so a URI can be logged or shown in the panel.
func Redact(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || u.User == nil {
		return raw
	}
	if _, ok := u.User.Password(); ok {
		u.User = url.UserPassword(u.User.Username(), "****")
	}
	return u.String()
}

// HostPort splits a URI for display in the panel's database card.
func HostPort(raw string) (string, int) {
	u, err := url.Parse(raw)
	if err != nil {
		return "", 0
	}
	p, _ := strconv.Atoi(u.Port())
	if p == 0 {
		p = 5432
	}
	return u.Hostname(), p
}
