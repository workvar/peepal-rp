package mailer

import (
	"bytes"
	"fmt"
	"mime"
	"time"
)

// buildMIME assembles a minimal multipart/alternative message (plain + HTML).
// Headers are kept simple; addresses are assumed already validated upstream.
func buildMIME(cfg SMTPConfig, toEmail, toName, subject, textBody, htmlBody string) []byte {
	const boundary = "peepal-alt-boundary-7c2f"
	var b bytes.Buffer

	from := cfg.FromEmail
	if cfg.FromName != "" {
		from = fmt.Sprintf("%s <%s>", mime.QEncoding.Encode("utf-8", cfg.FromName), cfg.FromEmail)
	}
	to := toEmail
	if toName != "" {
		to = fmt.Sprintf("%s <%s>", mime.QEncoding.Encode("utf-8", toName), toEmail)
	}

	fmt.Fprintf(&b, "From: %s\r\n", from)
	fmt.Fprintf(&b, "To: %s\r\n", to)
	fmt.Fprintf(&b, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", subject))
	fmt.Fprintf(&b, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	b.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&b, "Content-Type: multipart/alternative; boundary=%q\r\n\r\n", boundary)

	if textBody == "" {
		textBody = "Open this email in an HTML-capable client to continue."
	}
	fmt.Fprintf(&b, "--%s\r\n", boundary)
	b.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n\r\n")
	b.WriteString(textBody)
	b.WriteString("\r\n\r\n")

	fmt.Fprintf(&b, "--%s\r\n", boundary)
	b.WriteString("Content-Type: text/html; charset=\"utf-8\"\r\n\r\n")
	b.WriteString(htmlBody)
	b.WriteString("\r\n\r\n")

	fmt.Fprintf(&b, "--%s--\r\n", boundary)
	return b.Bytes()
}
