// Package vcs is the thin layer of Git the panel needs: clone a branch,
// fast-forward it, check out a release tag, and report exactly what is
// checked out. Everything else about updates is decided elsewhere.
package vcs

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Logf streams command output to the panel.
type Logf func(string, ...any)

// Checkout is what the panel shows for one repository.
type Checkout struct {
	Dir     string `json:"dir"`
	URL     string `json:"url"`
	Branch  string `json:"branch"`
	Commit  string `json:"commit"`
	Short   string `json:"short"`
	Subject string `json:"subject"`
	Dirty   bool   `json:"dirty"`
	// Tag is the release this checkout is on, when it is exactly on one.
	Tag string `json:"tag"`
	// Version is what the panel displays: the tag if there is one, otherwise
	// `git describe` output, otherwise the short commit.
	Version string `json:"version"`
	// Date is when the checked-out commit was authored.
	Date string `json:"date"`
}

// Clone creates dir from url at branch. An existing checkout of the same
// remote is reused rather than re-downloaded, so re-running setup is cheap.
//
// The clone is shallow but fetches tags, because a release-tracking install
// decides what to run from the tag list.
func Clone(ctx context.Context, a Auth, url, branch, dir string, log Logf) error {
	if IsRepo(dir) {
		log("Reusing existing checkout at %s", dir)
		return Fetch(ctx, a, dir, branch, log)
	}
	if err := os.MkdirAll(filepath.Dir(dir), 0o755); err != nil {
		return err
	}
	return git(ctx, a, "", log,
		"clone", "--depth", "1", "--branch", branch, url, dir)
}

// Fetch fast-forwards an existing checkout to the tip of branch, discarding
// local modifications: this directory belongs to the panel, not to a
// developer, so a clean reset is safer than a merge conflict.
func Fetch(ctx context.Context, a Auth, dir, branch string, log Logf) error {
	if err := git(ctx, a, dir, log, "fetch", "--depth", "1", "--tags", "--force", "origin", branch); err != nil {
		return err
	}
	if err := git(ctx, a, dir, log, "checkout", "-B", branch, "origin/"+branch); err != nil {
		return err
	}
	return git(ctx, a, dir, log, "reset", "--hard", "origin/"+branch)
}

// CheckoutTag moves the working copy onto a release tag. The tag is fetched
// explicitly first, because a shallow clone may not have its commit.
func CheckoutTag(ctx context.Context, a Auth, dir, tag string, log Logf) error {
	if tag == "" {
		return fmt.Errorf("no tag given")
	}
	if err := git(ctx, a, dir, log, "fetch", "--depth", "1", "--force", "origin",
		"refs/tags/"+tag+":refs/tags/"+tag); err != nil {
		return err
	}
	return git(ctx, a, dir, log, "checkout", "--force", "refs/tags/"+tag)
}

// RemoteHead returns the commit the branch points at on the server, without
// touching the working copy.
func RemoteHead(ctx context.Context, a Auth, dir, branch string) (string, error) {
	out, err := output(ctx, a, dir, "ls-remote", "origin", "refs/heads/"+branch)
	if err != nil {
		return "", err
	}
	f := strings.Fields(out)
	if len(f) == 0 {
		return "", fmt.Errorf("branch %s not found on the remote", branch)
	}
	return f[0], nil
}

// RemoteTags lists the tag names on the server, newest-looking last. It is
// how a release-tracking install learns that a version was published without
// cloning anything.
func RemoteTags(ctx context.Context, a Auth, dir string) ([]string, error) {
	out, err := output(ctx, a, dir, "ls-remote", "--tags", "--refs", "origin")
	if err != nil {
		return nil, err
	}
	var tags []string
	for _, line := range strings.Split(out, "\n") {
		f := strings.Fields(line)
		if len(f) != 2 {
			continue
		}
		tags = append(tags, strings.TrimPrefix(f[1], "refs/tags/"))
	}
	return tags, nil
}

// Describe reads the current state of a checkout.
func Describe(ctx context.Context, dir string) (Checkout, error) {
	c := Checkout{Dir: dir}
	if !IsRepo(dir) {
		return c, fmt.Errorf("%s is not a git checkout", dir)
	}
	none := Auth{}
	c.URL, _ = output(ctx, none, dir, "remote", "get-url", "origin")
	c.Branch, _ = output(ctx, none, dir, "rev-parse", "--abbrev-ref", "HEAD")
	c.Commit, _ = output(ctx, none, dir, "rev-parse", "HEAD")
	c.Subject, _ = output(ctx, none, dir, "log", "-1", "--pretty=%s")
	c.Date, _ = output(ctx, none, dir, "log", "-1", "--date=short", "--pretty=%ad")
	status, _ := output(ctx, none, dir, "status", "--porcelain")
	c.Dirty = status != ""
	if len(c.Commit) >= 7 {
		c.Short = c.Commit[:7]
	}
	// --points-at is exact: it answers "is this commit a release", not "which
	// release came before it".
	c.Tag, _ = output(ctx, none, dir, "tag", "--points-at", "HEAD")
	c.Tag = firstLine(c.Tag)
	c.Version = c.Tag
	if c.Version == "" {
		if d, err := output(ctx, none, dir, "describe", "--tags", "--always"); err == nil {
			c.Version = d
		} else {
			c.Version = c.Short
		}
	}
	return c, nil
}

// Reset moves a checkout back to an exact commit or tag. It is how a failed
// update is undone: the object is still in the local repository, because it
// was what was running a minute ago.
func Reset(ctx context.Context, dir, ref string, log Logf) error {
	if ref == "" {
		return fmt.Errorf("no commit to reset to")
	}
	return git(ctx, Auth{}, dir, log, "reset", "--hard", ref)
}

// IsRepo reports whether dir already holds a checkout.
func IsRepo(dir string) bool {
	st, err := os.Stat(filepath.Join(dir, ".git"))
	return err == nil && (st.IsDir() || st.Mode().IsRegular())
}

func git(ctx context.Context, a Auth, dir string, log Logf, args ...string) error {
	full := append(a.Args(), args...)
	cmd := exec.CommandContext(ctx, "git", full...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(),
		"GIT_TERMINAL_PROMPT=0", // never block waiting for credentials
		"GIT_ASKPASS=echo",
	)
	out, err := cmd.CombinedOutput()
	if s := strings.TrimSpace(a.Redact(string(out))); s != "" && log != nil {
		log("%s", s)
	}
	if err != nil {
		return fmt.Errorf("git %s: %w", a.Redact(strings.Join(args, " ")), err)
	}
	return nil
}

func output(ctx context.Context, a Auth, dir string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", append(a.Args(), args...)...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0", "GIT_ASKPASS=echo")
	b, err := cmd.Output()
	return strings.TrimSpace(string(b)), err
}

func firstLine(s string) string {
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		return strings.TrimSpace(s[:i])
	}
	return strings.TrimSpace(s)
}
