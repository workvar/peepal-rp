package vcs

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// TestClonesAndFollowsReleases walks the path a customer machine takes: clone
// main, discover the tags, check out the newest release, and report the
// version the panel puts on screen.
func TestClonesAndFollowsReleases(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is not available")
	}
	origin := makeRepo(t)
	dir := filepath.Join(t.TempDir(), "checkout")
	ctx := context.Background()
	none := Auth{}

	if err := Clone(ctx, none, origin, "main", dir, nil); err != nil {
		t.Fatal(err)
	}

	tags, err := RemoteTags(ctx, none, dir)
	if err != nil {
		t.Fatal(err)
	}
	if !has(tags, "v1.0.0") || !has(tags, "v1.1.0") {
		t.Fatalf("RemoteTags = %v", tags)
	}

	if err := CheckoutTag(ctx, none, dir, "v1.0.0", nil); err != nil {
		t.Fatal(err)
	}
	ck, err := Describe(ctx, dir)
	if err != nil {
		t.Fatal(err)
	}
	if ck.Tag != "v1.0.0" {
		t.Errorf("Tag = %q, want v1.0.0", ck.Tag)
	}
	if ck.Version != "v1.0.0" {
		t.Errorf("Version = %q; this is the string the panel shows", ck.Version)
	}

	// And moving forward a release works from that state.
	if err := CheckoutTag(ctx, none, dir, "v1.1.0", nil); err != nil {
		t.Fatal(err)
	}
	if ck, _ := Describe(ctx, dir); ck.Tag != "v1.1.0" {
		t.Errorf("after upgrade Tag = %q, want v1.1.0", ck.Tag)
	}
}

func TestDescribeFallsBackToTheCommit(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is not available")
	}
	origin := makeUntaggedRepo(t)
	dir := filepath.Join(t.TempDir(), "checkout")
	if err := Clone(context.Background(), Auth{}, origin, "main", dir, nil); err != nil {
		t.Fatal(err)
	}
	ck, err := Describe(context.Background(), dir)
	if err != nil {
		t.Fatal(err)
	}
	if ck.Tag != "" {
		t.Errorf("Tag = %q, want empty on an untagged repository", ck.Tag)
	}
	if ck.Version == "" || len(ck.Version) > 12 {
		t.Errorf("Version = %q, want the short commit", ck.Version)
	}
}

func TestAuthHeaderCarriesTheToken(t *testing.T) {
	args := Auth{Token: "github_pat_abc"}.Args()
	if len(args) != 2 || args[0] != "-c" {
		t.Fatalf("Args = %v", args)
	}
	// The token must be in a header, never in a URL that git would persist.
	if !strings.HasPrefix(args[1], "http.extraheader=Authorization: Basic ") {
		t.Errorf("Args[1] = %q", args[1])
	}
	if strings.Contains(args[1], "github_pat_abc") {
		t.Error("the raw token should be base64-encoded, not inline")
	}
	if (Auth{}).Args() != nil {
		t.Error("no token means no flags")
	}
}

func TestRedactHidesTheToken(t *testing.T) {
	a := Auth{Token: "secret-token"}
	if got := a.Redact("fatal: secret-token rejected"); strings.Contains(got, "secret-token") {
		t.Errorf("Redact left the token in %q", got)
	}
}

func TestNeedsTokenOnlyForHTTPS(t *testing.T) {
	if !NeedsToken("https://github.com/workvar/peepal-rp.git") {
		t.Error("an https remote takes a token")
	}
	if NeedsToken("git@github.com:workvar/peepal-rp.git") {
		t.Error("an ssh remote authenticates with a deploy key, not a header")
	}
}

func TestOwnerRepoParsesBothURLForms(t *testing.T) {
	for _, url := range []string{
		"https://github.com/workvar/peepal-rp.git",
		"https://github.com/workvar/peepal-rp",
		"git@github.com:workvar/peepal-rp.git",
	} {
		owner, repo := OwnerRepo(url)
		if owner != "workvar" || repo != "peepal-rp" {
			t.Errorf("OwnerRepo(%q) = %q, %q", url, owner, repo)
		}
	}
	if owner, _ := OwnerRepo("https://gitlab.com/a/b.git"); owner != "" {
		t.Error("a non-GitHub URL should not be parsed as one")
	}
}

func has(list []string, want string) bool {
	for _, v := range list {
		if v == want {
			return true
		}
	}
	return false
}

// makeRepo builds a throwaway origin with two releases on main.
func makeRepo(t *testing.T) string {
	t.Helper()
	dir := makeUntaggedRepo(t)
	rungit(t, dir, "tag", "v1.0.0")
	write(t, dir, "version.txt", "1.1.0\n")
	rungit(t, dir, "add", ".")
	rungit(t, dir, "commit", "-m", "second")
	rungit(t, dir, "tag", "v1.1.0")
	return dir
}

func makeUntaggedRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	rungit(t, dir, "init", "-b", "main")
	write(t, dir, "version.txt", "1.0.0\n")
	rungit(t, dir, "add", ".")
	rungit(t, dir, "commit", "-m", "first")
	return dir
}

func rungit(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(),
		"GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@example.com",
		"GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@example.com")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, out)
	}
}

func write(t *testing.T, dir, name, body string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}
