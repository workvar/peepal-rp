package invites

import "testing"

func TestHashTokenDeterministicAndDistinct(t *testing.T) {
	a := HashToken("abc")
	if a != HashToken("abc") {
		t.Fatal("HashToken should be deterministic")
	}
	if len(a) != 64 {
		t.Fatalf("expected 64-hex sha256, got %d chars", len(a))
	}
	if HashToken("abc") == HashToken("abd") {
		t.Fatal("different inputs must hash differently")
	}
}

func TestNewTokenRandomAndHashed(t *testing.T) {
	raw1, h1, err := newToken()
	if err != nil {
		t.Fatalf("newToken error: %v", err)
	}
	raw2, h2, _ := newToken()

	if raw1 == raw2 {
		t.Fatal("tokens must be unique")
	}
	if h1 == h2 {
		t.Fatal("hashes of distinct tokens must differ")
	}
	if HashToken(raw1) != h1 {
		t.Fatal("returned hash must equal HashToken(raw)")
	}
	if len(raw1) != 64 {
		t.Fatalf("expected 32-byte hex token, got %d chars", len(raw1))
	}
}
