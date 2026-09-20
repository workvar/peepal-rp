package mailer

// SendTest delivers a short verification message so an admin can confirm their
// SMTP settings work end to end.
func SendTest(cfg SMTPConfig, toEmail string) error {
	subject := "Peepal email test"
	text := "This is a test message from Peepal. If you received it, your email settings are working."
	htmlBody := `<div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;color:#374151">
<p>This is a test message from <strong>Peepal</strong>.</p>
<p>If you received it, your email settings are working. 🎉</p></div>`
	return Send(cfg, toEmail, "", subject, text, htmlBody)
}
