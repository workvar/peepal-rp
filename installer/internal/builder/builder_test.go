package builder

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/peepal/installer/internal/appdef"
	"github.com/peepal/installer/internal/vcs"
	"github.com/peepal/installer/internal/workspace"
)

// TestCloneThenBuild is the shape of a real install: clone a repository, run
// the definition's build steps in it, and end up with an artefact.
func TestCloneThenBuild(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is not available")
	}
	origin := makeRepo(t)
	root := t.TempDir()
	layout := workspace.New(root)
	if err := layout.EnsureDirs(); err != nil {
		t.Fatal(err)
	}

	spec := appdef.Spec{
		Repos: []appdef.Repo{{Name: "app", URL: origin, Branch: "main", Dir: "app"}},
		Build: []appdef.Step{
			{Name: "generate", Repo: "app", Run: "cat version.txt > built.txt", TimeoutMinutes: 2},
			{Name: "windows only", Repo: "app", Run: "exit 1", OS: []string{"windows"}, TimeoutMinutes: 1},
		},
	}
	ctx := context.Background()
	if err := vcs.Clone(ctx, vcs.Auth{}, origin, "main", layout.RepoDir(spec.Repos[0]), nil); err != nil {
		t.Fatal(err)
	}

	var log strings.Builder
	err := Run(ctx, Options{Spec: spec, Layout: layout, Vars: appdef.Vars{},
		Log: func(f string, a ...any) { log.WriteString(f) }})
	if err != nil {
		t.Fatalf("build failed: %v\n%s", err, log.String())
	}

	out, err := os.ReadFile(filepath.Join(layout.RepoDir(spec.Repos[0]), "built.txt"))
	if err != nil {
		t.Fatalf("the build step produced nothing: %v", err)
	}
	if strings.TrimSpace(string(out)) != "1.0.0" {
		t.Errorf("built.txt = %q", out)
	}
}

func TestStepFailureIsReportedWithItsName(t *testing.T) {
	root := t.TempDir()
	layout := workspace.New(root)
	layout.EnsureDirs()
	dir := filepath.Join(layout.Src(), "app")
	os.MkdirAll(dir, 0o755)

	spec := appdef.Spec{
		Repos: []appdef.Repo{{Name: "app", Dir: "app"}},
		Build: []appdef.Step{{Name: "compile", Repo: "app", Run: "exit 3", TimeoutMinutes: 1}},
	}
	err := Run(context.Background(), Options{Spec: spec, Layout: layout,
		Vars: appdef.Vars{}, Log: func(string, ...any) {}})
	if err == nil || !strings.Contains(err.Error(), "compile") {
		t.Fatalf("error = %v, want it to name the failing step", err)
	}
}

// makeRepo builds a throwaway origin so the test never touches the network.
func makeRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	run := func(args ...string) {
		cmd := exec.Command("git", args...)
		cmd.Dir = dir
		cmd.Env = append(os.Environ(),
			"GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@example.com",
			"GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@example.com")
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	run("init", "-b", "main")
	if err := os.WriteFile(filepath.Join(dir, "version.txt"), []byte("1.0.0\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", ".")
	run("commit", "-m", "first")
	return dir
}
