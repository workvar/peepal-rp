package pgsql

import "testing"

func TestValidDBName(t *testing.T) {
	t.Parallel()
	ok := []string{"peepal", "peepal2", "peepal_2", "a", "_tmp"}
	for _, n := range ok {
		if !ValidDBName(n) {
			t.Errorf("ValidDBName(%q) = false, want true", n)
		}
	}
	bad := []string{"", "Peepal", "2peepal", "peepal-2", "postgres", "template0", "template1", "has space", "http://x"}
	for _, n := range bad {
		if ValidDBName(n) {
			t.Errorf("ValidDBName(%q) = true, want false", n)
		}
	}
	if ValidDBName(stringsOf('a', 64)) {
		t.Error("63-char limit")
	}
}

func TestSuggestNextDBName(t *testing.T) {
	t.Parallel()
	cases := map[string]string{
		"peepal":  "peepal2",
		"peepal2": "peepal3",
		"clinic":  "clinic2",
		"":        "peepal2",
		"Peepal":  "peepal2",
	}
	for in, want := range cases {
		if got := SuggestNextDBName(in); got != want {
			t.Errorf("SuggestNextDBName(%q) = %q, want %q", in, got, want)
		}
	}
}

func stringsOf(r rune, n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = byte(r)
	}
	return string(b)
}
