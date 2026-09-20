package mailer

import (
	"strings"
	"testing"

	"collegeerp/config"
)

func TestBuildAcceptURL(t *testing.T) {
	config.App.AppBaseURL = "https://app.example.com/" // trailing slash trimmed
	got := BuildAcceptURL("acme", "tok123")
	want := "https://app.example.com/acme/accept-invite?token=tok123"
	if got != want {
		t.Fatalf("BuildAcceptURL = %q, want %q", got, want)
	}
}

func TestBuildMIMEStructure(t *testing.T) {
	cfg := SMTPConfig{FromEmail: "no-reply@example.com", FromName: "Peepal"}
	out := string(buildMIME(cfg, "to@example.com", "Jane", "Hello", "plain body", "<p>html body</p>"))

	for _, want := range []string{
		"From: ",
		"To: ",
		"Subject: ",
		"multipart/alternative",
		"text/plain",
		"text/html",
		"plain body",
		"<p>html body</p>",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("MIME output missing %q", want)
		}
	}
}

func TestSendNoTransport(t *testing.T) {
	// An empty host must surface ErrNoTransport rather than dialing.
	if err := Send(SMTPConfig{FromEmail: "a@b.com"}, "to@b.com", "", "s", "t", "h"); err != ErrNoTransport {
		t.Fatalf("expected ErrNoTransport, got %v", err)
	}
}
