package semver

import "testing"

func TestNewer(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"v1.2.3", "v1.2.2", true},
		{"v1.2.3", "v1.2.3", false},
		{"v1.3.0", "v1.2.99", true},
		{"v2.0.0", "v10.0.0", false},
		{"v1.0.0", "", true},            // nothing installed yet
		{"v1.0.0", "v1.0.0-rc.1", true}, // release beats its own prerelease
		{"v1.0.0-rc.1", "v1.0.0", false},
		{"1.4", "1.3.9", true}, // two-component tags
	}
	for _, c := range cases {
		if got := Newer(c.a, c.b); got != c.want {
			t.Errorf("Newer(%q, %q) = %v, want %v", c.a, c.b, got, c.want)
		}
	}
}

func TestParseIgnoresJunk(t *testing.T) {
	v := Parse("v3.1.4-beta.2+build9")
	if v.Major != 3 || v.Minor != 1 || v.Patch != 4 || !v.IsPre() {
		t.Fatalf("unexpected parse: %+v", v)
	}
}

func TestLatestPicksTheHighestRelease(t *testing.T) {
	tags := []string{"v1.0.0", "v1.2.0", "v1.10.0", "v1.3.0", "nightly", "stable"}
	if got := Latest(tags, false); got != "v1.10.0" {
		t.Errorf("Latest = %q, want v1.10.0 (10 > 3 numerically, not alphabetically)", got)
	}
}

func TestLatestSkipsPrereleasesUnlessAsked(t *testing.T) {
	tags := []string{"v1.0.0", "v2.0.0-rc1"}
	if got := Latest(tags, false); got != "v1.0.0" {
		t.Errorf("Latest = %q, a customer machine must not jump onto a prerelease", got)
	}
	if got := Latest(tags, true); got != "v2.0.0-rc1" {
		t.Errorf("Latest(allowPre) = %q", got)
	}
}

func TestLooksRejectsNonVersionTags(t *testing.T) {
	for _, tag := range []string{"nightly", "latest", "release", ""} {
		if Looks(tag) {
			t.Errorf("Looks(%q) should be false", tag)
		}
	}
	for _, tag := range []string{"v1.0.0", "2.1", "0.0.1-beta"} {
		if !Looks(tag) {
			t.Errorf("Looks(%q) should be true", tag)
		}
	}
}
