package qrcode

import (
	"bytes"
	"image/png"
	"net/url"
	"strings"
	"testing"
)

func TestPNGDecodes(t *testing.T) {
	b, err := PNG("hello world", 200)
	if err != nil {
		t.Fatalf("PNG: %v", err)
	}
	if len(b) == 0 {
		t.Fatal("PNG: empty output")
	}
	if _, err := png.Decode(bytes.NewReader(b)); err != nil {
		t.Fatalf("PNG: not a valid image: %v", err)
	}
}

func TestPNGEmptyContent(t *testing.T) {
	if _, err := PNG("", 100); err == nil {
		t.Fatal("expected error for empty content")
	}
}

func TestCode128Decodes(t *testing.T) {
	b, err := Code128PNG("ROLL-0001", 300, 80)
	if err != nil {
		t.Fatalf("Code128PNG: %v", err)
	}
	if _, err := png.Decode(bytes.NewReader(b)); err != nil {
		t.Fatalf("Code128PNG: not a valid image: %v", err)
	}
}

func TestQRSVG(t *testing.T) {
	s, err := QRSVG("scan me", 256)
	if err != nil {
		t.Fatalf("QRSVG: %v", err)
	}
	if !strings.HasPrefix(s, "<svg") || !strings.Contains(s, "<rect") {
		t.Fatalf("QRSVG: unexpected output: %.40s", s)
	}
}

func TestSignDeterministicAnd10Chars(t *testing.T) {
	a := Sign("t1", KindInvoice, "id1")
	b := Sign("t1", KindInvoice, "id1")
	if a != b {
		t.Fatal("Sign not deterministic")
	}
	if len(a) != 10 {
		t.Fatalf("Sign length = %d, want 10", len(a))
	}
	if Sign("t2", KindInvoice, "id1") == a {
		t.Fatal("Sign should differ by tenant")
	}
}

func TestVerifyURLRoundTrips(t *testing.T) {
	raw := VerifyURL("https://app.example.com", "t1", KindLabReport, "id1")
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	q := u.Query()
	if q.Get("t") != "t1" || q.Get("k") != KindLabReport || q.Get("id") != "id1" {
		t.Fatalf("unexpected params: %v", q)
	}
	if !Verify(q.Get("t"), q.Get("k"), q.Get("id"), q.Get("s")) {
		t.Fatal("Verify failed on round trip")
	}
	if Verify("t1", KindLabReport, "id1", "deadbeef00") {
		t.Fatal("Verify should reject a bad signature")
	}
}
