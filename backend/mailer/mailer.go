// Package mailer is the outbound e-mail transport. It resolves which SMTP
// settings apply to a tenant (own settings, else the platform fallback) and
// sends MIME messages. It deliberately knows nothing about invites or any
// other feature — callers compose the subject/body and hand it over.
package mailer

import (
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"time"
)

// ErrNoTransport means no usable SMTP settings were found for the scope, so
// nothing could be sent. Callers typically treat this as "delivery skipped"
// rather than a hard error (e.g. surface a copyable link to the admin instead).
var ErrNoTransport = errors.New("no email transport configured")

// SMTPConfig is a flattened, ready-to-use transport derived from EmailSettings.
type SMTPConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	FromName  string
	FromEmail string
	UseTLS    bool // implicit TLS (465); otherwise STARTTLS is attempted
}

const dialTimeout = 12 * time.Second

// Send delivers one message to a single recipient. It opens its own connection
// each call (invites are low volume), upgrades to TLS, authenticates when a
// username is set, and writes a multipart/alternative body.
func Send(cfg SMTPConfig, toEmail, toName, subject, textBody, htmlBody string) error {
	if cfg.Host == "" || cfg.FromEmail == "" {
		return ErrNoTransport
	}
	addr := net.JoinHostPort(cfg.Host, fmt.Sprintf("%d", cfg.Port))

	conn, err := dial(addr, cfg.Host, cfg.UseTLS)
	if err != nil {
		return fmt.Errorf("connect to smtp: %w", err)
	}
	// Close the raw socket on every return path (including a STARTTLS failure
	// before the client owns it). Double-close after client.Close() is harmless.
	defer conn.Close()
	client, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		return fmt.Errorf("smtp handshake: %w", err)
	}
	defer client.Close()

	// STARTTLS upgrade when we are not already on an implicit-TLS socket.
	if !cfg.UseTLS {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(&tls.Config{ServerName: cfg.Host}); err != nil {
				return fmt.Errorf("starttls: %w", err)
			}
		}
	}

	if cfg.Username != "" {
		auth := smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}

	if err := client.Mail(cfg.FromEmail); err != nil {
		return fmt.Errorf("smtp from: %w", err)
	}
	if err := client.Rcpt(toEmail); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err := w.Write(buildMIME(cfg, toEmail, toName, subject, textBody, htmlBody)); err != nil {
		return fmt.Errorf("smtp write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp close body: %w", err)
	}
	return client.Quit()
}

// dial opens a TCP (or implicit-TLS) connection with a bounded timeout so a
// dead SMTP host can never hang an HTTP request indefinitely.
func dial(addr, host string, implicitTLS bool) (net.Conn, error) {
	d := &net.Dialer{Timeout: dialTimeout}
	if implicitTLS {
		return tls.DialWithDialer(d, "tcp", addr, &tls.Config{ServerName: host})
	}
	return d.Dial("tcp", addr)
}
