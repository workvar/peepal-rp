package control

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/appstate"
	"github.com/peepal/installer/internal/vcs"
	"github.com/peepal/installer/internal/workspace"
)

// TestOnlyATagCountsAsAnUpdate is the behaviour a customer machine depends
// on: a commit pushed to main is invisible until it is tagged, and then the
// exact tag is what shows up as available.
func TestOnlyATagCountsAsAnUpdate(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is not available")
	}
	origin, layout, c := installed(t)
	ctx := context.Background()

	// Nothing new yet.
	if pending, err := c.CheckUpdates(ctx); err != nil || len(pending) != 0 {
		t.Fatalf("CheckUpdates = %v, %v; want none", pending, err)
	}

	// A commit on main, untagged: still nothing, because this install
	// follows releases.
	commit(t, origin, "work in progress")
	if pending, _ := c.CheckUpdates(ctx); len(pending) != 0 {
		t.Fatalf("an untagged commit must not reach a customer, got %v", pending)
	}

	// Tag it: now there is a release.
	tag(t, origin, "v1.1.0")
	pending, err := c.CheckUpdates(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 1 {
		t.Fatalf("CheckUpdates = %v, want one entry", pending)
	}
	if pending[0].Latest != "v1.1.0" || pending[0].Current != "v1.0.0" {
		t.Errorf("pending = %+v, want v1.0.0 → v1.1.0", pending[0])
	}
	if pending[0].Kind != "release" {
		t.Errorf("kind = %q, want release", pending[0].Kind)
	}
	_ = layout
}

// TestBranchTrackingSeesEveryCommit is the staging-box behaviour.
func TestBranchTrackingSeesEveryCommit(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is not available")
	}
	origin, _, c := installed(t)
	c.Spec.Updates.Track = "branch"
	ctx := context.Background()

	if pending, _ := c.CheckUpdates(ctx); len(pending) != 0 {
		t.Fatalf("want none, got %v", pending)
	}
	commit(t, origin, "a change")
	pending, err := c.CheckUpdates(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 1 || pending[0].Kind != "commit" {
		t.Fatalf("pending = %+v, want one commit entry", pending)
	}
}

// TestReleaseIsReportedForTheUI proves the string the dashboard shows comes
// from what is actually checked out.
func TestReleaseIsReportedForTheUI(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is not available")
	}
	_, _, c := installed(t)
	if got := c.Release(); got != "v1.0.0" {
		t.Errorf("Release() = %q, want v1.0.0", got)
	}
}

// installed builds an origin at v1.0.0, clones it, checks the tag out and
// records the state, which is where a finished install leaves things.
func installed(t *testing.T) (origin string, layout workspace.Layout, c *Controller) {
	t.Helper()
	origin = t.TempDir()
	rungit(t, origin, "init", "-b", "main")
	writeFile(t, origin, "version.txt", "1.0.0\n")
	rungit(t, origin, "add", ".")
	rungit(t, origin, "commit", "-m", "first")
	rungit(t, origin, "tag", "v1.0.0")

	layout = workspace.New(t.TempDir())
	if err := layout.EnsureDirs(); err != nil {
		t.Fatal(err)
	}
	spec := appdef.Spec{
		App:     appdef.App{Name: "demo", DisplayName: "Demo"},
		Repos:   []appdef.Repo{{Name: "app", URL: origin, Branch: "main", Dir: "app", Primary: true}},
		Updates: appdef.Updates{Enabled: true, Track: "release", CheckEveryMinutes: 60},
	}
	dir := layout.RepoDir(spec.Repos[0])
	ctx := context.Background()
	if err := vcs.Clone(ctx, vcs.Auth{}, origin, "main", dir, nil); err != nil {
		t.Fatal(err)
	}
	if err := vcs.CheckoutTag(ctx, vcs.Auth{}, dir, "v1.0.0", nil); err != nil {
		t.Fatal(err)
	}
	st := appstate.Load(layout.StateFile())
	st.Setup = true
	st.Releases["app"] = "v1.0.0"
	if ck, err := vcs.Describe(ctx, dir); err == nil {
		st.Commits["app"] = ck.Commit
	}
	if err := appstate.Save(layout.StateFile(), st); err != nil {
		t.Fatal(err)
	}
	return origin, layout, New(Options{Spec: spec, Layout: layout, Version: "test"})
}

func commit(t *testing.T, dir, message string) {
	t.Helper()
	writeFile(t, dir, "change.txt", message+"\n")
	rungit(t, dir, "add", ".")
	rungit(t, dir, "commit", "-m", message)
}

func tag(t *testing.T, dir, name string) {
	t.Helper()
	rungit(t, dir, "tag", name)
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

func writeFile(t *testing.T, dir, name, body string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}
